(() => {
  'use strict';
  const A=globalThis.DraftmangoAccounts,W=globalThis.DraftmangoWorkspace,{e,icon}=W;
  const money=(value,currency='usd')=>new Intl.NumberFormat(undefined,{style:'currency',currency:currency.toUpperCase()}).format(value/100);
  const card=(title,copy,body)=>`<section class="settings-card"><h2>${title}</h2><p>${copy}</p>${body}</section>`;
  const date=value=>value?new Date(value).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}):'Not scheduled';
  const redirect=(url,host)=>{const target=new URL(url);if(target.protocol!=='https:'||target.hostname!==host)throw Error('The payment link could not be verified.');location.assign(target.href);};
  async function render(root){
    root.innerHTML='<p role="status">Loading billing…</p>';
    let state,cadence='monthly';
    try{const interest=JSON.parse(sessionStorage.getItem('draftmango-plan-interest'));if(interest?.billing==='yearly')cadence='yearly';}catch{/* Invalid saved selections never change a subscription. */}
    try{
      const returned=new URLSearchParams(location.search).get('checkout')==='return';
      state=await A.request('/api/billing/status');
      if(returned&&state.configured){
        state=await A.request('/api/billing/refresh',{method:'POST',body:{}});
        const url=new URL(location.href);url.searchParams.delete('checkout');history.replaceState(null,'',url);
      }
    }catch(error){if(root.isConnected)root.innerHTML=`<p role="alert">${e(error.message)}</p><button class="button" id="billing-retry">Try again</button>`;root.querySelector('#billing-retry')?.addEventListener('click',()=>render(root));return;}
    if(!root.isConnected)return;
    const act=(selector,fn)=>root.querySelectorAll(selector).forEach(button=>button.onclick=async()=>{button.disabled=true;try{await fn(button);}catch(error){const status=root.querySelector('#billing-message');if(status){status.hidden=false;status.textContent=error.message;}else W.toast(error.message);}finally{if(button.isConnected)button.disabled=false;}});
    async function openCheckout(plan,period){const result=await A.request('/api/billing/checkout',{method:'POST',body:{plan,cadence:period}});redirect(result.url,'checkout.stripe.com');}
    function paint(){
      const current=state.plans[state.entitlements.plan],pending=state.pendingCheckout;
      const live=state.mode==='live',enabled=state.configured;
      root.innerHTML=card('Your subscription','Your plan is confirmed by the payment provider.',`<div class="ws-setting-row"><div><small>CURRENT PLAN</small><h3>${e(current.name)}</h3><p>${state.status==='none'?'No active paid subscription.':e(state.status.replaceAll('_',' '))}</p></div><span class="ws-badge">${enabled?(live?'Live billing':'Stripe test mode'):'Payments not connected'}</span></div>${state.renewalAt?`<p>${state.cancelAtPeriodEnd?'Access ends':'Current billing period ends'} ${e(date(state.renewalAt))}.</p>`:''}<div class="ws-action-row"><button class="button" id="manage-billing" ${!enabled||!state.canManage?'disabled':''}>Manage billing ${icon('external')}</button><button class="button" id="billing-refresh">Refresh status</button></div><p class="muted">${!enabled?'Payments aren’t available yet. You can continue using the Free plan.':live?'Use the payment portal to manage your subscription, payment method and cancellation.':'Test payments only. No real money is charged, and test subscriptions do not carry over to live billing.'}</p>${pending?`<div class="ws-inset"><h3>Pending ${e(state.plans[pending.plan]?.name||'plan')} checkout</h3><p>${e(pending.cadence)} billing. Your plan changes only after Stripe confirms the subscription.</p><div class="ws-action-row"><button class="button primary" id="resume-checkout">${pending.url?'Resume':'Retry'} checkout</button><button class="button" id="cancel-checkout">Cancel checkout</button></div></div>`:''}`)+`<p id="billing-message" role="status" hidden></p>`+
      card('Choose a plan','Custom domains require a paid plan. Domain registration and renewal are purchased separately.',`<div class="ws-action-row" role="group" aria-label="Billing interval"><button class="button ${cadence==='monthly'?'selected':''}" data-cadence="monthly" aria-pressed="${cadence==='monthly'}">Monthly</button><button class="button ${cadence==='yearly'?'selected':''}" data-cadence="yearly" aria-pressed="${cadence==='yearly'}">Yearly</button></div><div class="ws-plans">${['basic','pro'].map(id=>{const p=state.plans[id];return `<div class="ws-plan"><h3>${e(p.name)}</h3><strong>${money(p[cadence])}<small> / ${cadence==='yearly'?'year':'month'}</small></strong><p>${p.credits.toLocaleString()} AI credits / month</p><p>${p.sites} published ${p.sites===1?'site':'sites'}</p><button class="button" data-plan="${id}" ${!enabled||!state.canSubscribe?'disabled':''}>${live?'Choose':'Test'} ${e(p.name)}</button></div>`;}).join('')}</div><p class="muted">Prices are in USD. Applicable tax is shown at checkout. Annual plans are billed for the full year; their credit allowance is monthly.</p><a class="text-link" href="./pricings">Compare plan features ${icon('external')}</a>`)+
      card('AI credits','Your plan’s allowance and usage.',`<p>${current.credits.toLocaleString()} ${state.entitlements.plan==='free'?'trial credits planned':'credits per month included in this plan'}.</p><p class="muted">Credit metering and enforcement are not active yet. Extra credit packs will be added after model costs are measured.</p>`)+
      card('Invoices','Your recent Stripe invoices.',`<div id="billing-invoices" aria-live="polite">${enabled&&state.canManage?'Loading invoices…':'No invoices yet.'}</div>`);
      act('[data-cadence]',button=>{cadence=button.dataset.cadence;paint();});
      act('[data-plan]',button=>{
        const id=button.dataset.plan,p=state.plans[id],chosenCadence=cadence;
        W.dialog((live?'Subscribe to ':'Test ')+p.name,`<p>${money(p[chosenCadence])} billed ${chosenCadence==='yearly'?'once a year':'each month'}, plus applicable tax.</p><p>Domain purchases are separate. ${live?'You will review payment details securely on Stripe.':'This is a test checkout. Use Stripe test payment details only.'}</p>`,{label:live?'Continue to Stripe':'Open test checkout',submit:()=>openCheckout(id,chosenCadence)});
      });
      act('#manage-billing',async()=>{const result=await A.request('/api/billing/portal',{method:'POST',body:{}});redirect(result.url,'billing.stripe.com');});
      act('#billing-refresh',async()=>{state=await A.request(state.configured?'/api/billing/refresh':'/api/billing/status',state.configured?{method:'POST',body:{}}:{});paint();});
      act('#resume-checkout',()=>openCheckout(pending.plan,pending.cadence));
      act('#cancel-checkout',async()=>{await A.request('/api/billing/cancel-checkout',{method:'POST',body:{}});state=await A.request('/api/billing/status');paint();});
      if(enabled&&state.canManage)loadInvoices(root.querySelector('#billing-invoices'));
    }
    async function loadInvoices(container){try{const data=await A.request('/api/billing/invoices');if(!container.isConnected)return;container.innerHTML=data.invoices.length?data.invoices.map(item=>`<div class="ws-setting-row"><div><strong>${e(item.number)}</strong><p>${e(date(item.created*1000))} · ${e(item.status||'Pending')} · ${e(money(item.amount,item.currency))}</p></div>${item.url?`<a class="button" href="${e(item.url)}" target="_blank" rel="noopener noreferrer">View invoice ${icon('external')}</a>`:''}</div>`).join(''):'No invoices yet.';}catch(error){if(container.isConnected)container.textContent=error.message;}}
    paint();
  }
  globalThis.DraftmangoBilling={render};
})();
