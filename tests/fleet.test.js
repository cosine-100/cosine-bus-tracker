const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Fleet } = require('../lib/fleet');
function setup(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cosine-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const filename = path.join(dir, 'fleet.json');
  const fleet = new Fleet(filename);
  const key = fleet.register({ id: 'TEST-1', name: 'Test bus', route: { name: 'Test route', stops: [{ id: 'a', name: 'Test stop', lat: 10, lng: 20 }] } });
  return { fleet, key, filename, bus: fleet.authenticate('TEST-1', key) };
}
test('registration persists without storing raw driver keys or leaking credentials', t => {
  const {fleet, key, filename} = setup(t);
  assert.equal(fs.readFileSync(filename, 'utf8').includes(key), false);
  assert.equal(JSON.stringify(fleet.snapshot()).includes('tokenHash'), false);
  assert.equal(new Fleet(filename).authenticate('TEST-1', key).id, 'TEST-1');
  assert.throws(() => fleet.authenticate('TEST-1', 'wrong'), { status: 401 });
  assert.throws(() => fleet.register({ id: 'invalid' }));
});
test('trip lifecycle hides stale positions, rejects late GPS and stops sharing', t => {
  const {fleet, bus} = setup(t);
  const now = Date.now();
  const {tripId} = fleet.action(bus, 'start', {}, now);
  assert.throws(() => fleet.action(bus, 'start', {}, now+1), { status: 409 });
  const location = {lat: 10, lng: 20, accuracy: 8, speed: 5, timestamp: now};
  fleet.action(bus, 'location', {tripId, sequence: 1, location}, now);
  assert.equal(fleet.snapshot(now)[0].status, 'live');
  assert.equal(fleet.snapshot(now+45001)[0].location, null);
  assert.equal(fleet.snapshot(now+45001)[0].status, 'delayed');
  assert.throws(() => fleet.action(bus, 'location', {tripId, sequence: 2, location: {...location, lat: 100}}, now), {status: 400});
  fleet.action(bus, 'pause', {tripId, sequence: 3}, now);
  assert.equal(fleet.snapshot(now)[0].location, null);
  assert.throws(() => fleet.action(bus, 'location', {tripId, sequence: 2, location: {...location, timestamp: now+1}}, now+1), {status: 409});
  fleet.action(bus, 'end', {tripId, sequence: 4}, now);
  assert.equal(fleet.snapshot(now)[0].status, 'idle');
  assert.throws(() => fleet.action(bus, 'location', {tripId, sequence: 5, location}, now), {status: 409});
});
test('disconnected trip may be replaced and server restart clears all live positions', t => {
  const {fleet, bus, filename} = setup(t);
  const first = fleet.action(bus, 'start', {}, 1000);
  const second = fleet.action(bus, 'start', {}, 122000);
  assert.notEqual(first.tripId, second.tripId);
  assert.throws(() => fleet.action(bus, 'pause', {...first, sequence: 1}, 122001), {status: 409});
  assert.equal(new Fleet(filename).snapshot()[0].tripId, null);
});
test('HTTP pages, authorization, JSON validation and live stream', async t => {
  const {fleet, key, filename} = setup(t);
  process.env.DATA_FILE = filename;
  const app = require('../server');
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => { app.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); delete process.env.DATA_FILE; });
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const route of ['/', '/student', '/driver', '/signin', '/signup', '/profile', '/settings', '/help', '/health', '/js/driver.js', '/css/style.css', '/vendor/leaflet/leaflet.js', '/vendor/leaflet/leaflet.css', '/css/fonts.css', '/vendor/fonts/jost/files/jost-latin-400-normal.woff2']) {
    const response = await fetch(base+route); assert.equal(response.status, 200, route); assert.ok((await response.text()).length);
  }
  assert.match(await (await fetch(base+'/signin')).text(), /Demo access: use test details/);
  assert.match(await (await fetch(base+'/')).text(), /Less waiting/);
  assert.match(await (await fetch(base+'/student')).text(), /data-student/);
  assert.equal((await fetch(base+'/student')).headers.get('referrer-policy'),'strict-origin-when-cross-origin');
  const settingsHtml=await (await fetch(base+'/settings')).text();assert.match(settingsHtml,/data-settings-page/);assert.match(settingsHtml,/Nigeria/);
  const profileHtml=await (await fetch(base+'/profile')).text();assert.match(profileHtml,/data-profile-form/);
  const mapConfig=require('../config/env').map;assert.deepEqual(mapConfig.center,[9.082,8.6753]);assert.equal(mapConfig.zoom,6);
  const post = (action, body, token = key) => fetch(`${base}/api/driver/${action}`, {method: 'POST', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`}, body: JSON.stringify({busId: 'TEST-1', ...body})});
  assert.equal((await post('start', {}, 'wrong')).status, 401);
  const started = await (await post('start', {})).json();
  assert.ok(started.tripId);
  const response = await fetch(base+'/api/events');
  assert.equal(response.headers.get('content-type').includes('text/event-stream'), true);
  const reader = response.body.getReader();
  const chunk = await reader.read(); assert.match(new TextDecoder().decode(chunk.value), /TEST-1/);
  await reader.cancel();
  assert.equal((await post('location', {...started, sequence: 1, location: {lat: 10, lng: 20, accuracy: 10, timestamp: Date.now(), speed: 4}})).status, 200);
  const snapshot = await (await fetch(base+'/api/buses')).json(); assert.equal(snapshot.buses[0].status, 'live'); assert.equal(snapshot.buses[0].tokenHash, undefined);
  const arrival = await (await fetch(base+'/api/buses/TEST-1/arrival?stopId=a')).json(); assert.equal(arrival.available,true); assert.equal(arrival.seconds,0);
  assert.equal((await fetch(base+'/api/buses/missing/arrival?stopId=a')).status,404);
  assert.equal((await fetch(base+'/api/buses/TEST-1/arrival?stopId=missing')).status,404);
  const badOrigin = await fetch(base+'/api/driver/connect',{method:'POST',headers:{Origin:'not-an-origin','Content-Type':'application/json'},body:'{}'}); assert.equal(badOrigin.status,400);
  assert.equal((await post('pause', {...started, sequence: 2})).status, 200);
  assert.equal((await (await fetch(base+'/api/buses')).json()).buses[0].location, null);
  assert.equal((await post('end', {...started, sequence: 3})).status, 200);
  const malformed = await fetch(base+'/api/driver/start', {method:'POST', headers:{'Content-Type':'application/json'},body:'{'});
  assert.equal(malformed.status, 400);
});

test('retried start, GPS and end requests are safe and do not refresh old positions', t => {
  const {fleet,bus}=setup(t);const now=Date.now();
  const start=fleet.action(bus,'start',{requestId:'one-attempt'},now);
  assert.equal(fleet.action(bus,'start',{requestId:'one-attempt'},now+1).tripId,start.tripId);
  const location={lat:10,lng:20,accuracy:10,speed:4,timestamp:now};
  fleet.action(bus,'location',{...start,sequence:1,location},now);
  const retry=fleet.action(bus,'location',{...start,sequence:2,location},now+10000);
  assert.equal(retry.updatedAt,now);
  assert.equal(fleet.snapshot(now+45001)[0].location,null);
  fleet.action(bus,'end',{...start,sequence:3},now+10001);
  assert.equal(fleet.action(bus,'end',{...start,sequence:4},now+10002).tripId,null);
  const next=fleet.action(bus,'start',{requestId:'next'},now+10003);
  assert.throws(()=>fleet.action(bus,'end',{...start,sequence:5},now+10004),{code:'TRIP_ENDED'});
  assert.equal(fleet.snapshot(now+10005)[0].tripId,next.tripId);
});
