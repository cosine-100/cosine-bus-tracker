(() => {
  const system=matchMedia('(prefers-color-scheme:dark)');let preference='system';
  try{preference=localStorage.getItem('cosine-theme')||'system';}catch{}
  function apply(){const dark=preference==='dark'||preference==='system'&&system.matches;document.documentElement.dataset.theme=dark?'dark':'light';document.documentElement.style.colorScheme=dark?'dark':'light';document.querySelectorAll('[data-theme-toggle]').forEach(button=>{button.setAttribute('aria-checked',String(dark));button.title=dark?'Switch to light theme':'Switch to dark theme';});dispatchEvent(new CustomEvent('themechange'));}
  apply();system.addEventListener('change',()=>{if(preference==='system')apply();});
  document.addEventListener('DOMContentLoaded',()=>{apply();document.querySelectorAll('[data-theme-toggle]').forEach(button=>button.addEventListener('click',()=>{preference=document.documentElement.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem('cosine-theme',preference);}catch{}apply();}));});
})();
