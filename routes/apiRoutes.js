const express = require('express');
const Journey = require('../public/js/journey');
module.exports = function createApi(fleet) {
  const router = express.Router();
  const clients = new Set(), attempts = new Map();
  const snapshot = () => ({ buses:fleet.snapshot(), serverTime:Date.now() });
  const publish = () => {
    const message = `data: ${JSON.stringify(snapshot())}\n\n`;
    for (const client of clients) if (!client.write(message)) client.destroy();
  };
  const timer = setInterval(() => { publish(); for (const [key,entry] of attempts) if (Date.now()>entry.until) attempts.delete(key); },10000);
  timer.unref();
  router.use((req,res,next) => {
    res.set('Cache-Control','no-store');
    if (req.method !== 'GET' && req.headers.origin) {
      try { if (new URL(req.headers.origin).host !== req.get('host')) return res.status(403).json({error:'Cross-origin requests are not allowed.'}); }
      catch { return res.status(400).json({error:'Invalid request origin.'}); }
    }
    next();
  });
  router.get('/buses',(req,res) => res.json(snapshot()));
  router.get('/buses/:id/arrival',(req,res) => {
    const bus = fleet.snapshot().find(bus => bus.id===req.params.id);
    if (!bus) return res.status(404).json({error:'Bus not found.'});
    const stop = bus.route.stops.find(stop => stop.id===req.query.stopId);
    if (!stop) return res.status(404).json({error:'Pickup stop not found.'});
    res.json({busId:bus.id,stopId:stop.id,...Journey.estimate(bus,stop),serverTime:Date.now()});
  });
  router.get('/events',(req,res) => {
    if (clients.size>=200) return res.status(503).json({error:'Live connections are busy. Retry shortly.'});
    res.set({'Content-Type':'text/event-stream',Connection:'keep-alive','X-Accel-Buffering':'no'});
    res.flushHeaders(); res.write(`retry: 5000\ndata: ${JSON.stringify(snapshot())}\n\n`);
    clients.add(res); res.on('close',()=>clients.delete(res));
  });
  router.use('/driver',(req,res,next) => {
    const entry = attempts.get(req.ip);
    if (entry && entry.count>=20 && Date.now()<entry.until) { res.set('Retry-After','60'); return res.status(429).json({error:'Too many incorrect keys. Wait one minute.'}); }
    try { req.bus=fleet.authenticate(req.body?.busId,req.headers.authorization?.replace(/^Bearer /,'')); next(); }
    catch(error) { const current=entry&&entry.until>Date.now()?entry:{count:0,until:Date.now()+60000}; current.count++;attempts.set(req.ip,current);next(error); }
  });
  router.post('/driver/connect',(req,res)=>res.json({bus:{id:req.bus.id,name:req.bus.name,route:req.bus.route},serverTime:Date.now()}));
  router.post('/driver/:action',(req,res)=> {const result=fleet.action(req.bus,req.params.action,req.body);publish();res.json({...result,serverTime:Date.now()});});
  router.use((req,res)=>res.status(404).json({error:'API endpoint not found.'}));
  router.use((error,req,res,next)=> {
    if (!error.status || error.status>=500) console.error(error);
    res.status(error.status||500).json({error:error.status&&error.status<500?error.message:'The server could not complete the request.',code:error.code||'SERVER_ERROR'});
  });
  router.close=()=>{clearInterval(timer);for(const client of clients)client.end();};
  return router;
};
