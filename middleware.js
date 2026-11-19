// Vercel Edge Middleware: runs on the server before ANY file of this site is sent.
// Only signed-in Google users whose email is in the Supabase "Licenses" table
// for PROGRAM_CODE get through. Everything else gets the login / not-subscribed page.
import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';
import { next } from '@vercel/functions';
import { loginPage, notSubscribedPage, messagePage } from './gate-pages.js';

const TABLE = 'Licenses';
const norm = (s) => String(s ?? '').trim().toLowerCase();

export default async function middleware(request) {
  const url = new URL(request.url);
  const { SUPABASE_URL, SUPABASE_ANON_KEY, PROGRAM_CODE } = process.env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !PROGRAM_CODE) {
    return new Response(messagePage('الموقع غير مُعدّ بعد', 'Site not configured: missing environment variables.'), {
      status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const cookiesToSet = [];
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => parseCookieHeader(request.headers.get('cookie') ?? ''),
      setAll: (list) => cookiesToSet.push(...list),
    },
  });
  // Every response carries refreshed/cleared session cookies and is never stored by shared caches.
  const headers = () => {
    const h = new Headers({ 'Cache-Control': 'private, no-cache' });
    for (const { name, value, options } of cookiesToSet) h.append('Set-Cookie', serializeCookieHeader(name, value, options));
    return h;
  };
  const redirect = (to) => {
    const h = headers();
    h.set('Location', to);
    return new Response(null, { status: 302, headers: h });
  };
  const html = (body, status = 200) => {
    const h = headers();
    h.set('Content-Type', 'text/html; charset=utf-8');
    return new Response(body, { status, headers: h });
  };

  switch (url.pathname) {
    case '/login':
      return html(loginPage(url.searchParams.has('error')));

    case '/auth/google': {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${url.origin}/auth/callback`,
          skipBrowserRedirect: true,
          queryParams: { prompt: 'select_account' }, // always show Google's account picker
        },
      });
      return error || !data?.url ? redirect('/login?error=1') : redirect(data.url);
    }

    case '/auth/callback': {
      const code = url.searchParams.get('code');
      if (!code) return redirect('/login?error=1');
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      return redirect(error ? '/login?error=1' : '/');
    }

    case '/logout':
      await supabase.auth.signOut({ scope: 'local' });
      return redirect('/login');
  }

  // Everything else (index.html, images, videos...) is protected.
  const { data: { user } } = await supabase.auth.getUser(); // verified with Supabase, not just decoded
  if (!user?.email) return redirect('/login');

  // RLS returns only this user's own rows; we still re-check email and code here.
  const { data: rows, error } = await supabase.from(TABLE).select('email, program_code');
  if (error) {
    console.error('licenses query failed:', error.message);
    return html(messagePage('حدث خطأ، حاول مرة أخرى', 'Could not check your subscription. Please try again.'), 503);
  }
  const allowed = rows.some((r) => norm(r.email) === norm(user.email) && norm(r.program_code) === norm(PROGRAM_CODE));
  if (!allowed) return html(notSubscribedPage(user.email, PROGRAM_CODE), 403);

  return next({ headers: headers() });
}
