"""Import Draftmango application copies into editable React components; never edit the purchase."""
from pathlib import Path
from html.parser import HTMLParser
import json,re,hashlib
ROOT=Path(__file__).resolve().parent.parent
BASE="https://draftmango.com/draftmango/"
VOID=set("area base br col embed hr img input link meta param source track wbr".split())
BOOL=set("allowfullscreen async autofocus autoplay checked controls default defer disabled formnovalidate hidden inert ismap loop multiple muted nomodule novalidate open playsinline readonly required reversed selected itemscope".split())
ATTR={"class":"className","for":"htmlFor","tabindex":"tabIndex","readonly":"readOnly","autofocus":"autoFocus","maxlength":"maxLength","minlength":"minLength","colspan":"colSpan","rowspan":"rowSpan","srcset":"srcSet","crossorigin":"crossOrigin","viewbox":"viewBox","preserveaspectratio":"preserveAspectRatio","gradientunits":"gradientUnits","gradienttransform":"gradientTransform","patternunits":"patternUnits","patterncontentunits":"patternContentUnits","patterntransform":"patternTransform","markerwidth":"markerWidth","markerheight":"markerHeight","markerunits":"markerUnits","refx":"refX","refy":"refY","filterunits":"filterUnits","stddeviation":"stdDeviation","basefrequency":"baseFrequency","numoctaves":"numOctaves","attributename":"attributeName","keytimes":"keyTimes","keysplines":"keySplines","calcmode":"calcMode","repeatcount":"repeatCount","fetchpriority":"fetchPriority","formaction":"formAction","autocomplete":"autoComplete","autoplay":"autoPlay","playsinline":"playsInline","allowfullscreen":"allowFullScreen","srcdoc":"srcDoc","xlink:href":"xlinkHref"}
SVG={s.lower():s for s in "clipPath linearGradient radialGradient foreignObject feBlend feColorMatrix feComponentTransfer feComposite feConvolveMatrix feDiffuseLighting feDisplacementMap feDistantLight feDropShadow feFlood feFuncA feFuncB feFuncG feFuncR feGaussianBlur feImage feMerge feMergeNode feMorphology feOffset fePointLight feSpecularLighting feSpotLight feTile feTurbulence textPath".split()}
class Parser(HTMLParser):
 def __init__(self):
  super().__init__(convert_charrefs=True);self.root=["fragment",[],[]];self.stack=[self.root]
 def handle_starttag(self,tag,attrs):
  node=[tag,attrs,[]];self.stack[-1][2].append(node)
  if tag not in VOID:self.stack.append(node)
 def handle_startendtag(self,tag,attrs):self.stack[-1][2].append([tag,attrs,[]])
 def handle_endtag(self,tag):
  for i in range(len(self.stack)-1,0,-1):
   if self.stack[i][0]==tag:self.stack=self.stack[:i];break
 def handle_data(self,data):self.stack[-1][2].append(data)
def find(node,tag):
 if isinstance(node,str):return None
 if node[0]==tag:return node
 for child in node[2]:
  match=find(child,tag)
  if match:return match
def asset(v):return v.replace("../assets/",BASE+"assets/").replace("../photos/",BASE+"photos/")
def style(v):
 result={}
 for pair in v.split(";"):
  if ":" not in pair:continue
  k,val=pair.split(":",1);k=k.strip();val=asset(val.strip())
  if not k or not val:continue
  if not k.startswith("--"):k=re.sub(r"-([a-z])",lambda m:m[1].upper(),k)
  result[k]=val.replace("!important","").strip()
 return result
def jsx(node,pages):
 if isinstance(node,str):return "" if not node.strip() else "{"+json.dumps(node,ensure_ascii=False)+"}"
 tag,attrs,children=node
 if tag in ["script","noscript"]:return ""
 tag=SVG.get(tag,tag);parts=[]
 for k,v in attrs:
  if k.startswith("on"):continue
  if k.startswith("@"):k="x-on:"+k[1:]
  elif k.startswith(":"):k="x-bind:"+k[1:]
  if k=="style":value=style(v or "")
  else:
   value=asset(v or "")
   if k=="href" and value.split("#")[0] in pages:value="#page="+value.split("#")[0].removesuffix(".html")+(("&anchor="+value.split("#")[1]) if "#" in value else "")
   if k in BOOL:value=True
   if k=="checked":k="defaultChecked"
   elif k=="value" and tag in ["input","textarea","select"]:k="defaultValue"
  name=ATTR.get(k,k)
  if "-" in name and not name.startswith(("data-","aria-","x-","--")):name=re.sub(r"-([a-z])",lambda m:m[1].upper(),name)
  if ":" in name or "." in name:parts.append("{..."+json.dumps({name:value},ensure_ascii=False)+"}")
  else:parts.append(name+"={"+json.dumps(value,ensure_ascii=False)+"}")
 opening="<"+tag+(" "+" ".join(parts) if parts else "")
 if tag in VOID:return opening+" />"
 return opening+">"+"".join(jsx(c,pages) for c in children)+"</"+tag+">"
