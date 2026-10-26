/* Portable React project contract shared by the browser and build service. */
(() => {
  const required = ['src/App.jsx','src/main.jsx','src/styles.css'];
  const safePath = name => typeof name === 'string' && name.length <= 180 && /^[A-Za-z0-9_@() .\/-]+$/.test(name) && !name.startsWith('/') && name.split('/').every(p => p && !p.startsWith('.'));
  const isReact = files => !!files && typeof files['src/App.jsx'] === 'string';
  function valid(files) {
    if (!files || Array.isArray(files) || typeof files !== 'object') return false;
    const entries = Object.entries(files);
    return entries.length <= 100 && entries.every(([name,text]) => safePath(name) && /\.(html?|css|[cm]?js|jsx|tsx?|json|md|txt|csv|svg|xml)$/.test(name) && typeof text === 'string' && text.length <= 500000) && entries.reduce((n,[,s]) => n+s.length,0) <= 4*1024*1024 && (isReact(files) ? required : ['index.html','styles.css','app.js']).every(n => typeof files[n] === 'string');
  }
  function scaffold(files = {}, title = 'My website') {
    const escape = text => String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
    return {
      'index.html': `<!doctype html>\n<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title></head><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>\n`,
      'package.json': JSON.stringify({name:'draftmango-website',private:true,version:'1.0.0',type:'module',scripts:{dev:'vite --host 127.0.0.1',build:'vite build',preview:'vite preview --host 127.0.0.1'},dependencies:{react:'19.3.1','react-dom':'19.3.1'},devDependencies:{vite:'8.3.5','@vitejs/plugin-react':'6.1.2'}},null,2)+'\n',
      'vite.config.js': "import {defineConfig} from 'vite';\nimport react from '@vitejs/plugin-react';\nexport default defineConfig({plugins:[react()],base:'./'});\n",
      'src/main.jsx': "import React from 'react';\nimport {createRoot} from 'react-dom/client';\nimport App from './App.jsx';\nimport './styles.css';\ncreateRoot(document.getElementById('root')).render(<App />);\n",
      'src/App.jsx': "export default function App() {\n  return <main><h1>Your next website starts here.</h1><p>Describe what you would like to build.</p></main>;\n}\n",
      'src/styles.css': 'body { margin: 0; font-family: system-ui, sans-serif; }\nmain { max-width: 70rem; margin: auto; padding: 4rem 1.5rem; }\n',
      'README.md': '# Your React website\n\nUse Node.js 22.12 or later.\n\n```sh\nnpm install\nnpm run dev\n```\n\nEdit src/App.jsx and src/styles.css. Run npm run build for deployable files in dist/. React and React DOM are bundled locally, not loaded from a CDN. Draftmango previews compile source with pinned packages and do not execute package scripts or custom build configuration. Additional dependencies require supported build packages.\n',
      ...files
    };
  }
  globalThis.DraftmangoProject = Object.freeze({required,safePath,isReact,valid,scaffold});
})();
