// Immersive Reader client helper module
// Exports helper functions to load SDK, acquire token, convert plain text to HTML, and launch IR

const SDK_URL = 'https://ircdname.azureedge.net/immersivereadersdk/immersive-reader-sdk.1.4.0.js';

async function ensureSdkLoaded() {
  if (typeof window === 'undefined') return; // not a browser
  if (window.ImmersiveReader && window.ImmersiveReader.launchAsync) return;
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SDK_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', (e) => reject(e));
      return;
    }
    const s = document.createElement('script');
    s.src = SDK_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = (e) => reject(e);
    document.head.appendChild(s);
  });
}

async function getTokenAndSubdomain() {
  // Try the new API first, then fallback to legacy endpoint
  const endpoints = ['/api/immersive-reader-token', '/GetTokenAndSubdomain'];
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.token && data.subdomain) return { token: data.token, subdomain: data.subdomain };
      // legacy /GetTokenAndSubdomain returns token/subdomain too
      if (data.token && data.subdomain) return { token: data.token, subdomain: data.subdomain };
    } catch (e) {
      // ignore and try next
    }
  }
  throw new Error('Unable to obtain IR token from server');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function plainTextToHtml(text) {
  if (!text) return '';
  return text.split(/\r?\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(p => `<p>${escapeHtml(p)}</p>`)
    .join('');
}

async function launchFromHtml(title, htmlContent, lang = 'zh-Hant', options = {}) {
  await ensureSdkLoaded();
  const creds = await getTokenAndSubdomain();
  const data = { title: title || 'Document', chunks: [{ content: htmlContent, mimeType: 'text/html', lang }] };
  
  // Load saved user preferences
  const savedPreferences = localStorage.getItem('immersive-reader-preferences');
  const savedTranslationLang = localStorage.getItem('immersive-reader-translation-lang') || 'zh-Hant';
  
  const irOptions = Object.assign({
    uiZIndex: 2000,
    uiLang: lang,
    cookiePolicy: 1, // CookiePolicy.Enable
    preferences: savedPreferences,
    displayOptions: {
      textSize: 20,
      increaseSpacing: false
    },
    translationOptions: {
      language: savedTranslationLang,
      autoEnableWordTranslation: false,
      autoEnableDocumentTranslation: false
    },
    onPreferencesChanged: (preferences) => {
      // Save user preferences when they change
      localStorage.setItem('immersive-reader-preferences', preferences);
      console.log('Immersive Reader preferences saved');
      
      // Try to extract and save translation language from preferences
      try {
        const prefsObj = JSON.parse(preferences);
        if (prefsObj && prefsObj.translationLanguage) {
          localStorage.setItem('immersive-reader-translation-lang', prefsObj.translationLanguage);
          console.log('Translation language saved:', prefsObj.translationLanguage);
        }
      } catch (e) {
        // Preferences string format may vary, ignore parse errors
      }
    }
  }, options);
  
  if (!window.ImmersiveReader || !window.ImmersiveReader.launchAsync) throw new Error('Immersive Reader SDK not loaded');
  return await window.ImmersiveReader.launchAsync(creds.token, creds.subdomain, data, irOptions);
}

async function launchFromText(title, textContent, lang = 'zh-Hant', options = {}) {
  const html = plainTextToHtml(textContent || '');
  return launchFromHtml(title, html, lang, options);
}

export { ensureSdkLoaded, getTokenAndSubdomain, plainTextToHtml, launchFromHtml, launchFromText };
