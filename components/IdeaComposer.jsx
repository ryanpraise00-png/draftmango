"use client";
import {useEffect,useRef} from "react";

export default function IdeaComposer(){
 const field=useRef(null);
 useEffect(()=>{try{field.current.value=localStorage.getItem('draftmango-homepage-idea-v1')||'';}catch{}},[]);
 function update(){try{localStorage.setItem('draftmango-homepage-idea-v1',field.current.value);}catch{}}
 return <div id="idea" className="dm-idea">
   <form onSubmit={event=>event.preventDefault()} className="ws-composer">
     <label className="sr-only" htmlFor="idea-input">Your website idea</label>
     <textarea ref={field} id="idea-input" onInput={update} rows={3} maxLength={12000} placeholder="Your website idea…" aria-describedby="builder-status"/>
     <div className="home-composer-actions">
       <button type="submit" className="ws-send" disabled aria-label="AI builder unavailable"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20V4m-6 6 6-6 6 6"/></svg></button>
     </div>
   </form>
   <p id="builder-status" className="home-composer-error" role="status">AI builder unavailable. <a href="/dashboard">Open your saved projects</a>.</p>
 </div>;
}
