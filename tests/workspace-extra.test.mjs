import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {validateInput, modelContent} from '../server/ai.mjs';
import {creationContext} from '../server/design-coordinator.mjs';

test('attachments stay structured for both design stages and never duplicate image bytes in text', () => {
  const input=validateInput({mode:'create',prompt:'A studio site',projectContext:'Use our editorial voice',references:[{name:'notes.txt',type:'text/plain',data:'Avoid generic cards.'},{name:'reference.png',type:'image/png',data:'data:image/png;base64,aGVsbG8='}]});
  const content=modelContent(creationContext(input),'openai');
  assert.equal(content[1].type,'input_image');
  assert.equal(content[1].image_url,'data:image/png;base64,aGVsbG8=');
  assert.ok(content[0].text.includes('editorial voice'));
  assert.ok(content[0].text.includes('Avoid generic cards.'));
  assert.ok(!content[0].text.includes('aGVsbG8='));
  assert.equal(modelContent(input,'anthropic')[1].type,'image');
  assert.throws(()=>modelContent(input,'xai'),/require OpenAI or Claude/);
});

test('reference limits reject remote URLs, mismatched MIME and oversized context', () => {
  const base={mode:'create',prompt:'A site'};
  for(const data of ['https://example.test/a.png','data:text/html;base64,aGVsbG8=','data:image/png;base64,%%%']) assert.throws(()=>validateInput({...base,references:[{name:'reference.png',type:'image/png',data}]}));
  assert.throws(()=>validateInput({...base,references:[{name:'a',type:'text/plain',data:'a'.repeat(1024*1024+1)}]}));
  assert.throws(()=>validateInput({...base,projectContext:'a'.repeat(16001)}));
});

test('nested local JS/CSS references are resolved without fetching project or parent URLs',async()=>{
  const context={globalThis:null,Blob,TextEncoder,document:{}};context.globalThis=context;context.DraftmangoCode={buildDocument:files=>files['index.html']};
  runInNewContext(await readFile(new URL('../web/workspace-files.js',import.meta.url),'utf8'),context);
  const F=context.DraftmangoFiles,files={'index.html':'<script type="module" src="src/main.js"></script>','src/main.js':'import {name} from "./name.js"; document.title=name;','src/name.js':'export const name="Studio";','styles.css':'','app.js':''};
  const html=context.DraftmangoCode.buildDocument(files);
  assert.ok(html.includes('src="data:text/javascript'));
  assert.ok(decodeURIComponent(F.sources(files)('src/main.js')).includes('data:text/javascript'));
  for(const path of ['../secret.txt','/app.js','.env','src/../../file.js'])assert.equal(F.safePath(path),false);
  assert.equal(F.safePath('src/components/header.js'),true);
  const zip=new Uint8Array(await F.zip(files).arrayBuffer());
  assert.deepEqual([...zip.slice(0,4)],[80,75,3,4]);
});
