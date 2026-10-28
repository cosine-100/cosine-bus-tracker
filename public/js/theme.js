(() => {
  const themeMedia=matchMedia('(prefers-color-scheme:dark)'),motionMedia=matchMedia('(prefers-reduced-motion:reduce)');
  const read=(key,fallback)=>{try{return localStorage.getItem(key)??fallback;}catch{return fallback;}};
  let theme=['light','dark','system'].includes(read('cosine-theme','system'))?read('cosine-theme','system'):'system';
  let motion=read('cosine-motion','system')==='reduce'?'reduce':'system';
  let returning=read('cosine-return','true')!=='false';
  const save=(key,value)=>{try{localStorage.setItem(key,value);return true;}catch{return false;}};
  function apply(){
    const dark=theme==='dark'||theme==='system'&&themeMedia.matches;
    document.documentElement.dataset.theme=dark?'dark':'light';document.documentElement.style.colorScheme=dark?'dark':'light';
    document.documentElement.dataset.motion=motion==='reduce'||motionMedia.matches?'reduce':'normal';
    document.querySelectorAll('[data-theme-toggle]').forEach(button=>{button.setAttribute('aria-checked',String(dark));button.title=dark?'Switch to light theme':'Switch to dark theme';});
    dispatchEvent(new CustomEvent('themechange'));dispatchEvent(new CustomEvent('preferenceschange'));
  }
  window.CosinePreferences={
    get:()=>({theme,motion,returning}),reducedMotion:()=>document.documentElement.dataset.motion==='reduce',
    setTheme(value){if(!['light','dark','system'].includes(value))return false;theme=value;const saved=save('cosine-theme',value);apply();return saved;},
    setMotion(value){if(!['system','reduce'].includes(value))return false;motion=value;const saved=save('cosine-motion',value);apply();return saved;},
    setReturning(value){returning=Boolean(value);const saved=save('cosine-return',String(returning));apply();return saved;},
    reset(){theme='system';motion='system';returning=true;let saved=true;try{for(const key of ['cosine-theme','cosine-motion','cosine-return','cosine-last-view'])localStorage.removeItem(key);sessionStorage.removeItem('cosine-pickup');}catch{saved=false;}apply();return saved;}
  };
  themeMedia.addEventListener('change',apply);motionMedia.addEventListener('change',apply);apply();
  addEventListener('storage',event=>{if(['cosine-theme','cosine-motion','cosine-return'].includes(event.key)||event.key===null){theme=read('cosine-theme','system');if(!['light','dark','system'].includes(theme))theme='system';motion=read('cosine-motion','system')==='reduce'?'reduce':'system';returning=read('cosine-return','true')!=='false';apply();}});
  document.addEventListener('DOMContentLoaded',()=>{apply();document.querySelectorAll('[data-theme-toggle]').forEach(button=>button.addEventListener('click',()=>CosinePreferences.setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark')));});
})();
