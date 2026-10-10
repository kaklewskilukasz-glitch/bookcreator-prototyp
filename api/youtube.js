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

function decodeJsonString(s) {
  try { return JSON.parse('"' + s.replace(/"/g, '\\"') + '"'); } catch { return s.replace(/\\u0026/g, '&').replace(/\\\//g, '/'); }
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

export default async function handler(request) {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  try {
    const { url } = await request.json();
    const videoId = videoIdFromUrl(url || '');
    if (!videoId) return Response.json({ error: 'Nieprawidłowy link YouTube.' }, { status: 400 });

    const page = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&hl=pl`, {
      headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', 'accept-language': 'pl-PL,pl;q=0.9,en;q=0.8' }
    });
    if (!page.ok) throw new Error('YouTube nie zwrócił strony filmu.');
    const html = await page.text();
    const tracks = extractCaptionTracks(html);
    if (!tracks.length) return Response.json({ error: 'Ten film nie ma dostępnych napisów/transkrypcji.' }, { status: 404 });

    const track = tracks.find(t => t.languageCode === 'pl') || tracks.find(t => t.languageCode === 'en') || tracks[0];
    const captionUrl = decodeJsonString(track.baseUrl || '');
    if (!captionUrl) return Response.json({ error: 'Nie znaleziono adresu transkrypcji.' }, { status: 404 });
    const cap = await fetch(captionUrl + (captionUrl.includes('?') ? '&' : '?') + 'fmt=json3');
    if (!cap.ok) throw new Error('Nie udało się pobrać napisów.');
    const data = await cap.json();
    const text = textFromJson3(data);
    if (!text) return Response.json({ error: 'Transkrypcja jest pusta.' }, { status: 404 });

    return Response.json({ videoId, language: track.languageCode || '', text: text.slice(0, 60000) });
  } catch (e) {
    return Response.json({ error: 'Nie udało się pobrać transkrypcji YouTube: ' + (e?.message || 'nieznany błąd') }, { status: 502 });
  }
}
