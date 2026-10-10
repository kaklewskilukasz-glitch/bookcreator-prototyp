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

function transcriptText(data) {
  if (typeof data?.content === 'string') return clean(data.content);
  if (Array.isArray(data?.content)) {
    return clean(data.content.map(segment => {
      if (typeof segment === 'string') return segment;
      return segment?.text || '';
    }).filter(Boolean).join(' '));
  }
  if (typeof data?.text === 'string') return clean(data.text);
  return '';
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { url } = await request.json();
    const rawUrl = String(url || '').trim();
    const videoId = videoIdFromUrl(rawUrl);

    if (!videoId) {
      return Response.json({ error: 'Nieprawidłowy link YouTube.' }, { status: 400 });
    }
    if (!process.env.SUPADATA_API_KEY) {
      return Response.json({ error: 'Brak SUPADATA_API_KEY w Vercel.' }, { status: 500 });
    }

    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const params = new URLSearchParams({ url: youtubeUrl, lang: 'pl' });
    const endpoint = `https://api.supadata.ai/v1/transcript?${params.toString()}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'x-api-key': process.env.SUPADATA_API_KEY,
        'accept': 'application/json'
      }
    });

    const raw = await response.text();
    let data;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      console.error('Supadata returned non-JSON', response.status, raw.slice(0, 500));
      return Response.json({
        error: `Supadata zwróciła błędną odpowiedź (HTTP ${response.status}).`
      }, { status: 502 });
    }

    if (!response.ok) {
      const detail = typeof data?.message === 'string' ? data.message
        : typeof data?.details === 'string' ? data.details
        : typeof data?.error === 'string' ? data.error
        : `HTTP ${response.status}`;
      return Response.json({
        error: `Nie udało się odczytać transkrypcji YouTube: ${detail}`,
        videoId
      }, { status: response.status >= 400 && response.status < 600 ? response.status : 502 });
    }

    const text = transcriptText(data);
    if (!text) {
      return Response.json({
        error: 'Supadata nie zwróciła tekstu transkrypcji dla tego filmu.',
        videoId
      }, { status: 404 });
    }

    return Response.json({
      videoId,
      language: data?.lang || '',
      text: text.slice(0, 60000)
    });
  } catch (e) {
    console.error('YouTube endpoint error', e);
    return Response.json({
      error: 'Nie udało się pobrać transkrypcji YouTube: ' + (e?.message || 'nieznany błąd')
    }, { status: 502 });
  }
}
