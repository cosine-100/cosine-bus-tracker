(() => {
  if(!document.querySelector('[data-student]'))return;
  const map=new TrackerMap('student-map'),connection=document.querySelector('[data-connection]'),results=document.querySelector('[data-results]'),stops=document.querySelector('[data-stops]');
  const refreshButton=document.querySelector('[data-refresh]'),clearSearch=document.querySelector('[data-clear-search]'),clearSelection=document.querySelector('[data-clear-selection]');
  let buses=[],selected=null,stopId=null,query='',receivedAt=0,serverOffset=0,loaded=false,refreshing=false,source,streamOpen=false;
  try{const saved=JSON.parse(sessionStorage.getItem('cosine-pickup')||'null');selected=saved?.busId||null;stopId=saved?.stopId||null;}catch{}
  const labels={idle:'No active trip',live:'Sharing live',delayed:'GPS update delayed',paused:'Sharing paused'};
  function remember(){try{sessionStorage.setItem('cosine-pickup',JSON.stringify({busId:selected,stopId}));}catch{}}
  function clock(){return Date.now()+serverOffset;}
  function currentBuses(){const now=clock();return buses.map(bus=>({...bus,location:bus.location&&now-bus.updatedAt<45000?bus.location:null,status:bus.status==='live'&&now-bus.updatedAt>=45000?'delayed':bus.status}));}
  function choose(id){if(selected!==id)stopId=null;selected=id;remember();render();map.route(currentBuses().find(bus=>bus.id===id),true,stopId);}
  function detail(name,value){document.querySelector(`[data-detail="${name}"]`).textContent=value;}
  function keyedList(container,signature,build){
    if(container.dataset.signature===signature)return;
    const focused=container.contains(document.activeElement)?document.activeElement.dataset.key:null;
    container.replaceChildren(...build());container.dataset.signature=signature;
    if(focused)[...container.children].find(child=>child.dataset.key===focused)?.focus({preventScroll:true});
  }
  function render(){
    if(!loaded)return;
    const current=currentBuses(),now=clock();
    if(selected&&!current.some(bus=>bus.id===selected)){selected=null;stopId=null;remember();}
    const counts={total:current.length,active:current.filter(b=>b.tripId).length,live:current.filter(b=>b.location).length,delayed:current.filter(b=>b.status==='delayed').length};
    Object.entries(counts).forEach(([name,value])=>{document.querySelector(`[data-count="${name}"]`).textContent=String(value);});
    const visible=current.filter(bus=>`${bus.id} ${bus.name} ${bus.route.name}`.toLowerCase().includes(query));
    const noResults=visible.length===0;
    document.querySelector('[data-fleet-empty]').hidden=!noResults;
    document.querySelector('[data-empty-title]').textContent=query?'No matching buses':'No buses registered yet';
    document.querySelector('[data-empty-copy]').textContent=query?'Try another bus ID, name or route.':'Your fleet operator needs to register a bus before tracking can begin.';
    clearSearch.hidden=!query||!noResults;
    document.querySelector('[data-results-message]').textContent=visible.length?`${visible.length} bus${visible.length===1?'':'es'} available. Select one to see its route.`:query?'No buses match your search.':'Waiting for your fleet to be configured.';
    keyedList(results,JSON.stringify(visible.map(bus=>[bus.id,bus.name,bus.route.name,bus.status,bus.id===selected])),()=>visible.map(bus=>{
      const button=document.createElement('button');button.className='bus-choice';button.dataset.key=bus.id;button.setAttribute('aria-pressed',String(bus.id===selected));
      const name=document.createElement('strong');name.textContent=`${bus.id} — ${bus.name}`;
      const info=document.createElement('span');info.textContent=`${bus.route.name} · ${labels[bus.status]}`;
      button.append(name,info);button.addEventListener('click',()=>choose(bus.id));return button;
    }));
    // Searching filters the list, while the selected journey remains visible on the map.
    const bus=current.find(bus=>bus.id===selected);
    const mapped=bus&&!visible.some(item=>item.id===bus.id)?[...visible,bus]:visible;
    map.update(mapped,choose);map.route(bus,false,stopId);
    document.querySelector('[data-map-message]').textContent=mapped.some(bus=>bus.location)?'Showing recent GPS positions. Select a bus for its route and pickup stops.':bus?'This bus has no recent shared position. Its configured route remains visible.':'Explore the map. Live bus markers appear here when drivers share their location.';
    clearSelection.hidden=!bus;
    const intro=document.querySelector('[data-stop-intro]'),summary=document.querySelector('[data-stop-summary]');
    if(!bus){
      keyedList(stops,'none',()=>[]);['route','next','status','accuracy','updated','distance','eta'].forEach(name=>detail(name,'Not available'));detail('name','Choose a bus');
      intro.textContent='Choose a bus above to see its stops. Then select your pickup point for an arrival estimate.';summary.textContent='CHOOSE A BUS';return;
    }
    if(stopId&&!bus.route.stops.some(stop=>stop.id===stopId)){stopId=null;remember();}
    detail('name',`${bus.id} — ${bus.name}`);detail('route',bus.route.name);detail('status',labels[bus.status]);
    const next=Journey.nextStop(bus);
    detail('next',!bus.location?'Waiting for live GPS':!bus.route.path?.length?'Route path not configured':next?`${next.name} (estimated)`:'No upcoming stop identified');
    detail('accuracy',bus.location?`±${Math.round(bus.location.accuracy)} m`:'Not available');
    detail('updated',bus.updatedAt?`${Math.max(0,Math.round((now-bus.updatedAt)/1000))} seconds ago`:'None yet');
    summary.textContent=`${bus.route.stops.length} STOP${bus.route.stops.length===1?'':'S'}`;
    intro.textContent=bus.route.stops.length?`${bus.route.name} — select your pickup stop.`:'The fleet operator has not added stops to this route yet.';
    keyedList(stops,JSON.stringify([bus.id,bus.route.stops.map(stop=>[stop.id,stop.name]),stopId]),()=>bus.route.stops.map((stop,index)=>{
      const button=document.createElement('button');button.className='stop-choice';button.dataset.key=stop.id;button.setAttribute('aria-pressed',String(stop.id===stopId));
      const number=document.createElement('span');number.className='stop-number';number.textContent=String(index+1).padStart(2,'0');
      const name=document.createElement('span');name.textContent=stop.name;button.append(number,name);
      button.addEventListener('click',()=>{stopId=stop.id;remember();render();});return button;
    }));
    const estimate=Journey.estimate(bus,bus.route.stops.find(stop=>stop.id===stopId));
    detail('distance',estimate.available?`${(estimate.meters/1000).toFixed(2)} km${estimate.approximate?' (straight line)':' along route'}`:'Choose a stop with live GPS');
    detail('eta',estimate.seconds===0?'Near your stop — check GPS accuracy':estimate.seconds?`About ${Math.max(1,Math.ceil(estimate.seconds/60))} min${estimate.approximate?' (rough estimate)':''}`:estimate.reason);
  }
  function setConnection(text,error=false){connection.textContent=text;connection.dataset.state=error?'error':'connected';}
  function accept(data){
    if(!Array.isArray(data.buses))throw new Error('Invalid fleet response');
    buses=data.buses;serverOffset=Number.isFinite(data.serverTime)?data.serverTime-Date.now():serverOffset;receivedAt=Date.now();loaded=true;
    setConnection(streamOpen?'Live connection established.':'Connected. Checking for updates.');render();
  }
  async function refresh(){
    if(refreshing)return;refreshing=true;refreshButton.disabled=true;refreshButton.textContent='Refreshing...';
    try{const response=await fetch('/api/buses',{signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error();accept(await response.json());}
    catch{setConnection(navigator.onLine?'Server unavailable. Retrying automatically.':'You are offline. Old GPS positions will expire.',true);if(!loaded)document.querySelector('[data-results-message]').textContent='Could not load buses. Use Refresh to retry.';}
    finally{refreshing=false;refreshButton.disabled=false;refreshButton.textContent='Refresh';}
  }
  document.querySelector('[data-search]').addEventListener('submit',event=>{event.preventDefault();query=document.querySelector('#bus-search').value.trim().toLowerCase();render();const found=currentBuses().filter(bus=>`${bus.id} ${bus.name} ${bus.route.name}`.toLowerCase().includes(query));if(query&&found.length===1)choose(found[0].id);document.querySelector('#tracking').scrollIntoView({behavior:(window.CosinePreferences?.reducedMotion() ?? matchMedia('(prefers-reduced-motion:reduce)').matches)?'instant':'smooth',block:'start'});});
  document.querySelector('#bus-search').addEventListener('input',event=>{query=event.target.value.trim().toLowerCase();render();});
  clearSearch.addEventListener('click',()=>{document.querySelector('#bus-search').value='';query='';render();document.querySelector('#bus-search').focus();});
  clearSelection.addEventListener('click',()=>{selected=null;stopId=null;remember();render();});refreshButton.addEventListener('click',refresh);
  function connect(){
    if(!window.EventSource)return;source?.close();source=new EventSource('/api/events');
    source.onopen=()=>{streamOpen=true;};
    source.onmessage=event=>{try{accept(JSON.parse(event.data));}catch{setConnection('An update could not be read. Retrying.',true);}};
    source.onerror=()=>{streamOpen=false;setConnection('Live connection interrupted. Checking for updates.',true);};
  }
  connect();refresh();
  setInterval(()=>{if(loaded)render();if(Date.now()-receivedAt>15000)refresh();},5000);
  addEventListener('online',()=>{connect();refresh();});addEventListener('offline',()=>setConnection('You are offline. Old GPS positions will expire.',true));
  addEventListener('pagehide',()=>{source?.close();streamOpen=false;});addEventListener('pageshow',event=>{if(event.persisted){connect();refresh();}});
})();
