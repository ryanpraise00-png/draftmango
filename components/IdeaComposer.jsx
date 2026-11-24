"use client";
import {useEffect,useRef,useState} from "react";
import {loadController} from "./PageControllers";

function Icon({name}) {
 const paths={plus:'M12 4v16M4 12h16',up:'M12 20V4m-6 6 6-6 6 6',mic:'M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0ZM5.5 10.5v1a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6'};
 return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name]}/></svg>;
}
export default function IdeaComposer(){
 const form=useRef(null),field=useRef(null),model=useRef(null),mic=useRef(null),picker=useRef(null);
 const [ready,setReady]=useState(false),[hasIdea,setHasIdea]=useState(false),[references,setReferences]=useState([]),[notes,setNotes]=useState(''),[error,setError]=useState('');
 useEffect(()=>{
   let cancelled=false,voice;
   try{field.current.value=localStorage.getItem('draftmango-homepage-idea-v1')||'';setHasIdea(!!field.current.value.trim());}catch{}
   (async()=>{
     for(const src of ['/workspace-model.js','/workspace-common.js','/workspace-ai.js','/workspace-voice.js','/composer-intent.js'])await loadController(src);
     if(cancelled)return;
     picker.current=globalThis.DraftmangoAI.mountModelPicker(model.current,{id:'homepage-model'});
     voice=globalThis.DraftmangoVoice.mount({button:mic.current,field:field.current,form:form.current});
     setReady(true);
   })().catch(()=>{if(!cancelled)setError('The composer could not load. Refresh the page to try again.');});
   return()=>{cancelled=true;voice?.dispose();picker.current?.destroy();globalThis.DraftmangoWorkspace?.closeMenu();};
 },[]);
 function update(){const value=field.current.value;setHasIdea(!!value.trim());try{localStorage.setItem('draftmango-homepage-idea-v1',value);}catch{}}
 function submit(event){
   event.preventDefault();if(!ready||!field.current.value.trim())return;
   try{
     const idea=field.current.value.trim();
     const draft=globalThis.DraftmangoComposerIntent.save({idea,modelId:picker.current.select.value,references,notes});
     location.href='/auth#'+new URLSearchParams({idea:idea.slice(0,1200),draft,mode:'signup'});
   }catch{setError('Your browser could not save this draft. Free some browser storage and try again; your prompt and attachments are still here.');}
 }
 function attach(event){
   const W=globalThis.DraftmangoWorkspace;
   picker.current?.close();
   W.attachmentMenu(event.currentTarget,async files=>{
     try{setReferences(await W.references(files,references));setError('');}catch(error){setError(error.message);}
   },()=>W.dialog('Project notes',`<label for="home-project-notes">Context for your request</label><textarea id="home-project-notes" rows="6" maxlength="6000" placeholder="Background, goals and instructions">${W.e(notes)}</textarea>`,{submit:d=>setNotes(d.querySelector('textarea').value)}),{
     onGithub:()=>W.dialog('Import from GitHub','<p>Sign in to import a public repository into a new project. Your homepage prompt stays saved in this browser.</p>',{label:'Continue to sign in',submit:()=>{location.href='/auth#mode=login';}})
   });
 }
 return <div id="idea" className="dm-idea">
   <form ref={form} onSubmit={submit} className="ws-composer">
     <label className="sr-only" htmlFor="idea-input">Describe what you would like to build</label>
     <textarea ref={field} id="idea-input" onInput={update} rows={3} maxLength={12000} required placeholder="Describe a website, app, or feature you want to build…" onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();if(field.current.value.trim())form.current.requestSubmit();}}}/>
     <div className="ws-reference-chips">{references.map((ref,index)=><span key={index}>{ref.name}<button type="button" onClick={()=>setReferences(items=>items.filter((_,i)=>i!==index))} aria-label={'Remove '+ref.name}>×</button></span>)}{notes&&<span>Project notes<button type="button" onClick={()=>setNotes('')} aria-label="Remove project notes">×</button></span>}</div>
     <div className="ws-composer-tools">
       <button type="button" id="add-context" className="text-button" disabled={!ready} onClick={attach} aria-haspopup="menu" aria-expanded="false" aria-label="Add files, images or GitHub" title="Attach files, images or project notes"><span className="ws-plus"><Icon name="plus"/></span><span>Attach context</span></button>
       <div><span ref={model} className="home-model-slot"/><button ref={mic} type="button" id="prompt-mic" className="text-button ws-voice-button" disabled={!ready} aria-label="Dictate prompt"><Icon name="mic"/></button><button type="submit" className="ws-send" disabled={!hasIdea||!ready} aria-label="Send build request"><Icon name="up"/></button></div>
     </div>
   </form>
   {error&&<p className="home-composer-error" role="alert">{error}</p>}
 </div>;
}
