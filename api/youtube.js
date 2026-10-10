function videoIdFromUrl(value = '') {
  try {
    const u = new URL(value);
    if (u.hostname === 'youtu.be') return u.pathname.split('/').filter(Boolean)[0] || '';
    if (u.hostname.endsWith('youtube.com')) {
      if (u.pathname === '/watch') return u.searchParams.get('v') || '';
      const m = u.pathname.match(/^\/(?:shorts|embed|live)\/([^/?]+)/);
      return m?.[1] || '';
    }
  } catch {}
  return /^[A-Za-z0-9_-]{11}$/.test(value) ? value : '';
}

function clean(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function getText(data) {
  if (typeof data?.content === 'string') return clean(data.content);
  if (Array.isArray(data?.content)) {
    return clean(data.content.map(x => typeof x === 'string' ? x : x?.text || '').filter(Boolean).join(' '));
  }
  if (typeof data?.text === 'string') return clean(data.text);
  return '';
}

export default async function handler(request) {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  try {
    const { url } = await request.json();
    const rawUrl = (url || '').trim();
    const videoId = videoIdFromUrl(rawUrl);
    if (!videoId) return Response.json({ error: 'Nieprawidłowy link YouTube.' }, { status: 400 });
    if (!process.env.SUPADATA_API_KEY) {
      return Response.json({ error: 'Brak SUPADATA_API_KEY w Vercel.' }, { status: 500 });
    }

    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const endpoint = `https://api.supadata.ai/v1/transcript?url=${encodeURIComponent(youtubeUrl)}&lang=pl&text=true`;
    const response = await fetch(endpoint, {
      headers: { 'x-api-key': process.env.SUPADATA_API_KEY, 'accept': 'application/json' }
    });

    const raw = await response.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; }
    catch {
      console.error('Supadata non-JSON response', { status: response.status, raw: raw.slice(0, 500) });
      return Response.json({ error: `Supadata zwróciła nieprawidłową odpowiedź (HTTP ${response.status}).` }, { status: 502 });
    }

    if (!response.ok) {
      const detail = data?.message || data?.error || `HTTP ${response.status}`;
      console.error('Supadata transcript failed', { videoId, status: response.status, detail });
      return Response.json({ error: 'Nie udało się odczytać transkrypcji YouTube: ' + detail, videoId }, { status: 502 });
    }

    const text = getText(data);
    if (!text) {
      return Response.json({ error: 'YouTube nie zwrócił treści transkrypcji.', videoId }, { status: 404 });
    }

    return Response.json({ videoId, language: data?.lang || '', text: text.slice(0, 60000) });
  } catch (e) {
    console.error('YouTube endpoint error', e);
    return Response.json({ error: 'Nie udało się pobrać transkrypcji YouTube: ' + (e?.message || 'nieznany błąd') }, { status: 502 });
  }
}
