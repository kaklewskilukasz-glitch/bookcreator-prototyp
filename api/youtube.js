import { getTranscript } from 'get-youtube-transcript';

function videoIdFromUrl(value = '') {
  try {
    const u = new URL(value);
    if (u.hostname === 'youtu.be') return u.pathname.split('/').filter(Boolean)[0] || '';
    if (u.hostname.endsWith('youtube.com')) {
      if (u.pathname === '/watch') return u.searchParams.get('v') || '';
      const m = u.pathname.match(/^\/(?:shorts|embed)\/([^/?]+)/);
      return m?.[1] || '';
    }
  } catch {}
  return /^[A-Za-z0-9_-]{11}$/.test(value) ? value : '';
}

export default async function handler(request) {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  try {
    const { url } = await request.json();
    const videoId = videoIdFromUrl(url || '');
    if (!videoId) return Response.json({ error: 'Nieprawidłowy link YouTube.' }, { status: 400 });

    let result;
    let firstError = '';
    try {
      result = await getTranscript(videoId, { languages: ['pl', 'en'] });
    } catch (e) {
      firstError = e?.message || String(e);
      try {
        result = await getTranscript(videoId);
      } catch (fallbackError) {
        const detail = fallbackError?.message || firstError || 'nieznany błąd biblioteki';
        console.error('YouTube transcript failed', { videoId, firstError, detail });
        return Response.json({
          error: 'Nie udało się odczytać transkrypcji YouTube: ' + detail,
          videoId
        }, { status: 502 });
      }
    }

    const text = (result?.text || '').replace(/\s+/g, ' ').trim();
    if (!text) return Response.json({ error: 'YouTube zwrócił pustą transkrypcję.', videoId }, { status: 404 });

    return Response.json({
      videoId,
      language: result?.language || '',
      text: text.slice(0, 60000)
    });
  } catch (e) {
    console.error('YouTube endpoint error', e);
    return Response.json({ error: 'Nie udało się pobrać transkrypcji YouTube: ' + (e?.message || 'nieznany błąd') }, { status: 502 });
  }
}
