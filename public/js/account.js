(() => {
  let profile=null;try{profile=JSON.parse(sessionStorage.getItem('cosine-demo-profile')||'null');}catch{}
  if(profile&&typeof profile.name==='string'&&['student','driver'].includes(profile.role)){
    const banner=document.querySelector('[data-demo-session]');if(banner)banner.hidden=false;
    const label=document.querySelector('[data-demo-label]');if(label)label.textContent=`${profile.name} · ${profile.role==='driver'?'Driver':'Student'} demo`;
    document.querySelector('[data-signin-link]')?.setAttribute('hidden','');document.querySelector('[data-signout]')?.removeAttribute('hidden');document.querySelector('[data-mobile-signout]')?.removeAttribute('hidden');
    const mobile=document.querySelector('[data-mobile-signin]');if(mobile){mobile.textContent='Demo session active';mobile.href=profile.role==='driver'?'/driver':'/student';}
  }
  const destination=document.querySelector('[data-driver]')?'/driver':document.querySelector('[data-student]')?'/student':null;
  if(destination)try{localStorage.setItem('cosine-last-view',destination);}catch{}
  document.querySelectorAll('[data-signout],[data-mobile-signout]').forEach(button=>button.addEventListener('click',()=>{try{sessionStorage.removeItem('cosine-demo-profile');localStorage.removeItem('cosine-last-view');}catch{}location.assign('/?welcome=1');}));
  const form=document.querySelector('[data-access-form]');if(!form)return;
  const password=document.querySelector('#access-password'),show=document.querySelector('[data-access-show]');
  show.addEventListener('click',()=>{const visible=password.type==='password';password.type=visible?'text':'password';show.textContent=visible?'Hide':'Show';show.setAttribute('aria-pressed',String(visible));});
  form.addEventListener('submit',event=>{
    event.preventDefault();if(!form.reportValidity())return;
    const name=document.querySelector('#access-name')?.value.trim()||document.querySelector('#access-email').value.split('@')[0];
    const role=form.querySelector('input[name=role]:checked').value;
    try{sessionStorage.setItem('cosine-demo-profile',JSON.stringify({name:name.slice(0,60)||'Guest',role}));localStorage.setItem('cosine-last-view',role==='driver'?'/driver':'/student');}
    catch{document.querySelector('[data-access-status]').textContent='Browser storage is unavailable. You can still explore the dashboard as a guest.';return;}
    password.value='';form.querySelector('button[type=submit]').disabled=true;document.querySelector('[data-access-status]').textContent='Demo session ready. Opening your workspace...';
    setTimeout(()=>location.assign(role==='driver'?'/driver':'/student'),250);
  });
})();
