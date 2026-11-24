(() => {
  'use strict';
  function details(state) {
    const entitlements=state?.entitlements;
    const plan=state?.plans?.[entitlements?.plan];
    const allowance=entitlements?.creditAllowance;
    return {
      plan:typeof plan?.name==='string'?plan.name:'',
      trial:entitlements?.plan==='free',
      allowance:Number.isSafeInteger(allowance)&&allowance>=0?allowance:null,
      // An allowance is not a balance. Only the future metering service can issue a remaining amount.
      remaining:null,
      tracking:entitlements?.creditMeteringActive===true
    };
  }
  function mount(form) {
    const A=globalThis.DraftmangoAccounts,W=globalThis.DraftmangoWorkspace;
    const button=document.createElement('button');button.type='button';button.id='credit-usage';button.className='ws-credit-ring';
    button.setAttribute('aria-label','AI credits: balance not available yet');button.setAttribute('aria-haspopup','dialog');button.title='AI credits';
    button.innerHTML='<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="12"/></svg><span aria-hidden="true">—</span>';
    form.append(button);
    let state=null,loading=false,failed=false,panel=null;
    function paint(){
      if(!panel?.isConnected)return;
      const value=details(state),e=W.e;
      panel.querySelector('.dialog-body').innerHTML=`<div class="credit-balance">—</div><p>AI credits remaining</p><p>${loading?'Loading your credit details…':A.preview?'Sign in to see your credit details.':failed?'Your credit details could not be loaded. Try again.':value.tracking?'Your remaining balance is not available yet.':'Credit tracking is not active yet. Your remaining balance will appear here when it is enabled.'}</p>${!loading&&!failed&&value.plan&&value.allowance!==null?`<p><strong>${e(value.plan)}</strong> · ${value.allowance.toLocaleString()} ${value.trial?'trial credits planned':'credits per month included in your plan'}.</p>`:''}<div class="ws-action-row"><a class="button" href="/dashboard#settings/billing">Plans &amp; credits</a>${!A.preview?`<button type="button" class="button" data-credit-refresh ${loading?'disabled':''}>Refresh</button>`:''}</div>`;
      panel.querySelector('[data-credit-refresh]')?.addEventListener('click',load);
    }
    async function load(){
      if(loading||A.preview)return;loading=true;failed=false;paint();
      try{state=await A.request('/api/billing/status');}catch{state=null;failed=true;}
      finally{loading=false;paint();}
    }
    button.onclick=()=>{
      panel=W.dialog('AI credits','');panel.classList.add('ws-credit-dialog');
      panel.querySelector('h2').id='credit-dialog-title';panel.setAttribute('aria-labelledby','credit-dialog-title');
      paint();load();
    };
    window.addEventListener('draftmango:session-ended',()=>{state=null;panel?.close();});
    return {refresh:load};
  }
  globalThis.DraftmangoCredits=Object.freeze({details,mount});
})();
