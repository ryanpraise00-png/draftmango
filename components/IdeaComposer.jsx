"use client";
import {useEffect,useState} from "react";
export default function IdeaComposer(){const [idea,setIdea]=useState('');
 useEffect(()=>{try{setIdea(localStorage.getItem('draftmango-homepage-idea-v1')||'');}catch{}},[]);
 function update(value){setIdea(value);try{localStorage.setItem('draftmango-homepage-idea-v1',value);}catch{}}
 function submit(e){e.preventDefault();if(!idea.trim())return;location.href='/auth#'+new URLSearchParams({idea:idea.trim(),mode:'signup'});}
 return <div id="idea" className="dm-idea"><form onSubmit={submit} className="dm-composer"><label className="sr-only" htmlFor="idea-input">Describe your website</label><textarea id="idea-input" value={idea} onChange={e=>update(e.target.value)} rows={2} maxLength={1200} required placeholder="Describe the website you have in mind…" onKeyDown={e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();e.currentTarget.form.requestSubmit();}}}/><div><a href="/templates">Or choose a template</a><button className="btn btn-primary" type="submit">Make it real</button></div></form><p className="dm-composer-note">Start with a design. Make every detail your own.</p></div>;
}
