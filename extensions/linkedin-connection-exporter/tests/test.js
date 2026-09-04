const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let passed = 0;
function test(name, fn) {
  return Promise.resolve().then(fn).then(() => {
    passed++;
    console.log(`PASS ${name}`);
  }).catch(err => {
    console.error(`FAIL ${name}`);
    throw err;
  });
}

function contentSandbox() {
  let anchors = [];
  let controls = [];
  let messageListener = null;
  const sandbox = {
    URL,
    console,
    location: { href: 'https://www.linkedin.com/search/results/people/', origin: 'https://www.linkedin.com' },
    document: {
      documentElement: { scrollHeight: 1000 },
      querySelectorAll(selector) {
        if (selector === 'main a[href*="/in/"]') return anchors;
        if (selector === 'a[href*="/in/"]') return anchors;
        if (selector === 'button, a') return controls;
        return [];
      }
    },
    window: { scrollTo() {} },
    chrome: {
      runtime: {
        sendMessage(msg, cb) { if (cb) cb({ state: { running: false } }); },
        onMessage: { addListener(fn) { messageListener = fn; } }
      }
    },
    setTimeout() { return 0; },
    clearTimeout() {}
  };
  sandbox.__setAnchors = x => anchors = x;
  sandbox.__setControls = x => controls = x;
  sandbox.__sendContentMessage = msg => {
    let response;
    if (!messageListener) throw new Error('content message listener not installed');
    messageListener(msg, {}, r => { response = r; });
    return response;
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'content.js'), 'utf8'), sandbox, { filename: 'content.js' });
  return sandbox;
}

function fakeCard(text, imgAlt='') {
  const card = {
    innerText: text,
    _anchors: [],
    querySelector(selector) {
      if (selector === 'img' && imgAlt) return { alt: imgAlt };
      return null;
    },
    querySelectorAll(selector) {
      if (selector === 'a[href*="/in/"]') return this._anchors;
      return [];
    }
  };
  return card;
}

function fakeAnchor(href, {text='', aria='', card=null, imgAlt=''}={}) {
  return {
    href,
    innerText: text,
    textContent: text,
    parentElement: null,
    closest() { return card; },
    getAttribute(name) {
      if (name === 'aria-label') return aria;
      if (name === 'rel') return '';
      return null;
    },
    querySelector(selector) {
      if (selector === 'img' && imgAlt) return { alt: imgAlt };
      return null;
    }
  };
}

function attach(card, ...anchors) {
  card._anchors = anchors;
  return anchors;
}

function fakeControl({text='', aria='', rel='', disabled=false, ariaDisabled='false'}={}) {
  return {
    disabled,
    innerText: text,
    textContent: text,
    getAttribute(name) {
      if (name === 'aria-label') return aria;
      if (name === 'aria-disabled') return ariaDisabled;
      if (name === 'rel') return rel;
      return null;
    }
  };
}

