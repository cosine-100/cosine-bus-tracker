(() => {
  if(!document.querySelector('[data-settings-page]'))return;
  const preferences=window.CosinePreferences,status=document.querySelector('[data-settings-status]');
  function sync(){const value=preferences.get();for(const [name,selected]of [['setting-theme',value.theme],['setting-motion',value.motion]])document.querySelectorAll(`input[name=${name}]`).forEach(input=>{input.checked=input.value===selected;});document.querySelector('#setting-return').checked=value.returning;}
  const report=(saved,message)=>{status.textContent=saved?message:'Applied for this page, but browser storage is unavailable. It may not persist after reload.';};
  document.querySelectorAll('input[name=setting-theme]').forEach(input=>input.addEventListener('change',()=>report(preferences.setTheme(input.value),'Theme preference saved.')));
  document.querySelectorAll('input[name=setting-motion]').forEach(input=>input.addEventListener('change',()=>report(preferences.setMotion(input.value),'Motion preference saved.')));
  document.querySelector('#setting-return').addEventListener('change',event=>report(preferences.setReturning(event.target.checked),'Welcome-page preference saved.'));
  document.querySelector('[data-clear-pickup]').addEventListener('click',()=>{try{sessionStorage.removeItem('cosine-pickup');status.textContent='Saved bus and pickup selection cleared.';}catch{status.textContent='Browser storage is unavailable.';}});
  document.querySelector('[data-reset-preferences]').addEventListener('click',()=>{report(preferences.reset(),'Preferences reset. Your demo profile has been kept.');sync();});
  addEventListener('preferenceschange',sync);sync();
})();
