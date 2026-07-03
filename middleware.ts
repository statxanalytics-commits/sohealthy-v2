import { next } from '@vercel/functions';

// Run on every page/document request, but skip static assets so the
// Expo web build (_expo/*, assets/*, hashed JS/CSS/images/fonts) is
// never intercepted — only navigational requests are checked.
export const config = {
  matcher: [
    '/((?!_expo/|assets/|favicon\\.ico|.*\\.(?:js|mjs|css|map|png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|json)$).*)',
  ],
};

function isInAppBrowser(userAgent: string): boolean {
  // Instagram's own link-preview crawler (facebookexternalhit / Facebot) must
  // never be blocked, or Open Graph previews on shared links will break.
  if (/facebookexternalhit|Facebot/i.test(userAgent)) return false;

  // Real Instagram in-app browser (device UA that includes "Instagram ...").
  if (/Instagram/i.test(userAgent)) return true;

  // Facebook / Messenger in-app browser.
  if (/FBAN|FBAV/i.test(userAgent)) return true;

  return false;
}

function fallbackPage(): string {
  return `<!doctype html>
<html lang="sq">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>SoHealthy</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #ECEFE8;
    color: #1B3F2F;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 28px;
  }
  .card { max-width: 420px; text-align: center; }
  .logo {
    width: 56px; height: 56px; border-radius: 16px;
    background: #1B3F2F; color: #ECEFE8;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 22px; margin: 0 auto 20px;
  }
  h1 { font-size: 19px; margin: 0 0 10px; }
  p { font-size: 15px; line-height: 1.55; color: #1B3F2F; opacity: 0.8; margin: 0 0 22px; }
  .steps {
    text-align: left; background: #fff; border-radius: 14px;
    padding: 16px 18px; margin-bottom: 18px; font-size: 14px; line-height: 1.6;
  }
  .steps b { color: #1B3F2F; }
  button {
    width: 100%; border: none; background: #71B5A2; color: #1B3F2F;
    font-weight: 700; font-size: 15px; padding: 14px; border-radius: 999px;
    cursor: pointer;
  }
  .copied { color: #1B3F2F; font-size: 13px; margin-top: 10px; opacity: 0; transition: opacity .2s; }
  .copied.show { opacity: 0.7; }
  textarea { position: absolute; left: -9999px; top: -9999px; }
</style>
</head>
<body>
  <div class="card">
    <div class="logo">S</div>
    <h1>Hape këtë faqe në browser</h1>
    <p>Për shkak të kufizimeve të Instagram-it, kjo faqe nuk mund të hapet plotësisht këtu. Hape në Safari ose Chrome për të vazhduar.</p>
    <div class="steps">
      1. Prek <b>⋯</b> (ose ikonën e tre pikave) lart djathtas<br/>
      2. Zgjidh <b>"Hap te Browser"</b> / <b>"Open in Browser"</b>
    </div>
    <button onclick="copyLink()">Kopjo Linkun</button>
    <div class="copied" id="copiedMsg">U kopjua ✓ — ngjite (paste) te Safari/Chrome</div>
  </div>
  <textarea id="linkBox" readonly>__LINK__</textarea>
  <script>
    function copyLink() {
      var box = document.getElementById('linkBox');
      box.style.left = '0';
      box.style.top = '0';
      box.focus();
      box.select();
      box.setSelectionRange(0, 99999);
      try {
        document.execCommand('copy');
        var msg = document.getElementById('copiedMsg');
        msg.classList.add('show');
      } catch (e) {}
      box.style.left = '-9999px';
      box.style.top = '-9999px';
    }
  </script>
</body>
</html>`;
}

export default function middleware(request: Request) {
  const userAgent = request.headers.get('user-agent') || '';

  if (!isInAppBrowser(userAgent)) {
    return next();
  }

  const html = fallbackPage().replace('__LINK__', request.url);

  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