async function testContent() {
  const s = contentSandbox();

  await test('canonicalProfileUrl removes tracking/query/fragment and normalizes slash', () => {
    assert.strictEqual(
      s.canonicalProfileUrl('https://www.linkedin.com/in/jane-doe?miniProfileUrn=abc#x'),
      'https://www.linkedin.com/in/jane-doe/'
    );
    assert.strictEqual(s.canonicalProfileUrl('https://example.com/not-a-profile'), null);
  });

  await test('classification is metadata only and recognizes common labels', () => {
    assert.strictEqual(s.classify('Senior Technical Recruiter at Acme'), 'Recruiting / Talent');
    assert.strictEqual(s.classify('Staff Software Engineer, ML Platform'), 'Technical');
    assert.strictEqual(s.classify('VP Product'), 'Product');
    assert.strictEqual(s.classify('Museum Curator and Writer'), 'Other');
  });

  await test('screenshot-like row parses name, degree, headline, location, mutuals and URL', () => {
    const card = fakeCard([
      'Jane Doe',
      '• 2nd',
      'Senior Program Manager at Example Corp',
      'New York City Metropolitan Area',
      'Alex Smith and 14 other mutual connections',
      'Message'
    ].join('\n'));
    const avatar = fakeAnchor('https://www.linkedin.com/in/jane-doe/?trk=avatar', { card });
    const name = fakeAnchor('https://www.linkedin.com/in/jane-doe/?trk=name', { text: 'Jane Doe', card });
    attach(card, avatar, name);
    s.__setAnchors([avatar, name]);

    const rows = s.extractVisibleRows();
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].name, 'Jane Doe');
    assert.strictEqual(rows[0].connectionDegree, '2nd');
    assert.strictEqual(rows[0].headline, 'Senior Program Manager at Example Corp');
    assert.strictEqual(rows[0].location, 'New York City Metropolitan Area');
    assert.strictEqual(rows[0].mutualConnections, 'Alex Smith and 14 other mutual connections');
    assert.strictEqual(rows[0].url, 'https://www.linkedin.com/in/jane-doe/');
    assert.ok(rows[0].visibleText.includes('Message'));
  });

  await test('all professions are retained; collection never filters to recruiters or tech', () => {
    const titles = [
      ['Recruiter Person', 'Recruiter at A'],
      ['Engineer Person', 'Software Engineer at B'],
      ['Teacher Person', 'High School History Teacher'],
      ['Artist Person', 'Independent Ceramic Artist'],
      ['Operations Person', 'Facilities Operations Coordinator']
    ];
    const anchors = [];
    titles.forEach(([name, title], i) => {
      const card = fakeCard(`${name}\n2nd\n${title}\nBoston, MA\nMessage`);
      const a = fakeAnchor(`https://www.linkedin.com/in/person-${i}/`, { text: name, card });
      attach(card, a);
      anchors.push(a);
    });
    s.__setAnchors(anchors);
    const rows = s.extractVisibleRows();
    assert.strictEqual(rows.length, titles.length);
    assert.deepStrictEqual(Array.from(rows, r => r.name), titles.map(x => x[0]));
  });

  await test('mutual profile links inside a connection card do not become extra exported people', () => {
    const card = fakeCard('Primary Person\n2nd\nEngineering Manager at Acme\nSeattle, WA\nMutual Person and 3 other mutual connections\nMessage');
    const avatar = fakeAnchor('https://www.linkedin.com/in/primary/', { card });
    const name = fakeAnchor('https://www.linkedin.com/in/primary/', { text: 'Primary Person', card });
    const mutual = fakeAnchor('https://www.linkedin.com/in/mutual/', { text: 'Mutual Person', card });
    attach(card, avatar, name, mutual);
    s.__setAnchors([avatar, name, mutual]);

    const rows = s.extractVisibleRows();
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].name, 'Primary Person');
    assert.strictEqual(rows[0].url, 'https://www.linkedin.com/in/primary/');
  });

  await test('duplicate avatar/name anchors for the same connection produce one row', () => {
    const c1 = fakeCard('Sam Lee\n1st\nStaff Software Engineer\nBoston, MA\n3 mutual connections\nMessage');
    const a1 = fakeAnchor('https://www.linkedin.com/in/sam-lee/?trk=avatar', { card: c1 });
    const a2 = fakeAnchor('https://www.linkedin.com/in/sam-lee/', { text: 'Sam Lee', card: c1 });
    attach(c1, a1, a2);
    s.__setAnchors([a1, a2]);
    const rows = s.extractVisibleRows();
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].name, 'Sam Lee');
  });

  await test('sparse connection rows are retained rather than dropped for missing job data', () => {
    const card = fakeCard('LinkedIn Member\n2nd\nMessage');
    const a = fakeAnchor('https://www.linkedin.com/in/sparse-person/', { text: 'Sparse Person', card });
    attach(card, a);
    s.__setAnchors([a]);
    const rows = s.extractVisibleRows();
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].url, 'https://www.linkedin.com/in/sparse-person/');
  });

  await test('VALIDATE_PAGE reports parsed connections without paginating', () => {
    const card = fakeCard('Validation Person\n2nd\nOperations Manager\nChicago, IL\nMessage');
    const a = fakeAnchor('https://www.linkedin.com/in/validation-person/', { text: 'Validation Person', card });
    attach(card, a);
    s.__setAnchors([a]);
    const r = s.__sendContentMessage({ type: 'VALIDATE_PAGE' });
    assert.ok(r.ok);
    assert.strictEqual(r.count, 1);
    assert.strictEqual(r.rawProfileLinks, 1);
    assert.strictEqual(r.sample[0].name, 'Validation Person');
    assert.strictEqual(r.sample[0].headline, 'Operations Manager');
  });

  await test('findNextControl rejects disabled Next and accepts enabled semantic Next', () => {
    s.__setControls([
      fakeControl({ text: 'Next', disabled: true }),
      fakeControl({ aria: 'Next page', ariaDisabled: 'false' })
    ]);
    const next = s.findNextControl();
    assert.ok(next);
    assert.strictEqual(next.getAttribute('aria-label'), 'Next page');
  });
}

