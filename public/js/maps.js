window.TrackerMap = class TrackerMap {
  constructor(id) {
    this.markers=new Map();this.fitted=false;this.selected=null;this.stopId=null;this.routeSignature='';
    this.empty=document.querySelector('[data-map-empty]');this.health=document.querySelector('[data-map-health]');this.fitButton=document.querySelector('[data-map-fit]');
    this.fitButton?.addEventListener('click',()=>this.fit());
    if(!window.L){this.problem('The map could not load. Bus details and trip controls are still available.');return;}
    let config={center:[20,0],zoom:3};try{config=JSON.parse(document.querySelector('meta[name=map-config]').content);}catch{}
    this.initialView=config;this.map=L.map(id,{scrollWheelZoom:false}).setView(config.center,config.zoom);
    this.routeLayer=L.layerGroup().addTo(this.map);
    this.tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'});
    this.tiles.on('tileerror',()=>this.problem('Map tiles are unavailable. Check your internet connection; live journey details still work.'));
    this.tiles.on('tileload',()=>{if(this.health)this.health.hidden=true;});
    this.tiles.addTo(this.map);if(this.empty)this.empty.hidden=true;if(this.fitButton)this.fitButton.disabled=false;
  }
  problem(message){if(this.health){this.health.hidden=false;this.health.textContent=message;}}
  availability(){
    const route=this.selected?.route;
    const available=this.markers.size>0||Boolean(route?.stops.length||route?.path?.length);
    if(this.empty)this.empty.hidden=true;
    if(this.fitButton)this.fitButton.disabled=!this.map;
    if(available&&this.map&&!this.map.hasLayer(this.tiles))this.tiles.addTo(this.map);
  }
  update(buses,select){
    if(!this.map)return;
    const visible=new Set();
    for(const bus of buses){
      if(!bus.location)continue;
      visible.add(bus.id);const point=[bus.location.lat,bus.location.lng];let marker=this.markers.get(bus.id);
      if(!marker){
        marker=L.circleMarker(point,{radius:9,color:'#5e501f',weight:2,fillColor:'#d6b76e',fillOpacity:1}).addTo(this.map);
        const label=document.createElement('span');label.textContent=`${bus.id} — ${bus.name}`;marker.bindTooltip(label);
        marker.on('click',()=>select?.(bus.id));this.markers.set(bus.id,marker);
      }else marker.setLatLng(point);
    }
    for(const[id,marker]of this.markers)if(!visible.has(id)){marker.remove();this.markers.delete(id);}
    this.availability();
    if(!this.fitted&&visible.size){this.fit();this.fitted=true;}
  }
  route(bus,fit=false,stopId=null){
    this.selected=bus||null;this.stopId=stopId;
    this.availability();
    if(!this.map)return;
    const signature=JSON.stringify([bus?.id,bus?.route,stopId]);
    if(signature!==this.routeSignature){
      this.routeSignature=signature;this.routeLayer.clearLayers();
      if(bus){
        const route=bus.route,points=route.path?.length?route.path:route.stops;
        if(points.length>1)L.polyline(points.map(p=>[p.lat,p.lng]),{color:'#b2934c',weight:3,dashArray:route.path?.length?null:'6 8'}).addTo(this.routeLayer);
        for(const stop of route.stops){const label=document.createElement('span');label.textContent=stop.name;L.circleMarker([stop.lat,stop.lng],{radius:stop.id===stopId?8:4,color:'#9d803b',fillColor:'#f4dfab',fillOpacity:1,weight:2}).bindTooltip(label).addTo(this.routeLayer);}
      }
    }
    if(fit)this.fit();
  }
  fit(){
    if(!this.map)return;
    const bus=this.selected,points=[];
    if(bus){const route=bus.route;points.push(...(route.path?.length?route.path:route.stops).map(p=>[p.lat,p.lng]));if(bus.location)points.push([bus.location.lat,bus.location.lng]);}
    if(!points.length)points.push(...[...this.markers.values()].map(marker=>marker.getLatLng()));
    if(points.length)this.map.fitBounds(points,{padding:[32,32],maxZoom:16,animate:!matchMedia('(prefers-reduced-motion:reduce)').matches});else this.map.setView(this.initialView.center,this.initialView.zoom);
  }
};
