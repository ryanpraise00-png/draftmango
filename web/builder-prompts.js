/* The builder's suggestions in the chat. Native controls only; no model-supplied HTML is rendered.
   One question at a time: each suggested answer is a button that sends at once (the recommended one
   first), and "Something else" opens a field for the user's own answer. A plan is a short proposal
   the user approves with one button; its full details stay folded away. */
(() => {
  const B=globalThis.DraftmangoBuilderFlow;
  const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
  const label=value=>value.replaceAll('-',' ').replace(/\b\w/g,c=>c.toUpperCase()).replace(/ (\d+)$/,'');

  function question(root,q,answer){
    const box=node('section',null,'builder-questions app-question');box.setAttribute('aria-label','Question');
    const title=node('h4',q.title);title.id='builder-question-title';box.append(title);
    const choices=node('div',null,'app-choices');choices.setAttribute('role','group');choices.setAttribute('aria-labelledby',title.id);
    const order=[q.recommended,...q.options.map((_,i)=>i).filter(i=>i!==q.recommended)];
    for(const i of order){
      const button=node('button',q.options[i],'app-choice');button.type='button';
      if(i===q.recommended){button.classList.add('is-recommended');button.append(node('small','Recommended'));}
      button.onclick=()=>{if(root.getAttribute('aria-busy')!=='true')answer(q.title+'\n'+q.options[i]);};
      choices.append(button);
    }
    const other=node('button','Something else','app-choice app-choice--other');other.type='button';
    const form=node('form',null,'app-other');form.hidden=true;
    const field=node('input');field.type='text';field.maxLength=2000;field.placeholder='Type your answer';field.setAttribute('aria-label','Your answer: '+q.title);
    const send=node('button','Send','builder-primary app-send');send.type='submit';send.setAttribute('aria-label','Send answer');
    form.append(field,send);
    other.onclick=()=>{form.hidden=false;other.setAttribute('aria-expanded','true');field.focus();};
    form.onsubmit=event=>{
      event.preventDefault();if(root.getAttribute('aria-busy')==='true')return;
      const value=field.value.trim();
      if(!value){field.setCustomValidity('Enter your answer.');field.reportValidity();field.oninput=()=>field.setCustomValidity('');return;}
      answer(q.title+'\n'+value);
    };
    choices.append(other);box.append(choices,form);root.append(box);
  }

  function proposal(root,plan,{build,revise}){
    const card=node('section',null,'builder-plan app-proposal');card.setAttribute('aria-label','Proposed plan');
    const head=node('div',null,'app-run-head');
    const status=node('span','Waiting for you','app-proposal-status');
    head.append(node('b','Proposed plan'),status);
    const pages=plan.pages.length;
    const meta=node('p',`${label(plan.templateId)} template · ${pages} page${pages===1?'':'s'}`,'app-proposal-meta');
    const chips=node('div',null,'app-pages');
    plan.pages.slice(0,6).forEach(page=>chips.append(node('span',page)));
    if(pages>6)chips.append(node('span','+'+(pages-6)+' more','is-more'));
    const details=node('details',null,'builder-plan-section app-proposal-details');details.append(node('summary','Details'));
    const facts=node('dl');
    for(const [name,key] of [['Offering','offering'],['Audience','audience'],['Goal','goal'],['Region','region'],['Content','content'],['Brand','brand']])if(plan[key])facts.append(node('dt',name),node('dd',plan[key]));
    details.append(facts);
    for(const [name,items] of [['Pages',plan.pages],['Journeys',plan.workflows],['Connections needed',plan.connections],['Assumptions',plan.assumptions]]){
      if(!items.length)continue;details.append(node('h5',name+' · '+items.length));const list=node('ul');items.forEach(text=>list.append(node('li',text)));details.append(list);
    }
    let storeScope;
    if(plan.kind==='store'){
      const supported=B.storeSupport(plan),store=plan.store;
      storeScope=node('p',supported?'Building prepares a draft store. Review products, policies and settings before publishing or accepting orders.':'The selected template will be preserved. Its requested store workflow needs a separate connection; building the design will not create a working checkout.','app-store-scope');
      const review=node('details',null,'builder-plan-section');review.append(node('summary','Store details to review'));
      const unknown='Needs your confirmation',facts=node('dl');
      const money=n=>n==null||!store?.currency?unknown:new Intl.NumberFormat(undefined,{style:'currency',currency:store.currency}).format(n/100);
      for(const [label,value]of [['Products',store?.fulfilment],['Currency',store?.currency?.toUpperCase()],['Business country',store?.country],['Support email',store?.supportEmail],['Delivery countries',store?.shippingCountries?.join(', ')],['Flat shipping',money(store?.shippingAmount)],['Tax rate',store?.taxBasisPoints==null?null:store.taxBasisPoints/100+'%']])facts.append(node('dt',label),node('dd',value||unknown));
      review.append(facts);
      for(const p of store?.products||[]){review.append(node('h5',p.name));if(p.description)review.append(node('p',p.description));if(p.category)review.append(node('p','Category: '+p.category));if(p.image){const image=node('a','Supplied product photo');image.href=p.image;image.target='_blank';image.rel='noopener noreferrer';review.append(image);}const list=node('ul');for(const v of p.variants)list.append(node('li',v.label+(v.sku?' · SKU: '+v.sku:'')+' · '+money(v.price)+' · Stock: '+(v.stock??unknown)));if(!p.variants.length)list.append(node('li','Options, prices and stock need review.'));review.append(list);}
      if(!store?.products?.length)review.append(node('p','Add your products in store management. No products, prices or stock will be invented.'));
      details.append(review);
    }
    const actions=node('div',null,'app-plan-actions builder-prompt-actions');
    const go=node('button','Build it','builder-primary');go.type='button';go.onclick=()=>build();
    const change=node('button','Adjust','builder-secondary');change.type='button';change.onclick=()=>revise();
    actions.append(go,change);
    card.append(head,node('h3',plan.name),node('p',plan.goal,'app-proposal-goal'),meta,chips);if(storeScope)card.append(storeScope);card.append(details,actions);root.append(card);
  }

  function checklist(root,checks){
    const remaining=checks.filter(c=>c.status!=='passed').length;
    const details=node('details',null,'builder-checklist');details.open=remaining>0;
    details.append(node('summary',remaining?`Completion checklist · ${remaining} items need attention`:'Completion checklist'));
    details.append(node('p','Source checks cover saved code and routes. Live accounts, submissions and checkout need their own connection and end-to-end checks.'));
    for(const check of checks){const row=node('div',null,'builder-check');row.dataset.status=check.status;row.append(node('strong',check.label),node('span',check.status==='passed'?'Checked':check.status==='needs-connection'?'Connection needed':'Needs attention'),node('p',check.detail));details.append(row);}
    root.append(details);
  }

  function handoff(root,value,actions){
    const card=node('section',null,'builder-plan app-store-handoff');card.setAttribute('aria-label','Store handoff');
    card.append(node('h3',value?.store?'Your draft store':'Prepare your store'));
    card.append(node('p',value?.message||(value?.store?'Your template and store are connected. Review these steps before opening for orders.':'The website is built. Prepare its draft store to carry your confirmed details into store management.')));
    if(value?.readiness){const list=node('ul');for(const step of value.readiness.steps){const row=node('li');row.append(node('span',step.complete?'Complete · ':'To do · '));const link=node(step.section==='publish'?'button':'a',step.label);if(step.section==='publish'){link.type='button';link.className='text-button';link.onclick=actions.publish;}else link.href='/dashboard#store/'+encodeURIComponent(value.store.projectId)+'/'+step.section;row.append(link);list.append(row);}card.append(list);}
    const buttons=node('div',null,'builder-prompt-actions');
    if(value?.store){const manage=node('a','Manage store','builder-primary');manage.href='/dashboard#store/'+encodeURIComponent(value.store.projectId)+'/overview';buttons.append(manage);const preview=node('button','Preview shop','builder-secondary');preview.type='button';preview.onclick=actions.preview;buttons.append(preview);}
    else if(!value?.busy){const prepare=node('button','Prepare draft store','builder-primary');prepare.type='button';prepare.onclick=actions.prepare;buttons.append(prepare);}
    card.append(buttons);root.append(card);
  }
  function render(root,state,actions,busy=false,storeState=null){
    const {answer,build,revise}=actions;
    const data=B.read(state);
    if(!data){root.replaceChildren();root.hidden=true;return;}
    const signature=JSON.stringify([data,storeState]);
    if(root.dataset.signature===signature){root.querySelectorAll('button,input,textarea').forEach(el=>el.disabled=busy);root.setAttribute('aria-busy',String(busy));return;}
    root.dataset.signature=signature;root.replaceChildren();root.setAttribute('aria-busy',String(busy));
    if(data.phase==='discovery'&&data.questions.length)question(root,data.questions[0],answer);
    else if(data.phase==='review')proposal(root,data.plan,{build,revise});
    else if(data.phase==='built'){checklist(root,data.checks);if(B.storeSupport(data.plan))handoff(root,storeState,actions);}
    root.hidden=!root.childElementCount;
    root.querySelectorAll('button,input,textarea').forEach(el=>el.disabled=busy);
  }
  globalThis.DraftmangoBuilderPrompts=Object.freeze({render});
})();
