// HTML for the login-gate pages (Arabic, RTL, with English subtitles). Served by middleware.js.
const WHATSAPP = '201002152024';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const layout = (title, body) => `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title}</title>
<style>
:root{color-scheme:light dark;--bg:#f4f1ea;--card:#fff;--ink:#1d1a17;--soft:#6c6359;--line:#e6dfd3;--btn:#1d1a17;--btnink:#fff}
@media(prefers-color-scheme:dark){:root{--bg:#16151a;--card:#211f26;--ink:#f3eee6;--soft:#b0a89d;--line:#34303b;--btn:#f3eee6;--btnink:#16151a}}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:16px;background:var(--bg);color:var(--ink);
font:16px/1.6 "Segoe UI",Tahoma,"Noto Sans Arabic",system-ui,sans-serif}
.card{width:100%;max-width:400px;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:32px 24px;text-align:center;box-shadow:0 10px 30px #0000000f}
h1{font-size:22px;margin:0 0 6px}
p{margin:0 0 6px;color:var(--soft)}
.en{direction:ltr;font-size:14px}
.email{direction:ltr;display:inline-block;margin:10px 0 4px;padding:4px 12px;border-radius:99px;background:var(--bg);font-size:14px;color:var(--ink);word-break:break-all}
.btns{display:grid;gap:10px;margin-top:22px}
.btn{display:flex;align-items:center;justify-content:center;gap:10px;min-height:48px;padding:10px 16px;border-radius:12px;
text-decoration:none;font-weight:600;border:1px solid var(--line);color:var(--ink);background:var(--card)}
.btn.main{background:var(--btn);color:var(--btnink);border-color:var(--btn)}
.btn.wa{background:#1fa855;color:#fff;border-color:#1fa855}
.btn:focus-visible{outline:3px solid #4b8cf5;outline-offset:2px}
.btn svg{width:20px;height:20px;flex:none}
.err{color:#c0392b}
</style>
</head>
<body><main class="card">${body}</main></body>
</html>`;

const googleIcon = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

export const loginPage = (failed) => layout('تسجيل الدخول', `
<h1>مرحبًا بك 👋</h1>
<p>سجّل الدخول بحساب Gmail الذي اشتركت به</p>
<p class="en">Sign in with the Gmail account you subscribed with</p>
${failed ? '<p class="err">لم يكتمل تسجيل الدخول، حاول مرة أخرى.<br><span class="en">Sign-in failed, please try again.</span></p>' : ''}
<div class="btns"><a class="btn main" href="/auth/google">${googleIcon}<span>الدخول باستخدام Google</span></a></div>`);

export const notSubscribedPage = (email, programCode) => {
  const text = `مرحبًا، أريد الاشتراك في البرنامج ${programCode}\nالإيميل: ${email}`;
  return layout('غير مشترك', `
<h1>أنت غير مشترك في هذا البرنامج</h1>
<p class="en">You're not subscribed to this program</p>
<span class="email">${esc(email)}</span>
<p>للاشتراك تواصل معنا على واتساب، أو سجّل الدخول بحساب آخر.</p>
<div class="btns">
<a class="btn wa" href="https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}" target="_blank" rel="noopener">
<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.7 1.2 1.6 2 1.1 1 2 1.3 2.3 1.4.3.2.4.1.6-.1l.8-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3z"/></svg>
<span>تواصل معنا على واتساب</span></a>
<a class="btn" href="/logout">الدخول بحساب آخر <span class="en">· Use another account</span></a>
</div>`);
};

export const messagePage = (ar, en) => layout(ar, `
<h1>${esc(ar)}</h1>
<p class="en">${esc(en)}</p>
<div class="btns"><a class="btn" href="/">إعادة المحاولة</a><a class="btn" href="/logout">تسجيل الخروج</a></div>`);
