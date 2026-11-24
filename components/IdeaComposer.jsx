"use client";
import {useEffect,useRef,useState} from "react";
import {loadController} from "./PageControllers";

export default function IdeaComposer(){
 const form=useRef(null),field=useRef(null);
 const [ready,setReady]=useState(false),[hasIdea,setHasIdea]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
   let cancelled=false;
   try{field.current.value=localStorage.getItem('draftmango-homepage-idea-v1')||'';setHasIdea(!!field.current.value.trim());}catch{}
   (async()=>{
     await loadController('/composer-intent.js');
     if(cancelled)return;
     setReady(true);
   })().catch(()=>{if(!cancelled)setError('The composer could not load. Refresh the page to try again.');});
   return()=>{cancelled=true;};
 },[]);
 function update(){const value=field.current.value;setHasIdea(!!value.trim());try{localStorage.setItem('draftmango-homepage-idea-v1',value);}catch{}}
 function submit(event){
   event.preventDefault();if(!ready||!field.current.value.trim())return;
   try{
     const idea=field.current.value.trim();
     const draft=globalThis.DraftmangoComposerIntent.save({idea});
     location.href='/auth#'+new URLSearchParams({idea:idea.slice(0,1200),draft,mode:'signup'});
   }catch{setError('Your browser could not save this draft. Free some browser storage and try again; your prompt is still here.');}
 }
 return <div id="idea" className="dm-idea">
   <form ref={form} onSubmit={submit} className="ws-composer">
     <label className="sr-only" htmlFor="idea-input">Describe what you would like to build</label>
     <textarea ref={field} id="idea-input" onInput={update} rows={3} maxLength={12000} required placeholder="Describe a website, app, or feature you want to build…" onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();if(field.current.value.trim())form.current.requestSubmit();}}}/>
     <div className="home-composer-actions">
       <button type="submit" className="ws-send" disabled={!hasIdea||!ready} aria-label="Send build request"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20V4m-6 6 6-6 6 6"/></svg></button>
     </div>
   </form>
   {error&&<p className="home-composer-error" role="alert">{error}</p>}
 </div>;
}
