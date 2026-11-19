// Self-check for middleware.js. Run: npm test
// Supabase is faked by replacing global fetch, so no real network or accounts are used.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'anon-test-key';
process.env.PROGRAM_CODE = 'German-G6-Story';
const { default: middleware } = await import('../middleware.js');

let fakeUser, fakeRows, calls;
beforeEach(() => { fakeUser = null; fakeRows = []; calls = []; });
globalThis.fetch = async (input, init) => {
  const u = new URL(typeof input === 'string' ? input : input.url);
  calls.push(u.pathname);
  const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json' } });
  if (u.pathname === '/auth/v1/user') return fakeUser ? json(fakeUser) : json({ code: 401, msg: 'invalid JWT' }, 401);
  if (u.pathname === '/rest/v1/Licenses') return json(fakeRows);
  if (u.pathname === '/auth/v1/token') return json({ error: 'invalid_grant' }, 400);
  if (u.pathname === '/auth/v1/logout') return new Response(null, { status: 204 });
  throw new Error('unexpected fetch ' + u);
};

const sessionCookie = () => {
  const session = { access_token: 'x.y.z', refresh_token: 'r', token_type: 'bearer', expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: '1', email: 'someone@gmail.com' } };
  return 'sb-example-auth-token=base64-' + Buffer.from(JSON.stringify(session)).toString('base64url');
};
const req = (path, cookie) => new Request('https://app.test' + path, { headers: cookie ? { cookie } : {} });
const passes = (res) => res.headers.get('x-middleware-next') === '1';

test('no session: program and assets redirect to /login', async () => {
  for (const p of ['/', '/index.html', '/img/apfel.jpg', '/story.mp4']) {
    const res = await middleware(req(p));
    assert.equal(res.status, 302, p);
    assert.equal(res.headers.get('location'), '/login', p);
  }
});

test('/login page is served, Arabic RTL', async () => {
  const res = await middleware(req('/login'));
  assert.equal(res.status, 200);
  const body = await res.text();
  assert.match(body, /dir="rtl"/);
  assert.match(body, /href="\/auth\/google"/);
});

test('/auth/google redirects to Supabase Google OAuth with PKCE cookie', async () => {
  const res = await middleware(req('/auth/google'));
  assert.equal(res.status, 302);
  const loc = new URL(res.headers.get('location'));
  assert.equal(loc.origin + loc.pathname, 'https://example.supabase.co/auth/v1/authorize');
  assert.equal(loc.searchParams.get('provider'), 'google');
  assert.equal(loc.searchParams.get('redirect_to'), 'https://app.test/auth/callback');
  assert.equal(loc.searchParams.get('prompt'), 'select_account');
  assert.ok(loc.searchParams.get('code_challenge'));
  assert.match(res.headers.get('set-cookie') ?? '', /sb-example-auth-token-code-verifier=/);
});

test('/auth/callback with missing or bad code goes back to /login?error=1', async () => {
  assert.equal((await middleware(req('/auth/callback'))).headers.get('location'), '/login?error=1');
  assert.equal((await middleware(req('/auth/callback?code=bad'))).headers.get('location'), '/login?error=1');
});

test('forged/expired session cookie is rejected by Supabase -> /login', async () => {
  const res = await middleware(req('/', sessionCookie()));
  assert.equal(res.headers.get('location'), '/login');
  assert.ok(calls.includes('/auth/v1/user'));
});

test('signed in, on the list (case/space differences) -> passes through', async () => {
  fakeUser = { id: '1', email: 'Someone@Gmail.com' };
  fakeRows = [{ email: '  SOMEONE@gmail.com ', program_code: ' german-g6-story ' }];
  for (const p of ['/', '/img/apfel.jpg']) assert.ok(passes(await middleware(req(p, sessionCookie()))), p);
});

test('signed in, not on the list or other program -> 403 not-subscribed page', async () => {
  fakeUser = { id: '1', email: 'someone@gmail.com' };
  for (const rows of [[], [{ email: 'someone@gmail.com', program_code: 'Other-Program' }],
                      [{ email: 'other@gmail.com', program_code: 'German-G6-Story' }]]) {
    fakeRows = rows;
    const res = await middleware(req('/img/apfel.jpg', sessionCookie()));
    assert.equal(res.status, 403);
    assert.ok(!passes(res));
    const body = await res.text();
    assert.match(body, /wa\.me\/201002152024/);
    assert.match(body, /href="\/logout"/);
  }
});

test('not-subscribed page escapes the email', async () => {
  fakeUser = { id: '1', email: '<script>x</script>@gmail.com' };
  const body = await (await middleware(req('/', sessionCookie()))).text();
  assert.ok(!body.includes('<script>x'));
});

test('/logout clears cookies and redirects to /login', async () => {
  const res = await middleware(req('/logout', sessionCookie()));
  assert.equal(res.headers.get('location'), '/login');
  assert.match(res.headers.get('set-cookie') ?? '', /sb-example-auth-token=;|Max-Age=0/);
});

test('missing env vars -> fail closed with 500', async () => {
  const saved = process.env.PROGRAM_CODE;
  delete process.env.PROGRAM_CODE;
  const res = await middleware(req('/'));
  process.env.PROGRAM_CODE = saved;
  assert.equal(res.status, 500);
  assert.ok(!passes(res));
});
