(() => {
  if(new URLSearchParams(location.search).has('welcome'))return;
  try{const destination=localStorage.getItem('cosine-last-view');if(['/student','/driver'].includes(destination))location.replace(destination);}catch{}
})();
