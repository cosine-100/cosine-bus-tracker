(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Journey = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const radians = Math.PI / 180;
  const longitudeDelta = value => ((value + 540) % 360) - 180;
  function distance(a, b) {
    const h = Math.sin((b.lat-a.lat)*radians/2)**2 + Math.cos(a.lat*radians)*Math.cos(b.lat*radians)*Math.sin(longitudeDelta(b.lng-a.lng)*radians/2)**2;
    return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
  }
  // Project onto road segments, rather than snapping to the nearest recorded vertex.
  function project(point, path) {
    let best = { offset: Infinity, along: 0 }, traveled = 0;
    for (let index = 0; index < path.length-1; index++) {
      const a = path[index], b = path[index+1];
      const cosine = Math.cos((a.lat+b.lat)*radians/2);
      const x = longitudeDelta(b.lng-a.lng)*cosine, y = b.lat-a.lat;
      const px = longitudeDelta(point.lng-a.lng)*cosine, py = point.lat-a.lat;
      const t = x*x+y*y ? Math.max(0, Math.min(1, (px*x+py*y)/(x*x+y*y))) : 0;
      const projected = { lat:a.lat+t*(b.lat-a.lat), lng:longitudeDelta(a.lng+t*longitudeDelta(b.lng-a.lng)) };
      const length = distance(a,b), offset = distance(point,projected);
      if (offset < best.offset) best = { offset, along:traveled+t*length };
      traveled += length;
    }
    return best;
  }
  function nextStop(bus) {
    const path = bus.route.path;
    if (!bus.location || !path || path.length < 2) return null;
    const from = project(bus.location, path);
    if (from.offset > 250) return null;
    return bus.route.stops.find(stop => { const to = project(stop,path); return to.offset <= 250 && to.along >= from.along-30; }) || null;
  }
  function estimate(bus, stop) {
    if (!bus.location || !stop) return { available:false, reason:!stop?'Choose a pickup stop':'Waiting for live GPS', seconds:null };
    const direct = distance(bus.location,stop), path = bus.route.path;
    const result = { available:true, meters:direct, approximate:true, seconds:null, reason:'Waiting for reliable movement', near:direct<=Math.max(30,bus.location.accuracy) };
    if (path?.length > 1) {
      const from = project(bus.location,path), to = project(stop,path);
      if (from.offset > 250 || to.offset > 250) return {...result,reason:'Bus or stop is outside the configured route'};
      if (to.along < from.along-30) return {...result,near:false,reason:'This stop is behind the bus on this route'};
      result.meters = Math.max(0,to.along-from.along) + from.offset + to.offset;
      result.approximate = false;
    }
    if (bus.location.accuracy > 100) { result.near = false; return {...result,reason:'GPS accuracy is too low for an arrival estimate'}; }
    if (result.near) return {...result,seconds:0,reason:'Near your stop'};
    if (!Number.isFinite(bus.location.speed) || bus.location.speed < 1) return result;
    result.seconds = Math.ceil(result.meters/bus.location.speed);
    result.reason = result.approximate ? 'Rough straight-line estimate' : 'Estimated from current speed';
    return result;
  }
  return { distance, project, nextStop, estimate };
});
