"use client";
import {useEffect,useState} from "react";
import catalog from "./template-catalog.json";
import {templateStart} from "./TemplateLibrary";
export default function TemplatePreview(){
 const [template,setTemplate]=useState(null),[loaded,setLoaded]=useState(false),[mobile,setMobile]=useState(false);
 useEffect(()=>{setTemplate(catalog.find(t=>t.id===new URLSearchParams(location.search).get("template"))||null);setLoaded(true);},[]);
 if(!loaded)return <main className="container"><p>Loading preview…</p></main>;
 if(!template)return <main className="container"><h1>Template not found</h1><a href="/templates">Back to templates</a></main>;
 return <main><header className="dm-preview-head"><div><a href="/templates">All templates</a><h1>{template.name}</h1></div><div><button className="btn custom-btn-ghost" onClick={()=>setMobile(!mobile)} aria-pressed={mobile}>{mobile?"Desktop preview":"Mobile preview"}</button><a className="btn btn-primary" href={templateStart(template)}>Use template</a></div></header><p className="dm-preview-note">Template demonstration · Sample content and photography · Forms and purchases are not connected</p><iframe className="dm-template-frame" style={{maxWidth:mobile?390:"100%"}} src={"/framo/previews/"+template.file} title={template.name+" interactive preview"} sandbox="allow-scripts" /></main>;
}
