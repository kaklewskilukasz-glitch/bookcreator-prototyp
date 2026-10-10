import { BotGuardClient, getChallenge } from 'bgutils-js/botguard';
import { WebPoMinter } from 'bgutils-js/webpo';
import { buildURL, getHeaders } from 'bgutils-js/utils';
import { JSDOM } from 'jsdom';

const REQUEST_KEY = 'O43z0dpjhgX20SCx4KAo';
let poState = null;
let poInit = null;

function videoIdFromUrl(value='') {
  try {
    const u = new URL(value);
    if (u.hostname === 'youtu.be') return u.pathname.split('/').filter(Boolean)[0] || '';
    if (u.hostname.endsWith('youtube.com')) {
      if (u.pathname === '/watch') return u.searchParams.get('v') || '';
      const m = u.pathname.match(/^\/(?:shorts|embed)\/([^/?]+)/);
      return m?.[1] || '';
    }
  } catch {}
  return '';
}

function extractCaptionTracks(html) {
  const key = '"captionTracks":';
  const start = html.indexOf(key);
  if (start < 0) return [];
  let i = start + key.length, depth = 0, inString = false, escaped = false;
  for (; i < html.length && html[i] !== '['; i++);
  if (i >= html.length) return [];
  const begin = i;
  for (; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(html.slice(begin, i + 1)); } catch { return []; }
      }
    }
  }
  return [];
}

function textFromJson3(data) {
  return (data.events || []).map(e => (e.segs || []).map(s => s.utf8 || '').join('')).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

async function getPoMinter() {
  if (poState && poState.expiresAt > Date.now()) return poState.minter;
  if (poInit) return poInit;
  poInit = (async () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
      url: 'https://www.youtube.com/', referrer: 'https://www.youtube.com/'
    });
    Object.assign(globalThis, {
      window: dom.window, document: dom.window.document,
      location: dom.window.location, origin: dom.window.origin
    });
    if (!Reflect.has(globalThis, 'navigator')) Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator });

    const challenge = await getChallenge({ requestKey: REQUEST_KEY });
    if (!challenge?.interpreterJavascript) throw new Error('Brak wyzwania YouTube BotGuard.');
    new Function(challenge.interpreterJavascript)();
    const client = await BotGuardClient.create({
      program: challenge.program,
      globalName: challenge.globalName,
      globalObject: globalThis
    });
    const webPoSignalOutput = [];
    const botguardResponse = await client.snapshot({ webPoSignalOutput });
    const integrityResponse = await fetch(buildURL('GenerateIT', true), {
      method: 'POST', headers: getHeaders(), body: JSON.stringify([REQUEST_KEY, botguardResponse])
    });
    if (!integrityResponse.ok) throw new Error('Nie udało się uzyskać tokenu YouTube.');
    const integrity = await integrityResponse.json();
    if (typeof integrity?.[0] !== 'string') throw new Error('YouTube nie zwrócił tokenu integralności.');
    const minter = await WebPoMinter.create({
      integrityToken: integrity[0],
      estimatedTtlSecs: integrity[1],
      mintRefreshThreshold: integrity[2],
      websafeFallbackToken: integrity[3]
    }, webPoSignalOutput);
    poState = { minter, expiresAt: Date.now() + Math.max(300, Number(integrity[1]) || 3600) * 1000 };
    return minter;
  })().finally(() => { poInit = null; });
  return poInit;
}

export default async function handler(request) {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  try {
    const { url } = await request.json();
    const videoId = videoIdFromUrl(url || '');
    if (!videoId) return Response.json({ error: 'Nieprawidłowy link YouTube.' }, { status: 400 });

    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
    const page = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&hl=pl`, {
      headers: { 'user-agent': ua, 'accept-language': 'pl-PL,pl;q=0.9,en;q=0.8' }
    });
    if (!page.ok) throw new Error('YouTube nie zwrócił strony filmu.');
    const html = await page.text();
    const tracks = extractCaptionTracks(html);
    if (!tracks.length) return Response.json({ error: 'Ten film nie ma dostępnych napisów/transkrypcji.' }, { status: 404 });

    const track = tracks.find(t => t.languageCode === 'pl') || tracks.find(t => t.languageCode === 'en') || tracks[0];
    const captionUrl = track.baseUrl || '';
    if (!captionUrl) return Response.json({ error: 'Nie znaleziono adresu transkrypcji.' }, { status: 404 });

    const minter = await getPoMinter();
    const poToken = await minter.mintAsWebsafeString(videoId);
    const capUrl = new URL(captionUrl);
    capUrl.searchParams.set('fmt', 'json3');
    capUrl.searchParams.set('c', 'WEB');
    capUrl.searchParams.set('potc', '1');
    capUrl.searchParams.set('pot', poToken);
    const cap = await fetch(capUrl, { headers: { 'user-agent': ua, 'referer': `https://www.youtube.com/watch?v=${videoId}` } });
    if (!cap.ok) throw new Error('Nie udało się pobrać napisów.');
    const raw = await cap.text();
    if (!raw.trim()) throw new Error('YouTube zwrócił pustą transkrypcję.');
    const text = textFromJson3(JSON.parse(raw));
    if (!text) return Response.json({ error: 'Transkrypcja jest pusta.' }, { status: 404 });

    return Response.json({ videoId, language: track.languageCode || '', text: text.slice(0, 60000) });
  } catch (e) {
    return Response.json({ error: 'Nie udało się pobrać transkrypcji YouTube: ' + (e?.message || 'nieznany błąd') }, { status: 502 });
  }
}
