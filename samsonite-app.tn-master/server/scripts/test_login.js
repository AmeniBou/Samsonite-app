(async ()=>{
  try{
    const port = process.env.TARGET_PORT || 4004;
    const res = await fetch(`http://localhost:${port}/api/auth/login`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({username:'admin',password:'admin'})
    });
    console.log('STATUS', res.status);
    const text = await res.text();
    console.log('BODY', text);
  }catch(err){
    console.error('ERR', err);
    process.exit(1);
  }
})();
