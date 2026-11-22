/* Connect a confirmed, saved build to an owner-only draft store. No publishing or payment writes. */
(() => {
 'use strict';
 const A=globalThis.DraftmangoAccounts,B=globalThis.DraftmangoBuilderFlow;
 const supported=p=>{try{return p.workspace?.builder?.phase==='built'&&B.storeSupport(p.workspace.builder.plan)&&['fashion-store-v1','fashion-store-v2'].includes(JSON.parse(p.files['storefront.json']).adapter);}catch{return false;}};
 const owner=()=>{if(A.preview||!A.user)throw Error('Sign in to prepare and manage this store.');return A.user.id;};
 const read=()=>JSON.parse(localStorage.getItem(A.key('projects'))||'{}');
 async function savedVersion(project){
  const account=owner(),sequence=read().cloud?.[project.id]?.seq,deadline=Date.now()+20000;
  do{
   await A.sync();
   if(owner()!==account)throw Error('Your account changed. Reopen this project.');
   const meta=read().cloud?.[project.id];
   if(sequence==null||meta?.seq!==sequence)throw Error('This draft changed while saving. Review the latest build before preparing its store.');
   if(!meta.dirty&&meta.version>0)return meta.version;
   await new Promise(resolve=>setTimeout(resolve,250));
  }while(Date.now()<deadline);
  throw Error('The build has not synced to your account yet. Check your connection and try again.');
 }
 const status=async project=>{owner();return A.request('/api/stores?'+new URLSearchParams({projectId:project.id}));};
 async function prepare(project){
  owner();if(!supported(project))throw Error('Complete the supported store build first.');
  const expectedVersion=await savedVersion(project);
  return A.request('/api/stores',{method:'POST',body:{action:'prepare',projectId:project.id,expectedVersion}});
 }
 async function catalogue(project){
  owner();
  const data=await A.request('/api/stores?'+new URLSearchParams({projectId:project.id,section:'preview'}));
  if(!data.store)return null;
  // Only displayable catalogue fields cross the isolated preview boundary.
  const s=data.store,missing=data.missingSettings||[];
  return {store:{name:s.name,currency:s.currency,supportEmail:s.supportEmail,shippingCountries:s.shippingCountries,
   shippingAmount:missing.includes('shippingAmount')?null:s.shippingAmount,taxBasisPoints:missing.includes('taxBasisPoints')?null:s.taxBasisPoints,
   policies:s.policies,acceptingOrders:false},products:(data.products||[]).map(p=>({id:p.id,name:p.name,description:p.description,category:p.category,image:p.image,active:p.active,
    variants:p.variants.map(v=>({id:v.id,label:v.label,price:v.price,stock:v.stock,active:v.active}))})),customer:null};
 }
 globalThis.DraftmangoStoreBuilder=Object.freeze({supported,savedVersion,status,prepare,catalogue});
})();
