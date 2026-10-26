import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createServer} from '../serve.mjs';
import '../dist/dashboard-model.js';

test('billing proxy preserves signed webhook bytes and blocks cross-origin browser requests',async t=>{
 const requests=[];
 const django=http.createServer(async(req,res)=>{const chunks=[];for await(const chunk of req)chunks.push(chunk);requests.push({path:req.url,signature:req.headers['stripe-signature'],raw:Buffer.concat(chunks).toString()});res.writeHead(200,{'Content-Type':'application/json'});res.end('{"received":true}');});
 django.listen(0,'127.0.0.1');await once(django,'listening');
 const original=process.env.DJANGO_PORT;process.env.DJANGO_PORT=String(django.address().port);
 const server=createServer();server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(()=>{server.closeAllConnections();server.close();django.closeAllConnections();django.close();if(original===undefined)delete process.env.DJANGO_PORT;else process.env.DJANGO_PORT=original;});
 const base='http://127.0.0.1:'+server.address().port,raw='{ "id" : "evt_example", "data": {} }';
 const response=await fetch(base+'/api/billing/webhook',{method:'POST',headers:{'Content-Type':'application/json','Stripe-Signature':'t=123,v1=signature'},body:raw});
 assert.equal(response.status,200);assert.equal(requests[0].raw,raw);assert.equal(requests[0].signature,'t=123,v1=signature');
 assert.equal((await fetch(base+'/api/billing/checkout',{method:'POST',headers:{Origin:'https://foreign.example','Content-Type':'application/json'},body:'{}'})).status,403);
 assert.equal(requests.length,1);
});
test('paid-plan sign-in opens billing while keeping idea and project handoffs intact',()=>{
 const D=globalThis.DraftmangoDashboard;
 assert.equal(D.accountDestination(new URLSearchParams({plan:'pro',billing:'yearly'})),'/dashboard#settings/billing');
 assert.match(D.accountDestination(new URLSearchParams({plan:'pro',idea:'A flower shop'})),/^\/workspace#idea=/);
 assert.match(D.accountDestination(new URLSearchParams({plan:'pro',project:'saved-project'})),/project=saved-project/);
 assert.equal(D.accountDestination(new URLSearchParams({plan:'untrusted'})),'/dashboard');
});
