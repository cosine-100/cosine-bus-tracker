(() => {
  const button = document.querySelector('[data-menu-button]'), menu = document.querySelector('[data-menu]');
  const sidebar=document.querySelector('.app-sidebar'), desktop=matchMedia('(min-width:901px)');
  document.querySelectorAll('.side-nav a,.side-nav button').forEach(el=>{const label=el.textContent.trim();el.setAttribute('aria-label',el.title||label);if(!el.title)el.title=label;el.dataset.tooltip=el.getAttribute('aria-label');});
  const tip=document.createElement('div');tip.className='rail-tooltip';tip.setAttribute('role','tooltip');tip.id='rail-tooltip';tip.hidden=true;document.body.append(tip);
  document.querySelectorAll('.side-nav a,.side-nav button').forEach(el=>{
    const show=()=>{if(!document.body.classList.contains('sidebar-collapsed'))return;const rect=el.getBoundingClientRect();tip.textContent=el.dataset.tooltip;tip.style.left=(rect.right+12)+'px';tip.style.top=(rect.top+rect.height/2)+'px';tip.hidden=false;el.setAttribute('aria-describedby',tip.id);};
    const hide=()=>{tip.hidden=true;el.removeAttribute('aria-describedby');};el.addEventListener('mouseenter',show);el.addEventListener('focus',show);el.addEventListener('mouseleave',hide);el.addEventListener('blur',hide);
  });document.addEventListener('keydown',event=>{if(event.key==='Escape')tip.hidden=true;});
  let collapsed=false;try{collapsed=localStorage.getItem('cosine-sidebar')==='collapsed';}catch{}
  function syncNavigation(){
    tip.hidden=true;
    document.body.classList.toggle('sidebar-collapsed',Boolean(sidebar&&collapsed&&desktop.matches));
    const collapse=document.querySelector('[data-sidebar-collapse]');
    collapse?.setAttribute('aria-expanded',String(!collapsed));collapse?.setAttribute('aria-label',collapsed?'Expand sidebar':'Collapse sidebar');collapse?.setAttribute('title',collapsed?'Expand sidebar':'Collapse sidebar');
    button?.setAttribute('aria-controls','mobile-menu');button?.setAttribute('aria-expanded',String(menu&&!menu.classList.contains('hidden')));button?.setAttribute('aria-label','Navigation menu');
  }
  const closeMenu=()=>{menu?.classList.add('hidden');syncNavigation();};
  document.querySelector('[data-sidebar-collapse]')?.addEventListener('click',()=>{collapsed=!collapsed;try{localStorage.setItem('cosine-sidebar',collapsed?'collapsed':'expanded');}catch{}syncNavigation();setTimeout(()=>window.dispatchEvent(new Event('resize')),200);});
  button?.addEventListener('click',()=>{menu?.classList.toggle('hidden');syncNavigation();});
  menu?.addEventListener('click',event=>{if(event.target.closest('a,button'))closeMenu();});
  const demoButton=document.querySelector('[data-demo-button]'),demoMenu=document.querySelector('[data-demo-menu]');
  const closeDemo=()=>{if(demoMenu)demoMenu.hidden=true;demoButton?.setAttribute('aria-expanded','false');};
  demoButton?.addEventListener('click',()=>{demoMenu.hidden=!demoMenu.hidden;demoButton.setAttribute('aria-expanded',String(!demoMenu.hidden));});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){if(menu&&!menu.classList.contains('hidden')){closeMenu();button?.focus();}if(demoMenu&&!demoMenu.hidden){closeDemo();demoButton?.focus();}}});
  document.addEventListener('click',event=>{if(!event.target.closest('.app-header'))closeMenu();if(!event.target.closest('.demo-navigation'))closeDemo();});
  document.addEventListener('focusin',event=>{if(!event.target.closest('.demo-navigation'))closeDemo();});
  desktop.addEventListener('change',closeMenu);syncNavigation();

  const network=document.querySelector('[data-network-status]');
  function showNetwork(){if(network){network.textContent=navigator.onLine?'Device online':'Device offline';network.className=navigator.onLine?'badge badge-ok':'badge';}}
  showNetwork();addEventListener('online',showNetwork);addEventListener('offline',showNetwork);
  document.querySelectorAll('.hero-link').forEach(link=>link.addEventListener('click',()=>{const field=document.querySelector(link.getAttribute('href'));if(field?.matches('input'))setTimeout(()=>field.focus({preventScroll:true}),350);}));
  const navLinks=[...document.querySelectorAll('.side-nav a[href^="#"]')];
  const mark=href=>navLinks.forEach(link=>{if(link.getAttribute('href')===href)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
  navLinks.forEach(link=>link.addEventListener('click',()=>mark(link.getAttribute('href'))));
  let scheduled=false;
  function updateSection(){
    let current='#main';
    for(const link of navLinks){const section=document.querySelector(link.getAttribute('href'));if(section&&section.getBoundingClientRect().top<=180)current=link.getAttribute('href');}
    mark(current);scheduled=false;
  }
  addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(updateSection);}},{passive:true});
  addEventListener('resize',updateSection);updateSection();
  if ('IntersectionObserver' in window) {
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries)if(entry.isIntersecting){entry.target.classList.remove('reveal-ready');entry.target.classList.add('reveal-visible');observer.unobserve(entry.target);}
    },{threshold:.06});
    if(!(window.CosinePreferences?.reducedMotion() ?? matchMedia('(prefers-reduced-motion:reduce)').matches)) document.querySelectorAll('.tracking-section,.driver-grid,.trip-panel,.stops-panel').forEach(el=>{el.classList.add('reveal-ready');observer.observe(el);});


  }
})();
