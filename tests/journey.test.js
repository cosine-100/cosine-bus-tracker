const {test}=require('node:test');
const assert=require('node:assert/strict');
const Journey=require('../public/js/journey');
const route={name:'Test road',path:[{lat:0,lng:0},{lat:0,lng:.02}],stops:[{id:'a',name:'Ahead',lat:0,lng:.015}]};
const bus={route,location:{lat:0,lng:.01,accuracy:10,speed:5}};
test('route distance projects onto sparse road segments without snapping to endpoints',()=>{
  const result=Journey.estimate(bus,route.stops[0]);
  assert.equal(result.approximate,false);assert.ok(result.meters>550&&result.meters<565);assert.ok(result.seconds>100&&result.seconds<120);
  assert.equal(Journey.nextStop(bus).id,'a');
});
test('arrival estimates are withheld for passed stops, poor GPS, missing speed and off-route locations',()=>{
  assert.equal(Journey.estimate(bus,{lat:0,lng:.005}).seconds,null);
  assert.match(Journey.estimate(bus,{lat:0,lng:.005}).reason,/behind/);
  assert.equal(Journey.estimate({...bus,location:{...bus.location,accuracy:500}},route.stops[0]).seconds,null);
  assert.equal(Journey.estimate({...bus,location:{...bus.location,speed:null}},route.stops[0]).seconds,null);
  assert.equal(Journey.estimate({...bus,location:{...bus.location,lat:1}},route.stops[0]).seconds,null);
  assert.equal(Journey.estimate({...bus,location:null},route.stops[0]).available,false);
});
test('routes without road geometry disclose straight-line estimates',()=>{
  const result=Journey.estimate({...bus,route:{...route,path:undefined}},route.stops[0]);assert.equal(result.approximate,true);assert.ok(result.seconds>0);
});
