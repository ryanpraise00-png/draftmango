/* Browser-only draft handoff. Reference contents never travel in URLs or email. */
(() => {
  const prefix='draftmango-composer-intent-v1:', ttl=24*60*60*1000;
  const validId=id=>typeof id==='string'&&/^[a-f0-9-]{36}$/.test(id);
  function clean(input){
    const idea=typeof input?.idea==='string'?input.idea.trim().slice(0,12000):'';
    if(!idea)throw new Error('A prompt is required.');
    const references=Array.isArray(input.references)?input.references:[];
    if(references.length>5||references.some(r=>typeof r?.name!=='string'||typeof r?.data!=='string'||!['text/plain','image/png','image/jpeg','image/webp','image/gif','application/pdf'].includes(r?.type))||references.reduce((sum,r)=>sum+new TextEncoder().encode(r.data).length,0)>3*1024*1024)throw new Error('Invalid references.');
    return {idea,modelId:typeof input.modelId==='string'&&/^[\w.:-]{1,100}$/.test(input.modelId)?input.modelId:'',notes:typeof input.notes==='string'?input.notes.slice(0,6000):'',references:references.map(r=>({name:r.name.slice(0,150),type:r.type,data:r.data,size:Math.max(0,Number(r.size)||0)}))};
  }
  function save(input,storage=localStorage){
    const value=clean(input),id=crypto.randomUUID(),now=Date.now();
    for(let i=storage.length-1;i>=0;i--){const key=storage.key(i);if(!key?.startsWith(prefix))continue;try{const saved=JSON.parse(storage.getItem(key));if(!saved.at||now-saved.at>ttl)storage.removeItem(key);}catch{storage.removeItem(key);}}
    storage.setItem(prefix+id,JSON.stringify({...value,at:now}));return id;
  }
  function read(id,idea,storage){
    if(!validId(id))return null;
    try{storage??=globalThis.localStorage;const value=JSON.parse(storage.getItem(prefix+id));if(!value?.at||Date.now()-value.at>ttl||value.idea?.slice(0,1200).trim()!==idea?.trim())return null;return clean(value);}catch{return null;}
  }
  function remove(id,storage){if(validId(id))try{(storage??globalThis.localStorage).removeItem(prefix+id);}catch{}}
  globalThis.DraftmangoComposerIntent=Object.freeze({save,read,remove});
})();
