import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { searchTemplates, templateDetails, templateFiles } from '../server/template-mcp.mjs';

const serverPath = fileURLToPath(new URL('../server/template-mcp.mjs', import.meta.url));

// Talks to the server exactly as an MCP client does: newline-delimited JSON-RPC on stdio.
async function session(messages) {
  const child = spawn(process.execPath, [serverPath], { stdio: ['pipe', 'pipe', 'inherit'] });
  let out = '';
  child.stdout.on('data', chunk => { out += chunk; });
  for (const message of messages) child.stdin.write(JSON.stringify(message) + '\n');
  const expected = messages.filter(message => message.id !== undefined).length;
  for (let i = 0; i < 200 && out.trim().split('\n').filter(Boolean).length < expected; i++) await new Promise(resolve => setTimeout(resolve, 50));
  child.stdin.end();
  return out.trim().split('\n').map(line => JSON.parse(line));
}

test('search uses the builder picker first and returns ranked alternatives', async () => {
  const results = await searchTemplates('independent coffee roaster with an online shop', 4);
  assert.equal(results.length, 4);
  assert.equal(results[0].id, 'cafe-1');
  assert.equal(results[0].recommended, true);
  assert.ok(results.slice(1).every(item => !item.recommended));
  assert.equal((await searchTemplates('law firm', 1))[0].id, 'law-firm-1');
});

test('details list pages with their visible headings and the editing guide', async () => {
  const details = await templateDetails('cafe-1');
  assert.ok(details.pages.length > 5);
  assert.ok(details.pages[0].headings.length > 0);
  assert.match(details.guide, /Preserve its layout/);
  await assert.rejects(templateDetails('no-such-template'), /Unknown template/);
});

test('project files are complete, runnable and self-contained', async () => {
  const result = await templateFiles('cafe-1', 'Ridge Roasters');
  for (const name of ['index.html', 'package.json', 'vite.config.js', 'src/main.jsx', 'src/App.jsx', 'src/styles.css']) assert.equal(typeof result.files[name], 'string', name);
  assert.match(result.files['index.html'], /href="\/draftmango\/assets\/css\/app\.css"/);
  assert.match(result.files['index.html'], /<title>Ridge Roasters<\/title>/, 'the site name replaces the demo title');
  assert.match((await templateFiles('cafe-1', 'A & B <Co>')).files['index.html'], /<title>A &amp; B &lt;Co&gt;<\/title>/);
  assert.ok(!Object.values(result.files).some(text => text.includes('draftmango.com/draftmango')), 'no file depends on the Draftmango server');
  assert.ok(result.assetFiles['public/draftmango/assets/css/app.css'].length > 1_000_000, 'the main stylesheet is included');
  assert.ok(!Object.keys(result.files).some(name => name.startsWith('public/')), 'vendor assets are kept apart from editable source');
  assert.ok(Object.keys(result.binaryFiles).some(name => name.endsWith('.woff2')), 'icon fonts referenced by CSS are included');
  assert.deepEqual(result.missingAssets, []);
});

test('the stdio protocol initializes, lists tools, calls them and rejects unknown methods', async () => {
  const replies = await session([
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } } },
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', id: 2, method: 'tools/list' },
    { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'search_templates', arguments: { brief: 'yoga studio', limit: 2 } } },
    { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'get_template_files', arguments: { id: 'yoga-studio-1' } } },
    { jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'template_details', arguments: { id: 'missing' } } },
    { jsonrpc: '2.0', id: 6, method: 'bogus' },
  ]);
  const byId = Object.fromEntries(replies.map(reply => [reply.id, reply]));
  assert.equal(byId[1].result.serverInfo.name, 'draftmango-templates');
  assert.equal(byId[1].result.protocolVersion, '2025-06-18');
  assert.deepEqual(byId[2].result.tools.map(tool => tool.name), ['search_templates', 'template_details', 'get_template_files', 'validate_template_files']);
  assert.equal(byId[2].result.tools[2]._meta['io.isotris/files'], true);
  assert.equal(byId[3].result.structuredContent.results[0].id, 'yoga-studio-1');
  assert.ok(byId[4].result.structuredContent.files['src/App.jsx']);
  assert.ok(byId[4].result.content[0].text.length < 400, 'file contents stay out of the text a model reads');
  assert.equal(byId[5].result.isError, true);
  assert.equal(byId[6].error.code, -32601);
});
