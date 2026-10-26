import {build} from 'esbuild';
import path from 'node:path';
import {createRequire} from 'node:module';
import './dist/project-format.js';
const require=createRequire(import.meta.url);
const allowed=new Set(['react','react-dom','react-dom/client','react/jsx-runtime','react/jsx-dev-runtime']);
process.once('message', async ({files}) => {
  try {
    if(!globalThis.DraftmangoProject.valid(files))throw new Error('Invalid source files.');
    const source=globalThis.DraftmangoProject.scaffold(files);
    const result=await build({entryPoints:['src/main.jsx'],bundle:true,write:false,outdir:'/output',format:'iife',platform:'browser',target:['es2022'],jsx:'automatic',minify:true,sourcemap:false,logLevel:'silent',define:{'process.env.NODE_ENV':'"production"'},legalComments:'inline',plugins:[{
      name:'project-files',setup(api){
        api.onResolve({filter:/.*/,namespace:'project'},args=>{
          if(allowed.has(args.path))return {path:require.resolve(args.path)};
          if(args.kind==='url-token' || args.kind==='import-rule') {
            if(/^(https:\/\/|data:|#)/.test(args.path))return {path:args.path,external:true};
          }
          if(!args.path.startsWith('.'))throw new Error('Unsupported import "'+args.path+'". Use project-relative files, React or React DOM.');
          const resolved=path.posix.normalize(path.posix.join(path.posix.dirname(args.importer),args.path));
          if(resolved.startsWith('../') || !globalThis.DraftmangoProject.safePath(resolved))throw new Error('Imports must remain inside the project.');
          const name=[resolved,...['.jsx','.js','.tsx','.ts','.json','.css','/index.jsx','/index.js'].map(ext=>resolved+ext)].find(n=>Object.hasOwn(source,n));
          if(!name)throw new Error('Missing project file: '+resolved);
          return {path:name,namespace:'project'};
        });
        api.onResolve({filter:/^src\/main\.jsx$/},()=>({path:'src/main.jsx',namespace:'project'}));
        api.onLoad({filter:/.*/,namespace:'project'},args=>({contents:source[args.path],loader:({'.jsx':'jsx','.js':'jsx','.tsx':'tsx','.ts':'ts','.css':'css','.json':'json','.svg':'dataurl','.txt':'text'})[path.posix.extname(args.path)] || 'text'}));
      }
    }]});
    const js=result.outputFiles.find(f=>f.path.endsWith('.js'))?.text || '';
    const css=result.outputFiles.find(f=>f.path.endsWith('.css'))?.text || '';
    if(!js || js.length+css.length>3*1024*1024)throw new Error('The compiled website exceeds its size limit.');
    let html=source['index.html'];
    if(!/<html[\s>]/i.test(html)||!/<\/body>/i.test(html)||!/<(?:div|main)[^>]*\bid=["']root["']/i.test(html))throw new Error('index.html needs a complete document with a root element.');
    html=html.replace(/<script\b[^>]*\bsrc=["']\/?(?:\.\/)?src\/main\.jsx["'][^>]*>\s*<\/script>/gi,'');
    if(/<script\b[^>]*\bsrc=/i.test(html))throw new Error('Import JavaScript from src/main.jsx rather than external script tags.');
    const publicHTML=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/assets/site.css"></head>').replace(/<\/body>/i,'<script src="/assets/site.js" defer></script></body>');
    const inline=html.replace(/<\/head>/i,`<link rel="stylesheet" href="data:text/css;base64,${Buffer.from(css).toString('base64')}"></head>`).replace(/<\/body>/i,`<script src="data:text/javascript;base64,${Buffer.from(js).toString('base64')}" defer></script></body>`);
    process.send({ok:true,result:{framework:'react',html:inline,files:{'index.html':publicHTML,'assets/site.css':css,'assets/site.js':js}}});
  } catch(error) {
    const message=error.errors?.map(e=>`${e.location?.file?.replace(/^project:/,'') || 'Source'}:${e.location?.line || 1}: ${e.text}`).slice(0,6).join('\n') || error.message;
    process.send({ok:false,error:message.slice(0,3000)});
  }
});