async function testBackground() {
  let saved;
  let messageListener;
  const sandbox = {
    console,
    structuredClone,
    chrome: {
      storage: { local: {
        async get() { return saved ? { state: structuredClone(saved) } : {}; },
        async set(obj) { saved = structuredClone(obj.state); }
      }},
      runtime: {
        onInstalled: { addListener() {} },
        onMessage: { addListener(fn) { messageListener = fn; } }
      }
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'background.js'), 'utf8'), sandbox, { filename: 'background.js' });

  function send(msg) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('message timeout')), 1000);
      messageListener(msg, {}, res => { clearTimeout(timer); resolve(res); });
    });
  }

  await test('background initializes clean state', async () => {
    const r = await send({ type: 'GET_STATE' });
    assert.strictEqual(r.state.currentPage, 0);
    assert.deepStrictEqual(Object.keys(r.state.rows), []);
  });

  await test('START_STATE clamps config and does not erase resume page', async () => {
    await send({ type: 'UPSERT_ROWS', rows: [{url:'https://www.linkedin.com/in/a/', name:'A'}], currentPage: 7, lastSignature: 'sig7' });
    const r = await send({ type: 'START_STATE', config: { maxPages: 5000, delayMs: 1 }, reset: false });
    assert.strictEqual(r.state.currentPage, 7);
    assert.strictEqual(r.state.lastSignature, 'sig7');
    assert.strictEqual(r.state.config.maxPages, 999);
    assert.strictEqual(r.state.config.delayMs, 800);
  });

  await test('UPSERT_ROWS deduplicates repeated canonical URL keys and merges newer fields', async () => {
    await send({ type: 'UPSERT_ROWS', rows: [
      {url:'https://www.linkedin.com/in/a/', name:'A2', headline:'Engineer'},
      {url:'https://www.linkedin.com/in/b/', name:'B'}
    ]});
    const r = await send({ type: 'GET_STATE' });
    assert.strictEqual(Object.keys(r.state.rows).length, 2);
    assert.strictEqual(r.state.rows['https://www.linkedin.com/in/a/'].name, 'A2');
    assert.strictEqual(r.state.rows['https://www.linkedin.com/in/a/'].headline, 'Engineer');
  });

  await test('CLEAR creates genuinely fresh nested state', async () => {
    let r = await send({ type: 'CLEAR' });
    assert.strictEqual(Object.keys(r.state.rows).length, 0);
    r = await send({ type: 'UPSERT_ROWS', rows: [{url:'u', name:'X'}] });
    assert.strictEqual(Object.keys(r.state.rows).length, 1);
    r = await send({ type: 'CLEAR' });
    assert.strictEqual(Object.keys(r.state.rows).length, 0);
    assert.strictEqual(r.state.currentPage, 0);
    assert.strictEqual(r.state.lastSignature, '');
  });
}

async function testPopupAndManifest() {
  const elements = new Map();
  function el(id) {
    if (!elements.has(id)) elements.set(id, {
      id, value: id === 'maxPages' ? '99' : id === 'delayMs' ? '2500' : '',
      textContent: '',
      addEventListener() {},
      click() {}
    });
    return elements.get(id);
  }
  const sandbox = {
    console,
    document: { getElementById: el, createElement() { return { click() {} }; } },
    chrome: {
      runtime: { async sendMessage() { return { state: { rows:{}, currentPage:0, config:{maxPages:99,delayMs:2500}, lastStatus:'Idle'} }; } },
      tabs: { async query(){ return []; }, async sendMessage(){ return {ok:true}; } },
      scripting: { async executeScript(){} }
    },
    Blob,
    URL: { createObjectURL(){ return 'blob:x'; }, revokeObjectURL(){} },
    setTimeout() {},
    setInterval() {}
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'popup.js'), 'utf8'), sandbox, { filename: 'popup.js' });

  await test('CSV/TSV escaping handles quotes, delimiters and spreadsheet-formula injection', () => {
    assert.strictEqual(sandbox.quoteDelimited('Jane, Doe', ','), '"Jane, Doe"');
    assert.strictEqual(sandbox.quoteDelimited('He said "hi"', ','), '"He said ""hi"""');
    assert.strictEqual(sandbox.quoteDelimited('=2+2', ','), "'=2+2");
    assert.strictEqual(sandbox.quoteDelimited('@evil', '\t'), "'@evil");
  });

  await test('default export schema contains the screenshot-visible fields and preserves order metadata', () => {
    const code = fs.readFileSync(path.join(ROOT, 'popup.js'), 'utf8');
    for (const field of ['name','connectionDegree','headline','location','mutualConnections','details','url','sourcePage','rowOnPage','visibleText']) {
      assert.ok(code.includes(`"${field}"`), `missing ${field}`);
    }
    assert.ok(code.includes('Number(a.sourcePage)'));
    assert.ok(code.includes('Number(a.rowOnPage)'));
    assert.ok(code.includes('VALIDATE_PAGE'));
    assert.ok(fs.readFileSync(path.join(ROOT, 'popup.html'), 'utf8').includes('Validate Current Page'));
  });

  await test('Manifest V3 has only the permissions used by the extension', () => {
    const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
    assert.strictEqual(m.manifest_version, 3);
    assert.deepStrictEqual(m.permissions, ['storage','tabs','scripting']);
    assert.deepStrictEqual(m.host_permissions, ['https://www.linkedin.com/*']);
    assert.ok(m.content_scripts[0].js.includes('content.js'));
  });
}

(async () => {
  await testContent();
  await testBackground();
  await testPopupAndManifest();
  console.log(`\n${passed} tests passed.`);
})().catch(err => {
  console.error(err.stack || err);
  process.exit(1);
});
