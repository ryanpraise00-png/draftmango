/* Validated Draftmango catalog and React starters. No generated fallback designs. */
(() => {
 let catalogPromise;
 const read=async path=>{const r=await fetch(path);if(!r.ok)throw new Error('The template library is unavailable. Please try again.');return r.json()};
 const catalog=()=>catalogPromise ||= read('/template-catalog.json').catch(error=>{catalogPromise=undefined;throw error;});
 function choose(items,prompt){
  if(!Array.isArray(items)||!items.length)throw new Error('The template library is unavailable.');
  const q=String(prompt||'').toLowerCase();
  const groups=[[/sock|clothing|fashion|apparel/,'fashion-store-1'],[/furniture/,'furniture-store-1'],[/architect|interior/,'architecture-studio-1'],[/caf[eé]|coffee|bakery/,'cafe-1'],[/restaurant|dining|bistro|food/,'restaurant-1'],[/photograph/,'photographer-1'],[/portfolio|designer/,'product-designer-1'],[/lawyer|law firm|legal practice/,'law-firm-1'],[/dentist|dental|medical|clinic/,'medical-clinic-1'],[/yoga/,'yoga-studio-1'],[/fitness|workout|gym/,'gym-1'],[/hotel|resort/,'resort-1'],[/consult/,'consulting-1'],[/finance|financial/,'financial-planner-1'],[/saas|software|automation/,'automation-1']];
  const id=groups.find(([re])=>re.test(q))?.[1];
  if(id&&items.some(t=>t.id===id))return items.find(t=>t.id===id);
  const words=q.match(/[a-z]{4,}/g)||[];
  return items.map(t=>({t,score:words.reduce((n,w)=>n+(t.name.toLowerCase().includes(w)?4:t.categories.join(' ').toLowerCase().includes(w)?2:0),0)})).sort((a,b)=>b.score-a.score)[0].t;
 }
 async function load(id,prompt){
  const accounts=globalThis.DraftmangoAccounts;
  if(!accounts?.request)throw new Error('Sign in to choose a template.');
  const result=await accounts.request('/api/templates/start',{method:'POST',body:{brief:String(prompt||''),...(id && !['auto','blank'].includes(id)?{id}:{})}});
  if(!globalThis.DraftmangoProject.valid(result.files)||!result.files['template.lock.json'])throw new Error('This template could not be opened safely. Choose another design.');
  return result;
 }
 globalThis.DraftmangoTemplates={catalog,choose,load};
})();
