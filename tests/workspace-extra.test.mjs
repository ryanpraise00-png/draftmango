import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

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

test('credit ring never presents a plan allowance as a remaining balance', async () => {
  await import('../web/workspace-credits.js');
  const credits=globalThis.DraftmangoCredits;
  for(const active of [false,true]){
    const value=credits.details({entitlements:{plan:'basic',creditAllowance:1000,creditMeteringActive:active},plans:{basic:{name:'Basic'}}});
    assert.equal(value.allowance,1000);
    assert.equal(value.remaining,null);
    assert.equal(value.tracking,active);
    assert.equal(value.plan,'Basic');
  }
  for(const allowance of [undefined,null,-1,'500',Infinity]){
    assert.equal(credits.details({entitlements:{creditAllowance:allowance}}).allowance,null);
  }
  assert.equal(credits.details(null).remaining,null);
  assert.equal(credits.details({entitlements:{plan:'free',creditAllowance:500}}).trial,true);
});
