(() => {
  'use strict';
  const labels={connecting:'Thinking',directing:'Planning the website',building:'Building the website',planning:'Thinking',writing:'Working on your request',checking:'Finishing the response'};
  const seconds=duration=>Math.max(1,Math.round(duration/1000));
  function requestMode(project,emptyFiles){
    const files=project.codeDraft||project.files;
    if(!files)return 'create';
    const untouched=Object.keys(files).length===Object.keys(emptyFiles).length&&Object.entries(emptyFiles).every(([name,content])=>files[name]===content);
    return untouched&&project.ai?.state!=='ready'?'create':'edit';
  }
  function duration(ms){const s=seconds(ms);return s<60?`${s}s`:`${Math.floor(s/60)}m ${s%60}s`;}
  function history(messages,prompt){
    const prior=messages.filter(m=>!m.initial&&!m.notice&&['user','assistant'].includes(m.role)).slice();
    if(prior.at(-1)?.role==='user'&&prior.at(-1).text.trim()===prompt.trim())prior.pop();
    let budget=96000;const selected=[];
    for(const message of prior.slice(-40).reverse()){
      const text=message.text.slice(0,message.role==='user'?12000:6000);
      if(text.length>budget)break;budget-=text.length;selected.unshift({role:message.role,text});
    }
    return selected;
  }
  function activity(value){
    if(!value||!Number.isFinite(value.durationMs)||value.durationMs<0||!Array.isArray(value.phases))return null;
    return {durationMs:Math.min(value.durationMs,86400000),phases:[...new Set(value.phases.filter(p=>Object.hasOwn(labels,p)))].slice(0,8),plan:typeof value.plan==='string'?value.plan.slice(0,3000):''};
  }
  function inline(parent,text){
    const token=/\*\*([^*\n]+)\*\*|`([^`\n]+)`|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g;let last=0;
    for(const match of text.matchAll(token)){
      parent.append(document.createTextNode(text.slice(last,match.index)));
      const node=document.createElement(match[1]?'strong':match[2]?'code':'a');node.textContent=match[1]||match[2]||match[3];
      if(node.tagName==='A'){node.href=match[4];node.target='_blank';node.rel='noopener noreferrer';}
      parent.append(node);last=match.index+match[0].length;
    }
    parent.append(document.createTextNode(text.slice(last)));
  }
  function render(root,text){
    root.replaceChildren();const lines=String(text).split('\n');let paragraph=[],list=null,code=null;
    const flush=()=>{if(paragraph.length){const p=document.createElement('p');inline(p,paragraph.join('\n'));root.append(p);paragraph=[];}list=null;};
    for(const line of lines){
      if(/^\s*```/.test(line)){flush();if(code){root.append(code);code=null;}else{code=document.createElement('pre');code.append(document.createElement('code'));}continue;}
      if(code){code.firstChild.append(document.createTextNode(line+'\n'));continue;}
      if(!line.trim()){flush();continue;}
      const item=line.match(/^\s*(?:([-*])|\d+\.)\s+(.+)$/);
      if(item){if(paragraph.length)flush();const type=item[1]?'UL':'OL';if(!list||list.tagName!==type){list=document.createElement(type);root.append(list);}const li=document.createElement('li');inline(li,item[2]);list.append(li);continue;}
      list=null;paragraph.push(line.replace(/^#{1,4}\s+/,''));
    }
    flush();if(code)root.append(code);
  }
  function renderActivity(value){
    const data=activity(value);if(!data)return null;
    const details=document.createElement('details');details.className='message-activity';
    const summary=document.createElement('summary');summary.textContent='Worked for '+duration(data.durationMs);details.append(summary);
    if(data.plan){const plan=document.createElement('p');plan.textContent=data.plan;details.append(plan);}
    const list=document.createElement('ul');
    for(const label of [...new Set(data.phases.map(p=>labels[p]))]){const item=document.createElement('li');item.textContent=label;list.append(item);}
    details.append(list);return details;
  }
  globalThis.DraftmangoConversation=Object.freeze({requestMode,history,activity,render,renderActivity,duration,labels});
})();
