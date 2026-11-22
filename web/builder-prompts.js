/* Native controls; no model-supplied HTML is rendered. */
(() => {
  const B=globalThis.DraftmangoBuilderFlow;
  const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
  function render(root,state,{answer,build,revise},busy=false){
    const data=B.read(state);
    if(!data){root.replaceChildren();root.hidden=true;return;}
    const signature=JSON.stringify(data);
    if(root.dataset.signature===signature){root.querySelectorAll('button,input,textarea').forEach(el=>el.disabled=busy);root.setAttribute('aria-busy',String(busy));return;}
    root.dataset.signature=signature;root.replaceChildren();root.hidden=false;root.setAttribute('aria-busy',String(busy));
    if(data.phase==='discovery'&&data.questions.length){
      const form=node('form',null,'builder-questions');
      form.append(node('p','A few details before we build','builder-prompt-title'));
      data.questions.forEach((q,i)=>{
        const group=node('fieldset');group.append(node('legend',q.title));
        const options=[...q.options,'Something else'];
        const custom=node('textarea');custom.placeholder='Your answer';custom.rows=2;custom.maxLength=2000;custom.hidden=true;custom.setAttribute('aria-label','Custom answer: '+q.title);
        options.forEach((value,j)=>{
          const label=node('label',null,'builder-answer');const radio=node('input');radio.type='radio';radio.name='question-'+i;radio.value=String(j);radio.required=true;
          const copy=node('span',value);if(j===q.recommended){const hint=node('small','Suggested');copy.append(hint);}
          label.append(radio,copy);group.append(label);
          radio.onchange=()=>{custom.hidden=j!==q.options.length;custom.required=!custom.hidden;if(!custom.hidden)custom.focus();};
        });
        group.append(custom);form.append(group);
      });
      const submit=node('button','Continue','builder-primary');submit.type='submit';form.append(submit);
      form.onsubmit=event=>{
        event.preventDefault();if(root.getAttribute('aria-busy')==='true'||!form.reportValidity())return;
        const answers=data.questions.map((q,i)=>{
          const chosen=Number(form.elements['question-'+i].value),custom=form.querySelectorAll('textarea')[i];
          const value=chosen===q.options.length?custom.value.trim():q.options[chosen];
          return {question:q.title,answer:value};
        });
        if(answers.some(a=>!a.answer)){form.querySelectorAll('textarea').forEach(el=>{if(!el.hidden&&!el.value.trim()){el.setCustomValidity('Enter your answer.');el.reportValidity();el.oninput=()=>el.setCustomValidity('');}});return;}
        answer(answers.map(a=>a.question+'\n'+a.answer).join('\n\n'));
      };
      root.append(form);
    }else if(data.phase==='review'){
      const card=node('section',null,'builder-plan');card.append(node('h3',data.plan.name),node('p',data.plan.goal));
      const brief=node('dl',null,'builder-plan-facts');
      for(const [label,key] of [['Offering','offering'],['Audience','audience'],['Region','region'],['Content','content'],['Brand','brand'],['Template','templateId']])if(data.plan[key])brief.append(node('dt',label),node('dd',key==='templateId'?data.plan[key].replaceAll('-',' '):data.plan[key]));
      card.append(brief);
      for(const [label,items] of [['Pages',data.plan.pages],['Workflows',data.plan.workflows],['Connections needed',data.plan.connections],['Assumptions to review',data.plan.assumptions]]){
        if(!items.length)continue;const section=node('details',null,'builder-plan-section');section.open=label==='Connections needed';section.append(node('summary',label+' · '+items.length));const list=node('ul');items.forEach(text=>list.append(node('li',text)));section.append(list);card.append(section);
      }
      const actions=node('div',null,'builder-prompt-actions');const confirm=node('button','Build this plan','builder-primary');confirm.type='button';confirm.onclick=()=>build();
      const change=node('button','Change the plan','builder-secondary');change.type='button';change.onclick=()=>revise();actions.append(confirm,change);card.append(actions);root.append(card);
    }else if(data.phase==='built'){
      const remaining=data.checks.filter(c=>c.status!=='passed').length;
      const details=node('details',null,'builder-checklist');details.open=remaining>0;
      details.append(node('summary',remaining?`Completion checklist · ${remaining} items need attention`:'Completion checklist'));
      details.append(node('p','Source checks cover saved code and routes. Live accounts, submissions and checkout need their own connection and end-to-end checks.'));
      for(const check of data.checks){const row=node('div',null,'builder-check');row.dataset.status=check.status;row.append(node('strong',check.label),node('span',check.status==='passed'?'Checked':check.status==='needs-connection'?'Connection needed':'Needs attention'),node('p',check.detail));details.append(row);}
      root.append(details);
    }
    root.querySelectorAll('button,input,textarea').forEach(el=>el.disabled=busy);
  }
  globalThis.DraftmangoBuilderPrompts=Object.freeze({render});
})();
