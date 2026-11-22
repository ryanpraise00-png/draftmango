/* The builder's suggestions in the chat. Native controls only; no model-supplied HTML is rendered.
   One question at a time: each suggested answer is a button that sends at once (the recommended one
   first), and "Something else" opens a field for the user's own answer. A plan is a short proposal
   the user approves with one button; its full details stay folded away. */
(() => {
  const B=globalThis.DraftmangoBuilderFlow;
  const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
  const icon=name=>{const i=node('i');i.className='ph-bold ph-'+name;i.setAttribute('aria-hidden','true');return i;};
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
    const other=node('button','Something else','app-choice app-choice--other');other.type='button';other.prepend(icon('pencil-simple'));
    const form=node('form',null,'app-other');form.hidden=true;
    const field=node('input');field.type='text';field.maxLength=2000;field.placeholder='Type your answer';field.setAttribute('aria-label','Your answer: '+q.title);
    const send=node('button',null,'app-send');send.type='submit';send.setAttribute('aria-label','Send answer');send.append(icon('arrow-up'));
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
    const card=node('section',null,'builder-plan custom-panel app-proposal');card.setAttribute('aria-label','Proposed plan');
    const head=node('div',null,'app-run-head');
    const glyph=node('span',null,'custom-glyph custom-glyph--brand');glyph.append(icon('list-checks'));
    const status=node('span','Waiting for you','custom-status custom-status--wait');
    head.append(glyph,node('b','Proposed plan'),status);
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
    const actions=node('div',null,'app-plan-actions builder-prompt-actions');
    const go=node('button','Build it','btn btn-primary app-btn-sm builder-primary');go.type='button';go.prepend(icon('hammer'));go.onclick=()=>build();
    const change=node('button','Adjust','btn app-btn-sm btn-outline-light builder-secondary');change.type='button';change.onclick=()=>revise();
    actions.append(go,change);
    card.append(head,node('h3',plan.name),node('p',plan.goal,'app-proposal-goal'),meta,chips,details,actions);root.append(card);
  }

  function checklist(root,checks){
    const remaining=checks.filter(c=>c.status!=='passed').length;
    const details=node('details',null,'builder-checklist');details.open=remaining>0;
    details.append(node('summary',remaining?`Completion checklist · ${remaining} items need attention`:'Completion checklist'));
    details.append(node('p','Source checks cover saved code and routes. Live accounts, submissions and checkout need their own connection and end-to-end checks.'));
    for(const check of checks){const row=node('div',null,'builder-check');row.dataset.status=check.status;row.append(node('strong',check.label),node('span',check.status==='passed'?'Checked':check.status==='needs-connection'?'Connection needed':'Needs attention'),node('p',check.detail));details.append(row);}
    root.append(details);
  }

  function render(root,state,{answer,build,revise},busy=false){
    const data=B.read(state);
    if(!data){root.replaceChildren();root.hidden=true;return;}
    const signature=JSON.stringify(data);
    if(root.dataset.signature===signature){root.querySelectorAll('button,input,textarea').forEach(el=>el.disabled=busy);root.setAttribute('aria-busy',String(busy));return;}
    root.dataset.signature=signature;root.replaceChildren();root.setAttribute('aria-busy',String(busy));
    if(data.phase==='discovery'&&data.questions.length)question(root,data.questions[0],answer);
    else if(data.phase==='review')proposal(root,data.plan,{build,revise});
    else if(data.phase==='built')checklist(root,data.checks);
    root.hidden=!root.childElementCount;
    root.querySelectorAll('button,input,textarea').forEach(el=>el.disabled=busy);
  }
  globalThis.DraftmangoBuilderPrompts=Object.freeze({render});
})();
