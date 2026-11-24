/* The builder's suggestions in the chat. Native controls only; no model-supplied HTML is rendered.
   One question card at a time: selecting a suggested answer never sends it. The user submits their
   choice or writes their own answer before continuing. A plan is a short proposal
   the user approves with one button; its full details stay folded away. */
(() => {
  const B=globalThis.DraftmangoBuilderFlow;
  const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
  const label=value=>value.replaceAll('-',' ').replace(/\b\w/g,c=>c.toUpperCase()).replace(/ (\d+)$/,'');

  let questionNumber=0;
  function setControls(root,busy){
    root.hidden=!root.childElementCount||!!root.querySelector('.app-question[data-submitting=true],.app-question[data-answered=true],.app-proposal[data-submitting=true],.app-proposal[data-answered=true]');
    root.querySelectorAll('button,input,textarea').forEach(el=>{
      el.disabled=busy||el.dataset.unavailable==='true'||el.closest('[data-submitting=true]')!==null;
    });
  }

  function question(root,q,answer){
    const id='builder-question-'+(++questionNumber);
    const form=node('form',null,'builder-questions app-question');form.setAttribute('aria-labelledby',id);
    const head=node('div',null,'app-question-head');head.append(node('span','Question'));
    const close=node('button','×','app-question-close');close.type='button';close.setAttribute('aria-label','Dismiss question');head.append(close);
    const body=node('div',null,'app-question-body'),group=node('fieldset');
    const title=node('legend',q.title);title.id=id;group.append(title);
    const choices=node('div',null,'app-choices');
    // Older saved questions (and occasionally providers) include an Other option. The free-text
    // field already supplies that route; never show it as another suggested answer.
    const fallback=/^(?:other(?:\s*\(.*\))?|something else|another option|custom(?: answer| response| option)?)\s*[.!…]*$/i;
    const order=[q.recommended,...q.options.map((_,i)=>i).filter(i=>i!==q.recommended)].filter(i=>!fallback.test(q.options[i]));
    let selected=order[0]??null;
    const radios=[];
    const footer=node('div',null,'app-question-footer');
    const custom=node('div',null,'app-custom-answer');
    const pencil=document.createElementNS('http://www.w3.org/2000/svg','svg');pencil.setAttribute('viewBox','0 0 24 24');pencil.setAttribute('aria-hidden','true');
    const stroke=document.createElementNS('http://www.w3.org/2000/svg','path');stroke.setAttribute('d','m16 3 5 5-13 13H3v-5L16 3ZM14 5l5 5');pencil.append(stroke);
    const field=node('textarea');field.rows=1;field.maxLength=2000;field.placeholder='Or write your own response';field.setAttribute('aria-label','Your answer: '+q.title);
    custom.append(pencil,field);
    const actions=node('div',null,'app-question-actions');
    const skip=node('button','Skip','app-question-skip');skip.type='button';
    const send=node('button','Send','builder-primary app-question-send');send.type='submit';send.setAttribute('aria-label','Send answer');actions.append(skip,send);footer.append(custom,actions);
    const error=node('p',null,'app-question-error');error.hidden=true;error.setAttribute('role','alert');
    const sync=()=>{send.dataset.unavailable=String(selected===null&&!field.value.trim());setControls(root,root.getAttribute('aria-busy')==='true');};
    const resize=()=>{field.style.height='auto';field.style.height=Math.min(field.scrollHeight,96)+'px';};
    field.onfocus=()=>{selected=null;radios.forEach(input=>input.checked=false);sync();};
    field.oninput=()=>{selected=null;radios.forEach(input=>input.checked=false);field.setCustomValidity('');resize();sync();};
    field.onkeydown=event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();if(!send.disabled)form.requestSubmit(send);}};
    order.forEach((i,position)=>{
      const row=node('label',null,'builder-answer');
      const input=node('input');input.type='radio';input.name=id+'-answer';input.value=String(i);input.checked=i===selected;
      const number=node('span',String(position+1),'app-answer-number');number.setAttribute('aria-hidden','true');
      const copy=node('span',null,'app-answer-label');copy.append(node('span',q.options[i]));
      if(i===q.recommended)copy.append(node('small',' (Recommended)'));
      const arrow=node('span','→','app-answer-arrow');arrow.setAttribute('aria-hidden','true');
      input.onchange=()=>{selected=i;field.value='';field.setCustomValidity('');field.style.height='';sync();};
      row.append(input,number,copy,arrow);choices.append(row);radios.push(input);
    });
    group.append(choices);body.append(group);form.append(head,body,error,footer);
    const resume=node('button','Answer question','app-question-resume');resume.type='button';resume.hidden=true;
    close.onclick=()=>{form.hidden=true;resume.hidden=false;resume.focus();};
    resume.onclick=()=>{form.hidden=false;resume.hidden=true;(radios.find(input=>input.checked)||field).focus();};
    form.onkeydown=event=>{
      if(event.key==='Escape'){event.preventDefault();close.click();}
      else if(event.target.tagName!=='TEXTAREA'&&/^[1-4]$/.test(event.key)&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
        const radio=radios[Number(event.key)-1];if(radio){event.preventDefault();radio.click();radio.focus();}
      }
    };
    const submit=async value=>{
      if(root.getAttribute('aria-busy')==='true'||form.dataset.submitting==='true')return;
      if(!value){field.setCustomValidity('Choose an answer or write your own.');field.reportValidity();return;}
      error.hidden=true;form.dataset.submitting='true';form.setAttribute('aria-busy','true');setControls(root,true);
      try{const sent=await answer(q.title+'\n'+value);if(sent!==false)form.dataset.answered='true';}
      catch{error.textContent='Your answer could not be sent. Please try again.';error.hidden=false;}
      finally{delete form.dataset.submitting;form.setAttribute('aria-busy','false');if(form.parentElement===root)sync();}
    };
    form.onsubmit=event=>{event.preventDefault();submit(selected===null?field.value.trim():q.options[selected]);};
    skip.onclick=()=>submit('Skip this question for now. Leave this detail unconfirmed.');
    root.append(form,resume);sync();
  }

  function proposal(root,plan,{build,revise}){
    const card=node('section',null,'builder-plan app-proposal');card.setAttribute('aria-label','Proposed plan');
    const head=node('div',null,'app-run-head');head.append(node('span','Review plan'));
    const body=node('div',null,'app-proposal-body');
    const meta=node('p',`Proposed design · ${label(plan.templateId)}`,'app-proposal-meta');
    const details=node('details',null,'builder-plan-section app-proposal-details');details.append(node('summary','Pages and details'));
    details.append(node('p','Planned pages are requirements for the build. Existing pages and connected features are checked separately.','app-plan-scope-note'));
    const facts=node('dl');
    for(const [name,key] of [['Offering','offering'],['Audience','audience'],['Goal','goal'],['Region','region'],['Content','content'],['Brand','brand']])if(plan[key])facts.append(node('dt',name),node('dd',plan[key]));
    details.append(facts);
    for(const [name,items] of [['Planned pages',plan.pages],['Journeys',plan.workflows],['Connections needed',plan.connections],['Assumptions',plan.assumptions]]){
      if(!items.length)continue;details.append(node('h5',name+' · '+items.length));const list=node('ul');items.forEach(text=>list.append(node('li',text)));details.append(list);
    }
    let storeScope;
    if(plan.kind==='store'){
      const supported=B.storeSupport(plan),store=plan.store;
      storeScope=node('p',supported?'Draft store · review setup before taking orders.':'Design only · this design’s store workflow needs a connection.','app-store-scope');
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
    const go=node('button','Build','builder-primary');go.type='button';go.setAttribute('aria-label','Build website');go.onclick=async()=>{
      if(root.getAttribute('aria-busy')==='true'||card.dataset.submitting==='true')return;
      card.dataset.submitting='true';setControls(root,true);
      try{if(await build()!==false)card.dataset.answered='true';}
      catch{error.textContent='The build could not start. Please try again.';error.hidden=false;}
      finally{delete card.dataset.submitting;if(card.parentElement===root)setControls(root,root.getAttribute('aria-busy')==='true');}
    };
    const change=node('button','Adjust','builder-secondary');change.type='button';change.onclick=()=>revise();
    actions.append(go,change);
    const error=node('p',null,'app-question-error');error.hidden=true;error.setAttribute('role','alert');body.append(node('h3',plan.name),meta);if(storeScope)body.append(storeScope);body.append(details);card.append(head,body,error,actions);root.append(card);
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
    card.append(node('p',value?.message||(value?.store?'Your website and store are connected. Review these steps before opening for orders.':'The website is built. Prepare its draft store to carry your confirmed details into store management.')));
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
    if(root.dataset.signature===signature){setControls(root,busy);root.setAttribute('aria-busy',String(busy));return;}
    root.dataset.signature=signature;root.replaceChildren();root.setAttribute('aria-busy',String(busy));
    if(data.phase==='discovery'&&data.questions.length)question(root,data.questions[0],answer);
    else if(data.phase==='review')proposal(root,data.plan,{build,revise});
    else if(data.phase==='built'){checklist(root,data.checks);if(B.storeSupport(data.plan))handoff(root,storeState,actions);}
    root.hidden=!root.childElementCount;
    setControls(root,busy);
  }
  globalThis.DraftmangoBuilderPrompts=Object.freeze({render});
})();
