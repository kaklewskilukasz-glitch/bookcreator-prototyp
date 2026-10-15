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

function clean(value = '') { return String(value).replace(/\s+/g, ' ').trim(); }
function transcriptText(data = {}) {
  if (typeof data.content === 'string') return clean(data.content);
  if (Array.isArray(data.content)) return clean(data.content.map(x => typeof x === 'string' ? x : x?.text || '').filter(Boolean).join(' '));
  if (typeof data.text === 'string') return clean(data.text);
  return '';
}
function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8').send(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const videoId = videoIdFromUrl(String(body.url || '').trim());
    if (!videoId) return json(res, 400, { error: 'Nieprawidłowy link YouTube.' });

    const apiKey = process.env.SUPADATA_API_KEY;
    if (!apiKey) return json(res, 500, { error: 'Brak SUPADATA_API_KEY w Vercel.' });

    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const params = new URLSearchParams({ url: youtubeUrl, lang: 'pl', text: 'true' });
    const upstream = await fetch(`https://api.supadata.ai/v1/transcript?${params.toString()}`, {
      headers: { 'x-api-key': apiKey, accept: 'application/json' }
    });
    const raw = await upstream.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; }
    catch { return json(res, 502, { error: `Supadata zwróciła nieprawidłową odpowiedź HTTP ${upstream.status}.` }); }

    if (!upstream.ok) {
      const detail = data?.message || data?.details || data?.error || `HTTP ${upstream.status}`;
      return json(res, upstream.status, { error: `Nie udało się pobrać transkrypcji: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`, videoId });
    }

    const text = transcriptText(data);
    if (!text) return json(res, 404, { error: 'Supadata nie zwróciła tekstu transkrypcji dla tego filmu.', videoId });
    return json(res, 200, { videoId, language: data?.lang || '', text: text.slice(0, 60000) });
  } catch (e) {
    console.error('youtube function error', e);
    return json(res, 502, { error: 'Nie udało się pobrać transkrypcji YouTube: ' + (e?.message || 'nieznany błąd') });
  }
}
