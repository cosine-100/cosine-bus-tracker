(() => {
  if(new URLSearchParams(location.search).has('welcome'))return;
  try{if(localStorage.getItem('cosine-return')==='false')return;const destination=localStorage.getItem('cosine-last-view');if(['/student','/driver'].includes(destination))location.replace(destination);}catch{}
})();
