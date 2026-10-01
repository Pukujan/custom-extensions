'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const core = require('../core.js');
const cases = [];
function test(name, run) { cases.push({ name, run }); }
test('Defaults and invalid types', () => {
  for (const input of [undefined, null, [], false, 'wrong', 42]) assert.deepEqual(core.normalize(input), core.defaults);
  assert.deepEqual(core.normalize({ enabled: 'false', contrast: '100', brightness: NaN, sepia: Infinity }), core.defaults);
});
test('Bounded numeric settings over 10,000 deterministic inputs', () => {
  for (let i = -5000; i < 5000; i++) {
    const s = core.normalize({ contrast: i * 1.37, brightness: -i * 0.71, sepia: i / 3 });
    assert(s.contrast >= 50 && s.contrast <= 150);
    assert(s.brightness >= 50 && s.brightness <= 150);
    assert(s.sepia >= 0 && s.sepia <= 100);
    assert.deepEqual(core.normalize(s), s);
  }
});
test('Prototype inputs are ignored', () => {
  assert.deepEqual(core.normalize(Object.create({ enabled: false, contrast: 150 })), core.defaults);
  const stored = Object.create({ masterEnabled: false, 'site:example.com': { enabled: false } });
  assert.equal(core.resolve(stored, 'example.com').enabled, true);
});
test('URL scheme and store restrictions', () => {
  for (const url of ['brave://settings', 'chrome://newtab', 'file:///tmp/page.html', 'about:blank', 'bad', 'https://chromewebstore.google.com/detail/x', 'https://chrome.google.com/webstore/detail/x']) assert.equal(core.hostname(url), null);
  assert.equal(core.hostname('https://EXAMPLE.com:8080/path?q=1'), 'example.com');
  assert.equal(core.hostname('http://localhost:1234'), 'localhost');
});
test('Host isolation, master precedence and unknown-host disable', () => {
  const stored = { masterEnabled: false, 'site:a.example': { enabled: true, contrast: 130 }, 'site:b.example': { enabled: false, contrast: 60 } };
  assert.equal(core.resolve(stored, 'a.example').enabled, false);
  stored.masterEnabled = true;
  assert.equal(core.resolve(stored, 'a.example').enabled, true);
  assert.equal(core.resolve(stored, 'b.example').enabled, false);
  assert.equal(core.resolve(stored, 'other.example').contrast, 100);
  assert.equal(core.resolve(stored, null).enabled, false);
});
test('MV3 permissions, independent runtime and syntax', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json')));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions.sort(), ['activeTab', 'storage']);
  assert.equal(manifest.host_permissions, undefined);
  assert.deepEqual(manifest.content_scripts[0].matches, ['http://*/*', 'https://*/*']);
  const files = [manifest.background.service_worker, ...manifest.content_scripts[0].js, 'popup.js'];
  for (const file of files) {
    assert(!file.includes('..'));
    assert.equal(spawnSync(process.execPath, ['--check', path.join(root, file)]).status, 0, file);
  }
  for (const icon of Object.values(manifest.icons)) assert(fs.existsSync(path.join(root, icon)));
});
test('Exact upstream bytes inside isolated vendor wrapper', () => {
  const bytes = fs.readFileSync(path.join(root, 'vendor/darkreader.js'));
  const prefix = Buffer.from('// Extension adapter: scope API compatibility stubs away from native chrome.runtime.\n(function () { const chrome = { runtime: {} };\n');
  const suffix = Buffer.from('\n})();\n');
  assert(bytes.subarray(0, prefix.length).equals(prefix));
  assert(bytes.subarray(-suffix.length).equals(suffix));
  const hash = crypto.createHash('sha256').update(bytes.subarray(prefix.length, -suffix.length)).digest('hex');
  assert.equal(hash, require('./vendor-hash.json').upstream_sha256);
  assert(fs.readFileSync(path.join(root, 'vendor/LICENSE'), 'utf8').includes('MIT'));
});
test('Worker uses top-level hostname for cross-origin frames and fails visibly', async () => {
  let handler;
  let failing = false;
  const context = { DarkControl: core, importScripts() {}, chrome: {
    runtime: { onMessage: { addListener(fn) { handler = fn; } } },
    storage: { local: { get: async keys => {
      if (failing) throw new Error('offline');
      assert.deepEqual(Array.from(keys), ['masterEnabled', 'site:top.example']);
      return { 'site:top.example': { contrast: 127 } };
    } } }
  } };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'background.js'), 'utf8'), context);
  const sender = { url: 'https://frame.example', tab: { url: 'https://top.example' } };
  assert.equal(handler({ type: 'unknown' }, sender, () => assert.fail()), false);
  const result = await new Promise(resolve => assert.equal(handler({ type: 'dark-control:get-settings' }, sender, resolve), true));
  assert.equal(result.settings.contrast, 127);
  failing = true;
  const failure = await new Promise(resolve => handler({ type: 'dark-control:get-settings' }, sender, resolve));
  assert(failure.error);
});
test('Content ignores stale settings and restores page on failure', async () => {
  const pending = [];
  const enabled = [];
  let disabled = 0;
  let storageListener;
  const context = { fetch() {}, DarkReader: {
    setFetchMethod() {}, enable(theme) { enabled.push(theme); }, disable() { disabled++; }
  }, chrome: {
    runtime: { sendMessage: () => new Promise(resolve => pending.push(resolve)), onMessage: { addListener() {} } },
    storage: { onChanged: { addListener(fn) { storageListener = fn; } } }
  } };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'content.js'), 'utf8'), context);
  storageListener({ masterEnabled: {} }, 'local');
  pending[1]({ settings: { enabled: false } });
  await new Promise(resolve => setImmediate(resolve));
  pending[0]({ settings: { enabled: true, contrast: 140 } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(enabled.length, 0);
  assert.equal(disabled, 1);
  storageListener({ 'site:x': {} }, 'local');
  pending[2]({ error: 'unavailable' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(disabled, 2);
});
(async () => {
  for (const item of cases) { await item.run(); console.log(`PASS ${item.name}`); }
  console.log(`${cases.length}/${cases.length} dark mode tests passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
