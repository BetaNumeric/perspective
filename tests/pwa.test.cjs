const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function worker(scope = 'https://betanumeric.github.io/perspective/') {
  const handlers = new Map(), savedCaches = new Map();
  const state = { online: true, status: 200, body: 'current', requests: [], skipped: false, claimed: false };
  const fetch = async request => {
    state.requests.push(request);
    if (!state.online) throw new TypeError('Offline');
    if (request.url === state.missing) return new Response('Missing', { status: 404 });
    return new Response(state.body, { status: state.status });
  };
  const caches = {
    async open(name) {
      if (!savedCaches.has(name)) {
        const entries = new Map();
        savedCaches.set(name, {
          entries,
          async match(request) { return entries.get(request.url || request)?.clone(); },
          async put(request, response) {
            if (state.full) throw new Error('Storage full');
            entries.set(request.url || request, response.clone());
          },
          async addAll(requests) {
            const responses = await Promise.all(requests.map(fetch));
            if (responses.some(response => !response.ok)) throw new Error('Incomplete installation');
            requests.forEach((request, index) => entries.set(request.url, responses[index]));
          }
        });
      }
      return savedCaches.get(name);
    },
    async keys() { return [...savedCaches.keys()]; },
    async delete(name) { return savedCaches.delete(name); }
  };
  const context = vm.createContext({
    URL, Request, caches, fetch,
    self: {
      registration: { scope },
      addEventListener: (name, callback) => handlers.set(name, callback),
      async skipWaiting() { state.skipped = true; },
      clients: { async claim() { state.claimed = true; } }
    }
  });
  vm.runInContext(fs.readFileSync('service-worker.js', 'utf8'), context);
  const read = expression => vm.runInContext(expression, context);
  const dispatch = name => {
    let work;
    handlers.get(name)({ waitUntil(promise) { work = promise; } });
    return work;
  };
  const request = (path, options = {}) => {
    const input = new Request(new URL(path, scope), options);
    if (options.navigate) Object.defineProperty(input, 'mode', { value: 'navigate' });
    let result;
    handlers.get('fetch')({ request: input, respondWith(promise) { result = promise; } });
    return result;
  };
  return { state, caches, read, dispatch, request, scope };
}

test('installable metadata and offline assets work at root and GitHub Pages subpaths', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const sketch = fs.readFileSync('sketch.js', 'utf8');
  const manifest = JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.name);
  for (const scope of ['https://example.org/', 'https://betanumeric.github.io/perspective/']) {
    const app = worker(scope);
    for (const key of ['id', 'scope', 'start_url']) assert.equal(new URL(manifest[key], scope).href, scope);
    const assets = new Set(app.read('APP_ASSETS').map(path => new URL(path, scope).href));
    for (const path of app.read('APP_ASSETS')) assert.ok(fs.existsSync(path), `Missing offline asset: ${path}`);
    const dependencies = [
      ...[...html.matchAll(/<script src="([^"]+)"/g)].map(match => match[1]),
      ...[...html.matchAll(/\bhref="([^"]+)"/g)].map(match => match[1].split('#')[0]),
      ...[...sketch.matchAll(/(?:loadSourceLines|loadTable)\('([^']+)'/g)].map(match => match[1]),
      ...manifest.icons.map(icon => icon.src)
    ];
    for (const path of dependencies.filter(path => path && !path.startsWith('https://'))) {
      assert.ok(assets.has(new URL(path, scope).href), `Not saved offline: ${path}`);
    }
  }
  for (const size of [192, 512]) {
    const icon = manifest.icons.find(icon => icon.sizes === `${size}x${size}`);
    assert.ok(icon?.purpose.split(' ').includes('maskable'));
    const png = fs.readFileSync(icon.src);
    assert.equal(png.toString('hex', 0, 8), '89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
});

test('registration uses a relative worker URL and only runs in supported secure contexts', async () => {
  const code = fs.readFileSync('js/pwa.js', 'utf8');
  vm.runInNewContext(code, {});
  for (const secure of [false, true]) {
    let listener, registered;
    const context = {
      window: { isSecureContext: secure, addEventListener(name, callback) { assert.equal(name, 'load'); listener = callback; } },
      navigator: { serviceWorker: { async register(path, options) { registered = { path, options }; } } }, console
    };
    vm.runInNewContext(code, context);
    assert.equal(!!listener, secure);
    if (listener) {
      listener();
      assert.equal(registered.path, './service-worker.js');
      assert.equal(registered.options.updateViaCache, 'none');
    }
  }
});

test('installation saves all dependencies before activation and refuses an incomplete cache', async () => {
  const app = worker();
  await app.dispatch('install');
  assert.ok(app.state.skipped);
  assert.equal(app.state.requests.length, app.read('APP_ASSETS.length'));
  assert.ok(app.state.requests.every(request => request.cache === 'reload'));
  const incomplete = worker();
  incomplete.state.missing = new URL('data/temperature/GLB.Ts+dSST.txt', incomplete.scope).href;
  await assert.rejects(incomplete.dispatch('install'), /Incomplete/);
  assert.equal(incomplete.state.skipped, false);
});

test('activation removes only obsolete caches for this app and scope', async () => {
  const app = worker();
  const old = app.read('CACHE_PREFIX') + 'old';
  const peer = 'climate-spiral-v60';
  const otherScope = worker('https://betanumeric.github.io/preview/').read('CACHE_NAME');
  await app.caches.open(old);
  await app.caches.open(peer);
  await app.caches.open(otherScope);
  await app.dispatch('install');
  await app.dispatch('activate');
  const keys = await app.caches.keys();
  assert.ok(!keys.includes(old));
  assert.ok(keys.includes(peer) && keys.includes(otherScope) && keys.includes(app.read('CACHE_NAME')));
  assert.ok(app.state.claimed);
});

test('online loads refresh code and observations; offline reloads use the refreshed files', async () => {
  const app = worker();
  await app.dispatch('install');
  for (const path of ['js/config.js', 'data/temperature/GLB.Ts+dSST.txt']) {
    app.state.body = `updated ${path}`;
    assert.equal(await (await app.request(path)).text(), app.state.body);
    assert.equal(app.state.requests.at(-1).cache, 'no-store');
    app.state.online = false;
    assert.equal(await (await app.request(path)).text(), app.state.body);
    app.state.online = true;
  }
  app.state.online = false;
  assert.equal(await (await app.request('./?installed', { navigate: true })).text(), 'current');
  await assert.rejects(app.request('missing.csv'), /Offline/);
});

test('server outages use saved data, error pages are not cached, and full storage permits online use', async () => {
  const app = worker();
  await app.dispatch('install');
  app.state.status = 503;
  assert.equal(await (await app.request('js/config.js')).text(), 'current');
  app.state.status = 404;
  assert.equal((await app.request('js/config.js')).status, 404);
  app.state.online = false;
  assert.equal(await (await app.request('js/config.js')).text(), 'current');
  app.state.online = true;
  app.state.status = 200;
  app.state.full = true;
  app.state.body = 'fresh despite full storage';
  assert.equal(await (await app.request('js/config.js')).text(), app.state.body);
});

test('worker leaves other apps, external requests and mutations alone', () => {
  const app = worker();
  assert.equal(app.request('https://betanumeric.github.io/climate_spiral/'), undefined);
  assert.equal(app.request('https://example.org/data.csv'), undefined);
  assert.equal(app.request('js/config.js', { method: 'POST' }), undefined);
});
