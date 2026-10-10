import { getTranscript } from 'get-youtube-transcript';

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

function transcriptText(result) {
  if (!result) return '';
  if (typeof result === 'string') return clean(result);
  if (typeof result.text === 'string' && result.text.trim()) return clean(result.text);

  const segments = Array.isArray(result) ? result :
    Array.isArray(result.segments) ? result.segments :
    Array.isArray(result.transcript) ? result.transcript : [];

  return clean(segments.map((item) => {
    if (typeof item === 'string') return item;
    return item?.text ?? item?.content ?? item?.utf8 ?? '';
  }).filter(Boolean).join(' '));
}

async function tryTranscript(input, options) {
  try {
    const result = await getTranscript(input, options);
    const text = transcriptText(result);
    if (text) return { ok: true, result, text };
    return { ok: false, error: result?.available === false ? 'Film nie udostępnia transkrypcji.' : 'YouTube zwrócił pustą transkrypcję.' };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export default async function handler(request) {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  try {
    const { url } = await request.json();
    const videoId = videoIdFromUrl((url || '').trim());
    if (!videoId) return Response.json({ error: 'Nieprawidłowy link YouTube.' }, { status: 400 });

    const attempts = [
      { languages: ['pl', 'en'] },
      { languages: ['en', 'pl'] },
      undefined
    ];

    let lastError = '';
    for (const options of attempts) {
      const attempt = await tryTranscript(videoId, options);
      if (attempt.ok) {
        return Response.json({
          videoId,
          language: attempt.result?.language || '',
          text: attempt.text.slice(0, 60000)
        });
      }
      lastError = attempt.error || lastError;
    }

    console.error('YouTube transcript failed', { videoId, error: lastError });
    return Response.json({
      error: 'Nie udało się odczytać transkrypcji YouTube: ' + (lastError || 'YouTube zablokował pobranie napisów albo film nie ma dostępnej transkrypcji.'),
      videoId
    }, { status: 502 });
  } catch (e) {
    console.error('YouTube endpoint error', e);
    return Response.json({ error: 'Nie udało się pobrać transkrypcji YouTube: ' + (e?.message || 'nieznany błąd') }, { status: 502 });
  }
}
