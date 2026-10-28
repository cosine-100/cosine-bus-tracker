(() => {
  const readProfile=()=>{try{const value=JSON.parse(sessionStorage.getItem('cosine-demo-profile')||'null');return value&&typeof value.name==='string'&&['student','driver'].includes(value.role)?value:null;}catch{return null;}};
  let profile=readProfile();
  const saveProfile=value=>{try{sessionStorage.setItem('cosine-demo-profile',JSON.stringify(value));profile=value;return true;}catch{return false;}};
  function paint(){
    const signedIn=Boolean(profile);
    document.querySelectorAll('[data-signout],[data-mobile-signout]').forEach(el=>{el.hidden=!signedIn;});
    document.querySelectorAll('[data-signin-link],[data-profile-signin],[data-settings-signin]').forEach(el=>{el.hidden=signedIn;});
    document.querySelectorAll('[data-profile-link]').forEach(el=>{el.title=signedIn?`${profile.name} - profile`:'Profile';});
    const banner=document.querySelector('[data-demo-session]');if(banner)banner.hidden=!signedIn;
    const label=document.querySelector('[data-demo-label]');if(label&&profile)label.textContent=`${profile.name} - ${profile.role==='driver'?'Driver':'Student'} demo`;
    const mobile=document.querySelector('[data-mobile-signin]');if(mobile){mobile.hidden=signedIn;}
    document.querySelectorAll('[data-workspace-link]').forEach(el=>{el.href=profile?.role==='driver'?'/driver':'/student';});
    const name=document.querySelector('[data-profile-name]');if(name)name.textContent=profile?.name||'Guest';
    const initials=document.querySelector('[data-profile-initials]');if(initials)initials.textContent=(profile?.name||'Guest').split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase();
    const role=document.querySelector('[data-profile-role]');if(role)role.textContent=profile?`${profile.role==='driver'?'Driver':'Student'} workspace`:'Browsing as a guest';
    const sessionLabel=document.querySelector('[data-profile-session-label]');if(sessionLabel)sessionLabel.textContent=signedIn?'Demo session':'Guest access';
    const session=document.querySelector('[data-settings-session]');if(session)session.textContent=profile?`Signed in as ${profile.name}. This is a local demo session.`:"You're browsing as a guest.";
  }
  function signOut(){try{sessionStorage.removeItem('cosine-demo-profile');sessionStorage.removeItem('cosine-pickup');localStorage.removeItem('cosine-last-view');}catch{}profile=null;location.assign('/?welcome=1');}
  document.querySelectorAll('[data-signout],[data-mobile-signout]').forEach(button=>button.addEventListener('click',signOut));
  const destination=document.querySelector('[data-driver]')?'/driver':document.querySelector('[data-student]')?'/student':null;
  if(destination)try{localStorage.setItem('cosine-last-view',destination);}catch{}
  paint();
  const profileForm=document.querySelector('[data-profile-form]');
  if(profileForm){
    const fields=[...profileForm.querySelectorAll('input,button')];fields.forEach(field=>{field.disabled=!profile;});
    if(!profile)document.querySelector('[data-profile-status]').textContent='Sign in to enable editing and save your profile.';
    if(profile){document.querySelector('#profile-name').value=profile.name;document.querySelector('#profile-email').value=profile.email||'';profileForm.querySelector(`input[value=${profile.role}]`).checked=true;}
    profileForm.addEventListener('submit',event=>{
      event.preventDefault();if(!profile||!profileForm.reportValidity())return;
      const name=document.querySelector('#profile-name').value.trim(),email=document.querySelector('#profile-email').value.trim(),role=profileForm.querySelector('input[name=profile-role]:checked').value;
      const status=document.querySelector('[data-profile-status]');if(!name){status.textContent='Enter your name.';return;}
      if(!saveProfile({name:name.slice(0,60),email:email.slice(0,200),role})){status.textContent='Browser storage is unavailable. Your changes could not be saved.';return;}
      try{localStorage.setItem('cosine-last-view',role==='driver'?'/driver':'/student');}catch{}
      paint();status.textContent='Profile saved for this browser tab.';
    });
  }
  const form=document.querySelector('[data-access-form]');if(!form)return;
  const password=document.querySelector('#access-password'),show=document.querySelector('[data-access-show]');
  show.addEventListener('click',()=>{const visible=password.type==='password';password.type=visible?'text':'password';show.textContent=visible?'Hide':'Show';show.setAttribute('aria-pressed',String(visible));});
  form.addEventListener('submit',event=>{
    event.preventDefault();if(!form.reportValidity())return;
    const email=document.querySelector('#access-email').value.trim(),name=document.querySelector('#access-name')?.value.trim()||email.split('@')[0],role=form.querySelector('input[name=role]:checked').value;
    if(!saveProfile({name:name.slice(0,60)||'Guest',email:email.slice(0,200),role})){document.querySelector('[data-access-status]').textContent='Browser storage is unavailable. You can still explore as a guest.';return;}
    try{localStorage.setItem('cosine-last-view',role==='driver'?'/driver':'/student');}catch{}
    password.value='';form.querySelector('button[type=submit]').disabled=true;document.querySelector('[data-access-status]').textContent='Opening your workspace...';
    setTimeout(()=>location.assign(role==='driver'?'/driver':'/student'),250);
  });
})();
