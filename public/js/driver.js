(() => {
  const root=document.querySelector('[data-driver]');if(!root)return;
  const form=document.querySelector('[data-connect]'),map=new TrackerMap('driver-map');
  const busField=document.querySelector('#driver-bus'),keyField=document.querySelector('#driver-key'),keyToggle=document.querySelector('[data-key-toggle]'),disconnect=document.querySelector('[data-disconnect]');
  const message=(text,tone='normal')=>{const el=document.querySelector('[data-driver-message]');el.textContent=text;el.dataset.tone=tone;};
  const status=(name,text)=>{document.querySelector(`[data-status="${name}"]`).textContent=text;};
  const buttons=Object.fromEntries([...document.querySelectorAll('[data-action]')].map(button=>[button.dataset.action,button]));
  let bus=null,key='',tripId=null,startRequestId=null,watch=null,generation=0,busy=false,sequence=0,latest=null,sentTimestamp=0,pendingAction=null,queue=Promise.resolve(),flushing=false,serverOffset=0,lastContact=0,lastHeartbeat=0,lastSentAt=0,wakeLock=null;
  function controls(){
    root.dataset.connected=String(Boolean(bus));
    const help=document.querySelector('[data-trip-help]');if(help)help.textContent=!bus?'Enter your assigned bus ID and private driver key above, then connect. Trip controls unlock in order.':!tripId?'Bus connected. Choose Start trip, then Start sharing to allow phone GPS access.':watch===null?'Choose Start sharing to send your phone location, or End trip to finish.':'Your GPS is sharing. Stop sharing pauses GPS; End trip finishes the journey.';
    for(const button of Object.values(buttons))button.setAttribute('aria-describedby','trip-help');
    buttons.start.disabled=!bus||Boolean(tripId)||busy;buttons.share.disabled=!tripId||watch!==null||busy||Boolean(pendingAction);
    buttons.pause.disabled=watch===null;buttons.end.disabled=!tripId||busy||pendingAction==='end';
    for(const el of form.querySelectorAll('input,button'))el.disabled=Boolean(bus)||busy;
    document.querySelector('[data-connect-button]').setAttribute('aria-busy',String(busy&&!bus));
    document.querySelector('[data-connect-label]').textContent=busy&&!bus?'Connecting...':bus?'Bus connected':'Connect bus';
    disconnect.hidden=!bus;disconnect.disabled=Boolean(tripId)||busy;
    const current=!bus?'connect':!tripId?'start':'share';
    for(const step of document.querySelectorAll('[data-step]')){if(step.dataset.step===current)step.setAttribute('aria-current','step');else step.removeAttribute('aria-current');step.dataset.complete=String(step.dataset.step==='connect'?Boolean(bus):step.dataset.step==='start'?Boolean(tripId):watch!==null);}
    document.querySelector('[data-next-action]').textContent=!bus?'CONNECT YOUR BUS FIRST':!tripId?'READY TO START A TRIP':pendingAction?'CONFIRMING WITH SERVER':watch===null?'READY TO SHARE':'LOCATION SHARING ON';
    buttons.start.classList.toggle('btn-gold',Boolean(bus)&&!tripId);buttons.start.classList.toggle('btn-outline',!bus||Boolean(tripId));
    buttons.start.setAttribute('aria-busy',String(busy&&Boolean(bus)&&!tripId));
    document.querySelector('.phone-panel').dataset.state=watch!==null&&lastSentAt&&Date.now()+serverOffset-lastSentAt<45000?'live':'idle';
  }
  async function request(action,payload={},keepalive=false){
    const began=Date.now();
    let response;
    try{response=await fetch(`/api/driver/${action}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({busId:bus?.id||busField.value.trim(),...payload}),keepalive,signal:AbortSignal.timeout(12000)});}
    catch(error){throw new Error(navigator.onLine?'Could not reach the server. Retrying while this page stays open.':'You are offline. Keep this page open to retry.');}
    let result;try{result=await response.json();}catch{throw new Error('The server returned an unreadable response. Please retry.');}
    if(Number.isFinite(result.serverTime))serverOffset=result.serverTime-(began+Date.now())/2;
    if(!response.ok)throw Object.assign(new Error(result.error||'Request failed.'),{status:response.status,code:result.code});
    lastContact=Date.now();status('server','Connected');return result;
  }
  function ordered(action,payload={}){const body={tripId,sequence:++sequence,...payload};const job=queue.catch(()=>{}).then(()=>request(action,body)).catch(error=>{error.fixTimestamp=payload.location?.timestamp;throw error;});queue=job;return job;}
  async function keepAwake(){
    if(!('wakeLock'in navigator)){status('screen','Not supported — keep screen on');return;}
    if(wakeLock||watch===null||document.visibilityState!=='visible')return;
    const current=generation;
    try{const lock=await navigator.wakeLock.request('screen');if(current!==generation||watch===null){await lock.release();return;}wakeLock=lock;status('screen','Kept awake while sharing');lock.addEventListener('release',()=>{if(wakeLock===lock)wakeLock=null;status('screen',watch===null?'Not requested':'Released — keep screen on');});}
    catch{status('screen','Unavailable — keep screen on');}
  }
  function clearLocal(){
    generation++;if(watch!==null)navigator.geolocation.clearWatch(watch);watch=null;latest=null;sentTimestamp=0;lastSentAt=0;
    if(wakeLock){const lock=wakeLock;wakeLock=null;lock.release().catch(()=>{});}status('screen','Not requested');
    map.update([]);map.route(bus);status('coordinates','Sharing stopped');status('accuracy','Not available');controls();
  }
  function handleError(error){
    if(['STALE_REQUEST','STALE_LOCATION'].includes(error.code)){if(error.code==='STALE_LOCATION')sentTimestamp=Math.max(sentTimestamp,error.fixTimestamp||0);return;}
    if(error.code==='TRIP_ENDED'||error.status===401){clearLocal();tripId=null;pendingAction=null;startRequestId=null;status('trip','Disconnected');if(error.status===401){bus=null;key='';status('bus','Not connected');status('route','Not connected');}controls();}
    if(!error.status)status('server','Unavailable — retrying');message(error.message,'error');
  }
  keyToggle.addEventListener('click',()=>{const show=keyField.type==='password';keyField.type=show?'text':'password';keyToggle.textContent=show?'Hide':'Show';keyToggle.setAttribute('aria-pressed',String(show));});
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||bus)return;busy=true;key=keyField.value.trim();controls();
    try{const result=await request('connect');bus=result.bus;keyField.value='';keyField.type='password';keyToggle.textContent='Show';keyToggle.setAttribute('aria-pressed','false');status('bus',`${bus.id} — ${bus.name}`);status('route',bus.route.name);map.route(bus,true);message('Bus connected. Start your trip when you are ready.');}
    catch(error){key='';handleError(error);}finally{busy=false;controls();if(bus&&!tripId)buttons.start.focus({preventScroll:false});}
  });
  disconnect.addEventListener('click',()=>{if(tripId)return;clearLocal();bus=null;key='';startRequestId=null;keyField.value='';keyField.type='password';status('bus','Not connected');status('route','Not connected');status('server','Not connected');status('trip','Not started');status('sent','None yet');map.route(null);controls();message('Disconnected. Enter your assigned bus details to connect again.');busField.focus();});
  buttons.start.addEventListener('click',async()=>{
    if(busy||tripId)return;busy=true;startRequestId ||= crypto.randomUUID();controls();
    try{const result=await request('start',{requestId:startRequestId});tripId=result.tripId;sequence=0;status('trip','Active — not sharing');message('Trip started. Start sharing when you want to request location permission.');}
    catch(error){handleError(error);}finally{busy=false;controls();if(bus&&!tripId)buttons.start.focus({preventScroll:false});}
  });
  buttons.share.addEventListener('click',()=>{
    if(!tripId||watch!==null)return;
    if(!isSecureContext||!navigator.geolocation){message('GPS requires an HTTPS address on your phone. Localhost works on this computer.','error');return;}
    const current=++generation;status('permission','Requesting permission');status('trip','Waiting for GPS');message('Waiting for a fresh GPS fix. Your location is not public yet.');
    try{watch=navigator.geolocation.watchPosition(position=>{
      if(current!==generation)return;
      status('permission','Granted');const c=position.coords;
      latest={lat:c.latitude,lng:c.longitude,accuracy:c.accuracy,speed:c.speed,timestamp:position.timestamp+serverOffset};
      status('coordinates',`${c.latitude.toFixed(6)}, ${c.longitude.toFixed(6)}`);status('accuracy',`±${Math.round(c.accuracy)} m`);
      map.update([{...bus,location:latest}]);map.route({...bus,location:latest});
      document.querySelector('[data-map-message]').textContent='Your phone position. Students see it only after server confirmation.';
      if(!lastSentAt)status('trip','GPS acquired — sending');controls();flush();
    },error=>{
      if(current!==generation)return;
      if(error.code===1){status('permission','Denied');stop('pause');}
      message(error.code===1?'Location access was denied. Enable it in browser settings, then try again.':error.code===2?'GPS is unavailable. Move to a place with a clearer signal.':'GPS timed out. Waiting for a fresh fix.','error');
    },{enableHighAccuracy:true,maximumAge:0,timeout:15000});}
    catch(error){clearLocal();message('Your browser could not start GPS. Check location permissions.','error');}
    keepAwake();controls();
  });
  function stop(action){clearLocal();pendingAction=action;status('trip',action==='end'?'Ending trip...':'Stopped locally — confirming with server');message('GPS has stopped on this phone. Waiting for the server to confirm.');controls();flush();}
  buttons.pause.addEventListener('click',()=>stop('pause'));buttons.end.addEventListener('click',()=>stop('end'));
  async function flush(){
    if(!tripId||flushing)return;flushing=true;
    try{
      if(pendingAction){const action=pendingAction;await ordered(action);if(pendingAction===action)pendingAction=null;if(action==='end'){tripId=null;startRequestId=null;status('trip','Ended');message('Trip ended. Your bus location is hidden.');}else{status('trip','Active — sharing paused');message('Sharing stopped. Your bus location is hidden.');}}
      else if(watch!==null&&latest&&latest.timestamp>sentTimestamp&&Date.now()+serverOffset-latest.timestamp<30000){
        const fix=latest,result=await ordered('location',{location:fix});sentTimestamp=fix.timestamp;lastSentAt=result.updatedAt;
        status('sent',new Date(result.updatedAt).toLocaleTimeString());
        if(watch!==null){status('trip','Sharing live');message(fix.accuracy>100?'Sharing with low GPS accuracy. Arrival estimates are withheld until accuracy improves.':'Location sharing is on. Students can follow your bus.');}
      }else if(Date.now()-lastHeartbeat>10000){await ordered('heartbeat');lastHeartbeat=Date.now();}
    }catch(error){handleError(error);}finally{flushing=false;controls();}
  }
  setInterval(()=>{
    flush();
    if(bus&&lastContact&&Date.now()-lastContact>20000)status('server','No recent confirmation');
    if(watch!==null&&lastSentAt&&Date.now()+serverOffset-lastSentAt>=45000){status('trip','GPS delayed — hidden from students');map.update([]);message('No recent GPS position. Students will not see an old marker. Keep the phone visible and check its signal.','error');controls();}
  },3000);
  addEventListener('online',flush);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){keepAwake();flush();}});
  addEventListener('pagehide',()=>{clearLocal();if(tripId){pendingAction ||= 'pause';const action=pendingAction;request(action,{tripId,sequence:++sequence},true).then(()=>{if(pendingAction===action){pendingAction=null;if(action==='end'){tripId=null;startRequestId=null;status('trip','Ended');}}}).catch(()=>{});}});
  addEventListener('pageshow',event=>{if(event.persisted&&tripId){status('trip','Active — sharing paused');message('Page restored. Start sharing again when ready.');flush();controls();}});
  controls();
})();
