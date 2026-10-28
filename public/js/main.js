(() => {
  const button = document.querySelector('[data-menu-button]'), menu = document.querySelector('[data-menu]');
  const closeMenu = () => { menu?.classList.add('hidden'); button?.setAttribute('aria-expanded','false'); };
  button?.addEventListener('click', () => { const open=menu.classList.toggle('hidden')===false;button.setAttribute('aria-expanded',String(open)); });
  menu?.addEventListener('click',event=>{if(event.target.closest('a'))closeMenu();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&button?.getAttribute('aria-expanded')==='true'){closeMenu();button.focus();}});
  document.addEventListener('click',event=>{if(!event.target.closest('.app-header'))closeMenu();});
  matchMedia('(min-width:681px)').addEventListener('change',event=>{if(event.matches)closeMenu();});
  const network=document.querySelector('[data-network-status]');
  function showNetwork(){if(network){network.textContent=navigator.onLine?'Device online':'Device offline';network.className=navigator.onLine?'badge badge-ok':'badge';}}
  showNetwork();addEventListener('online',showNetwork);addEventListener('offline',showNetwork);
  document.querySelectorAll('.hero-link').forEach(link=>link.addEventListener('click',()=>{const field=document.querySelector(link.getAttribute('href'));if(field?.matches('input'))setTimeout(()=>field.focus({preventScroll:true}),350);}));
  const navLinks=[...document.querySelectorAll('.side-nav a')];
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
    if(!matchMedia('(prefers-reduced-motion:reduce)').matches) document.querySelectorAll('.tracking-section,.driver-grid,.trip-panel,.stops-panel').forEach(el=>{el.classList.add('reveal-ready');observer.observe(el);});


  }
})();
