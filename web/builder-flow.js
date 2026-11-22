/* Shared, serializable requirements contract for the browser and server. */
(() => {
  const kinds=['store','services','restaurant','portfolio','saas','content','other'];
  const required={
    store:['Home','Shop','Product details','Cart','Checkout','Order confirmation','Order history','Sign in','Create account','Password reset','Contact','Shipping and returns','Privacy','Terms'],
    services:['Home','About','Services','Service details','Contact','Privacy','Terms'],
    restaurant:['Home','Menu','About','Contact','Privacy','Terms'],
    portfolio:['Home','Work','Project details','About','Contact','Privacy'],
    saas:['Home','Features','Pricing','Contact','Sign in','Create account','Password reset','Privacy','Terms'],
    content:['Home','Articles','Article details','About','Contact','Privacy'],
    other:['Home','About','Contact','Privacy']
  };
  const text=(v,max)=>typeof v==='string'&&v.length<=max?v.trim():null;
  function plan(value){
    if(!value||typeof value!=='object'||!kinds.includes(value.kind))return null;
    const result={kind:value.kind};
    for(const key of ['name','audience','goal','offering','region','content','brand']){
      const v=text(value[key],2000);if(v===null||(['name','audience','goal','offering'].includes(key)&&!v))return null;result[key]=v;
    }
    if(!/^[a-z][a-z0-9-]{0,70}$/.test(value.templateId||''))return null;
    result.templateId=value.templateId;
    for(const key of ['pages','workflows','connections','assumptions']){
      if(!Array.isArray(value[key])||value[key].length>50||value[key].some(x=>!text(x,600)))return null;
      result[key]=[...new Set(value[key].map(x=>x.trim()))];
    }
    result.pages=[...new Set([...required[result.kind],...result.pages])];
    if(result.pages.length>40)return null;
    if(['store','saas'].includes(result.kind))result.connections=[...new Set([...result.connections,'Draftmango-managed customer accounts and data'])];
    if(result.kind==='store')result.connections=[...new Set([...result.connections,'Connect the site owner’s payment provider for checkout'])];
    if(result.connections.length>50)return null;
    return result;
  }
  function questions(value){
    if(!Array.isArray(value)||value.length>3)return null;
    const seen=new Set(),result=[];
    for(const q of value){
      if(!q||!text(q.id,60)||seen.has(q.id.trim())||!text(q.title,400)||!Array.isArray(q.options)||q.options.length<2||q.options.length>4||q.options.some(x=>!text(x,200))||new Set(q.options.map(x=>x.trim())).size!==q.options.length)return null;
      seen.add(q.id.trim());result.push({id:q.id.trim(),title:q.title.trim(),options:q.options.map(x=>x.trim()),recommended:Number.isInteger(q.recommended)&&q.recommended>=0&&q.recommended<q.options.length?q.recommended:0});
    }
    return result;
  }
  function read(value){
    if(!value||value.version!==1||!['discovery','review','built'].includes(value.phase))return null;
    const q=questions(value.questions||[]),p=value.plan?plan(value.plan):null;
    if(!q||(value.plan&&!p)||(value.phase!=='discovery'&&!p))return null;
    const checks=Array.isArray(value.checks)?value.checks.filter(x=>x&&['passed','needs-attention','needs-connection'].includes(x.status)&&text(x.label,300)&&text(x.detail,1000)).slice(0,160).map(({status,label,detail})=>({status,label,detail})):[];
    return {version:1,phase:value.phase,questions:q,plan:p,checks};
  }
  const initial=()=>({version:1,phase:'discovery',questions:[],plan:null,checks:[]});
  function summary(p){return [p.name,p.offering,'Audience: '+p.audience,'Goal: '+p.goal,'Region: '+p.region,'Brand: '+p.brand,'Content: '+p.content,'Pages: '+p.pages.join(', '),'Workflows: '+p.workflows.join('; '),'Connections: '+p.connections.join('; '),'Assumptions agreed with the user: '+p.assumptions.join('; ')].join('\n');}
  globalThis.DraftmangoBuilderFlow=Object.freeze({kinds,required,plan,questions,read,initial,summary});
})();
