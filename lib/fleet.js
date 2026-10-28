const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const FRESH_MS = 45000;
function fail(message, status = 400, code = 'INVALID_REQUEST') { throw Object.assign(new Error(message), { status, code }); }
function hash(token) { return crypto.createHash('sha256').update(token).digest('hex'); }
function point(p) { return p && Number.isFinite(p.lat) && Math.abs(p.lat) <= 90 && Number.isFinite(p.lng) && Math.abs(p.lng) <= 180; }
function validateBus(bus) {
  if (!bus || typeof bus.id !== 'string' || !/^[A-Za-z0-9_-]{1,40}$/.test(bus.id) || typeof bus.name !== 'string' || !bus.name.trim() || bus.name.length > 100) fail('Provide a valid bus ID and name.');
  if (!bus.route || typeof bus.route.name !== 'string' || !bus.route.name.trim() || !Array.isArray(bus.route.stops) || bus.route.stops.length > 100) fail('Provide a route name and up to 100 stops.');
  const ids = new Set();
  for (const stop of bus.route.stops) {
    if (!stop || typeof stop.id !== 'string' || !/^[A-Za-z0-9_-]{1,40}$/.test(stop.id) || ids.has(stop.id) || typeof stop.name !== 'string' || !stop.name.trim() || stop.name.length > 100 || !point(stop)) fail('Each stop needs a unique ID, name and valid coordinates.');
    ids.add(stop.id);
  }
  if (bus.route.path && (!Array.isArray(bus.route.path) || bus.route.path.length > 10000 || !bus.route.path.every(point))) fail('Route path must contain valid latitude/longitude points.');
}
class Fleet {
  constructor(filename) {
    this.filename = filename;
    this.buses = fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename, 'utf8')).buses : [];
    if (!Array.isArray(this.buses)) throw new Error('Invalid fleet data file.');
    this.live = new Map();
    this.ended = new Map();
  }
  save() {
    fs.mkdirSync(path.dirname(this.filename), { recursive: true });
    fs.writeFileSync(`${this.filename}.tmp`, JSON.stringify({ buses: this.buses }, null, 2), { mode: 0o600 });
    fs.renameSync(`${this.filename}.tmp`, this.filename);
  }
  register(bus) {
    validateBus(bus);
    const token = crypto.randomBytes(32).toString('hex');
    const record = { id: bus.id, name: bus.name.trim(), route: bus.route, tokenHash: hash(token) };
    const index = this.buses.findIndex(item => item.id === bus.id);
    if (index < 0) this.buses.push(record); else this.buses[index] = record;
    this.save();
    this.live.delete(bus.id);
    return token;
  }
  authenticate(id, token) {
    const bus = this.buses.find(item => item.id === id);
    if (!bus || typeof token !== 'string' || token.length > 200 || !crypto.timingSafeEqual(Buffer.from(bus.tokenHash, 'hex'), Buffer.from(hash(token), 'hex'))) fail('Bus ID or driver key is incorrect.', 401);
    return bus;
  }
  snapshot(now = Date.now()) {
    return this.buses.map(bus => {
      const live = this.live.get(bus.id);
      const fresh = Boolean(live?.sharing && live.location && now - live.receivedAt < FRESH_MS);
      return { id: bus.id, name: bus.name, route: bus.route, tripId: live?.tripId || null,
        status: !live ? 'idle' : fresh ? 'live' : live.sharing ? 'delayed' : 'paused',
        location: fresh ? live.location : null, updatedAt: live?.receivedAt || null };
    });
  }
  action(bus, action, payload = {}, now = Date.now()) {
    let live = this.live.get(bus.id);
    if (!['start','end','pause','location','heartbeat'].includes(action)) fail('Unknown trip action.',404);
    if (action === 'start') {
      if (live && payload.requestId && live.requestId === payload.requestId) return {tripId:live.tripId,updatedAt:live.receivedAt};
      if (live && now - live.lastActionAt < 120000) fail('This bus already has an active trip. Use its original driver page or wait two minutes after it disconnects.', 409, 'ACTIVE_TRIP');
      live = { tripId: crypto.randomUUID(), sharing: false, location: null, receivedAt: null, lastActionAt: now, requestId: typeof payload.requestId === 'string' ? payload.requestId.slice(0,80) : null, sequence: 0 };
      this.live.set(bus.id, live);
      this.ended.delete(bus.id);
    } else {
      if (!live && action === 'end' && this.ended.get(bus.id) === payload.tripId) return {tripId:null};
      if (!live || payload.tripId !== live.tripId) fail('This trip is no longer active. Start a new trip.', 409, 'TRIP_ENDED');
      if (!Number.isSafeInteger(payload.sequence) || payload.sequence <= live.sequence) fail('An older request was ignored.', 409, 'STALE_REQUEST');
      if (action === 'end') { this.live.delete(bus.id); this.ended.set(bus.id,live.tripId); return { tripId: null }; }
      if (action === 'pause') { live.sharing = false; live.location = null; }
      else if (action === 'location') {
        const location = payload.location;
        if (!point(location) || !Number.isFinite(location.accuracy) || location.accuracy < 0 || location.accuracy > 100000 || !Number.isFinite(location.timestamp) || Math.abs(now - location.timestamp) > 30000) fail('Location must be a recent GPS fix with valid accuracy.');
        if (live.location && location.timestamp === live.location.timestamp && location.lat === live.location.lat && location.lng === live.location.lng) { live.sequence = payload.sequence; live.lastActionAt = now; return {tripId:live.tripId,updatedAt:live.receivedAt}; }
        if (live.location && location.timestamp <= live.location.timestamp) fail('An older GPS fix was ignored.', 409, 'STALE_LOCATION');
        live.location = { lat: location.lat, lng: location.lng, accuracy: location.accuracy, timestamp: location.timestamp,
          speed: Number.isFinite(location.speed) && location.speed >= 0 && location.speed <= 60 ? location.speed : null };
        live.receivedAt = now;
        live.sharing = true;
      } else if (action !== 'heartbeat') fail('Unknown trip action.', 404);
      live.sequence = payload.sequence; live.lastActionAt = now;
    }
    return { tripId: live.tripId, updatedAt: live.receivedAt };
  }
}
module.exports = { Fleet, FRESH_MS, validateBus };
