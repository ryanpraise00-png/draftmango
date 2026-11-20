/* Validated Framo catalog and React starters. No generated fallback designs. */
(() => {
 let catalogPromise,runtimePromise;
 const read=async path=>{const r=await fetch(path);if(!r.ok)throw new Error('The template library is unavailable. Please try again.');return r.json()};
 const catalog=()=>catalogPromise ||= read('/template-catalog.json');
 function choose(items,prompt){
  const q=String(prompt||'').toLowerCase();
  const groups=[[/sock|clothing|fashion|apparel/,'fashion-store-1'],[/furniture/,'furniture-store-1'],[/architect|interior/,'architecture-studio-1'],[/restaurant|café|cafe|coffee|food/,'restaurant-1'],[/portfolio|photograph/,'portfolio-1'],[/saas|software|automation/,'automation-1']];
  const id=groups.find(([re])=>re.test(q))?.[1];
  if(id&&items.some(t=>t.id===id))return items.find(t=>t.id===id);
  const words=q.match(/[a-z]{4,}/g)||[];
  return items.map(t=>({t,score:words.reduce((n,w)=>n+(t.name.toLowerCase().includes(w)?4:t.categories.join(' ').toLowerCase().includes(w)?2:0),0)})).sort((a,b)=>b.score-a.score)[0].t;
 }
 async function load(id,prompt){
  const items=await catalog();
  const chosen=id&&id!=='auto'&&id!=='blank'?items.find(t=>t.id===id):choose(items,prompt);
  if(!chosen)throw new Error('That template is no longer available. Choose a design from the library.');
  const [source,runtime]=await Promise.all([read('/framo/starters/'+chosen.id+'.json'),runtimePromise ||= read('/framo/starters/runtime.json')]);
  const files=globalThis.DraftmangoProject.scaffold({...source.files,...runtime},chosen.name);
  if(!globalThis.DraftmangoProject.valid(files))throw new Error('This template could not be opened safely. Choose another design.');
  return {...chosen,files};
 }
 globalThis.DraftmangoTemplates={catalog,choose,load};
})();