catalog=json.loads((ROOT/"web/template-catalog.json").read_text(encoding="utf8"))
dest=ROOT/"web/draftmango/starters";dest.mkdir(exist_ok=True)
runtime="""import {useEffect} from 'react';
import vendor from './draftmango/vendor.txt';
import main from './draftmango/main.txt';
import swiper from './draftmango/vendor-swiper.txt';
import lightbox from './draftmango/vendor-glightbox.txt';
import gsap from './draftmango/vendor-gsap.txt';
import shop from './draftmango/shop.txt';
export function useTemplateRuntime(page){
 useEffect(()=>{
  const inject=code=>{const script=document.createElement('script');script.textContent=code;document.body.append(script);script.remove();};
  if(!window.DraftmangoVendor){
   [vendor,swiper,lightbox,gsap,shop].forEach(inject);
   window.DraftmangoVendor.load=(name)=>window.DraftmangoVendor.ready?.includes(name)?Promise.resolve(window.DraftmangoVendor):Promise.reject(new Error('Optional feature '+name+' is not connected in this starter.'));
  }
  inject(main);
  document.querySelectorAll('.nav-link[href]').forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#page='+page));
  window.scrollTo(0,0);
  const anchor=new URLSearchParams(location.hash.slice(1)).get('anchor');
  if(anchor)document.getElementById(anchor)?.scrollIntoView();
  return ()=>{const root=document.getElementById('template-page');if(root)window.DraftmangoVendor?.Alpine?.destroyTree(root);};
 },[page]);
}
"""
for t in catalog:
 files=[ROOT/"web/draftmango/previews"/t["file"],*sorted((ROOT/"web/draftmango/previews").glob("demo-"+t["id"]+"-*.html"))]
 names={f.name for f in files};project={};links=[];shared={}
 for i,file in enumerate(files):
  parser=Parser();parser.feed(file.read_text(encoding="utf8"))
  if i==0:
   head=find(parser.root,"head")
   for node in head[2]:
    if isinstance(node,list) and node[0]=="link":
     a=dict(node[1])
     if a.get("rel")=="stylesheet":links.append(asset(a["href"]))
  body=find(parser.root,"body")
  chunks=[];used=[]
  for child in body[2]:
   code=jsx(child,names)
   if isinstance(child,list) and child[0] in ["header","footer"]:
    def normalise(m):
     classes=json.loads(m[1]);return "className={"+json.dumps(" ".join(w for w in classes.split() if w!="active"),ensure_ascii=False)+"}"
    code=re.sub(r'className=\{("(?:[^"\\]|\\.)*")\}',normalise,code)
    key=hashlib.sha256(code.encode()).hexdigest()
    if key not in shared:
     component="Frame"+str(len(shared));shared[key]=component
     project["src/shared/"+component+".jsx"]="export default function "+component+"(){return "+code+";}"
    component=shared[key];used.append(component);chunks.append("<"+component+" />")
   else:chunks.append(code)
  project["src/pages/Page"+str(i)+".jsx"]="\n".join("import "+component+" from '../shared/"+component+".jsx';" for component in dict.fromkeys(used))+"\nexport default function Page"+str(i)+"(){return <>"+''.join(chunks)+"</>;}"

 imports="\n".join("import Page"+str(i)+" from './pages/Page"+str(i)+".jsx';" for i in range(len(files)))
 routes=",".join(json.dumps(f.stem)+":Page"+str(i) for i,f in enumerate(files))
 home=json.dumps(files[0].stem)
 project["src/App.jsx"]="import {useState,useEffect} from 'react';\nimport {useTemplateRuntime} from './template-runtime.jsx';\n"+imports+"\nconst pages={"+routes+"};\nexport default function App(){\nconst [page,setPage]=useState(()=>new URLSearchParams(location.hash.slice(1)).get('page')||"+home+");\nuseEffect(()=>{const change=()=>setPage(new URLSearchParams(location.hash.slice(1)).get('page')||"+home+");window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change)},[]);\nuseTemplateRuntime(page);const Page=pages[page]||Page0;return <div id='template-page' key={page}><Page/></div>;\n}"
 project["src/App.jsx"]=project["src/App.jsx"].replace("window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change)","const navigate=e=>{const a=e.target.closest('a[href]');const href=a?.getAttribute('href');if(!href?.startsWith('#page='))return;const next=new URLSearchParams(href.slice(1)).get('page');if(!pages[next])return;e.preventDefault();e.stopPropagation();setPage(next);try{if(location.protocol!=='about:')history.pushState(null,'',href)}catch{}};document.addEventListener('click',navigate,true);window.addEventListener('hashchange',change);window.addEventListener('popstate',change);return()=>{document.removeEventListener('click',navigate,true);window.removeEventListener('hashchange',change);window.removeEventListener('popstate',change)}")
 project["src/styles.css"]="/* Keep the supplied layout. Add project-specific changes here. */\n@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{animation-duration:.01ms!important;transition-duration:.01ms!important}}\n"
 project["src/main.jsx"]="import React from 'react';\nimport {createRoot} from 'react-dom/client';\nimport App from './App.jsx';\nimport './styles.css';\ncreateRoot(document.getElementById('root')).render(<App/>);\n"
 project["index.html"]='<!doctype html><html lang="en" data-demo="'+t["id"]+'"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+t["name"]+'</title>'+''.join('<link rel="stylesheet" href="'+link+'">' for link in links)+'</head><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>'
 demo_scripts=[]
 html=files[0].read_text(encoding="utf8")
 for name in re.findall(r'<script[^>]+src="\.\./assets/js/demos/([^"]+)\.js"',html):
  code=(ROOT/"web/draftmango/assets/js/demos"/(name+".js")).read_text(encoding="utf8")
  project["src/draftmango/"+name+".txt"]=code;demo_scripts.append(name)
 extra="\n".join("import demo"+str(i)+" from './draftmango/"+name+".txt';" for i,name in enumerate(demo_scripts))
 project["src/template-runtime.jsx"]=extra+"\n"+runtime.replace("inject(main);","inject(main);"+''.join("inject(demo"+str(i)+");" for i in range(len(demo_scripts))))

 project["TEMPLATE.md"]="# "+t["name"]+"\n\nImported Draftmango design: "+t["id"]+". Preserve its layout and styling. Editable React pages; shared CSS and imagery at https://draftmango.com/draftmango/.\n\nDemo claims, contact details and products must be reviewed before publishing. Forms, checkout, accounts and other backend features need integration. Keep vendor runtime files intact.\n"
 (dest/(t["id"]+".json")).write_text(json.dumps({"id":t["id"],"name":t["name"],"files":project},ensure_ascii=False),encoding="utf8")
common={}
for name in ["vendor","main","vendor-swiper","vendor-glightbox","vendor-gsap","shop"]:
 code=(ROOT/"web/draftmango/assets/js"/(name+".js")).read_text(encoding="utf8")
 if name=="vendor":code=code.replace('document.currentScript.src.replace(/[^/]*$/,"")',json.dumps(BASE+"assets/js/"))
 if name=="main":
  code=code.replace("Alpine.start();","if (!window.__draftmangoStarted) { Alpine.start(); window.__draftmangoStarted = true; }")
  code=code.replace("document.addEventListener('DOMContentLoaded', () => {","const startReady = () => {")
  code=code.replace("else parts.then(run);\n    });","else parts.then(run);\n    }; if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',startReady,{once:true}); else startReady();")
 common["src/draftmango/"+name+".txt"]=code
(dest/"runtime.json").write_text(json.dumps(common,ensure_ascii=False),encoding="utf8")
print("Imported",len(catalog),"Draftmango families and their associated pages as React sources.")


import subprocess
subprocess.run(['node',str(ROOT/'scripts/minify-draftmango-runtime.mjs')],cwd=str(ROOT),check=True)
