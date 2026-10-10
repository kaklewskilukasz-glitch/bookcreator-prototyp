export const maxDuration = 60;

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
function transcriptText(data) {
  const root = data?.data || data || {};
  if (typeof root.content === 'string') return clean(root.content);
  if (Array.isArray(root.content)) return clean(root.content.map(x => typeof x === 'string' ? x : x?.text || '').filter(Boolean).join(' '));
  if (typeof root.text === 'string') return clean(root.text);
  return '';
}
function detailFrom(data, fallback) {
  return data?.message || data?.details || (typeof data?.error === 'string' ? data.error : data?.error?.message) || fallback;
}
async function getJson(url, apiKey) {
  const response = await fetch(url, { headers: { 'x-api-key': apiKey, accept: 'application/json' } });
  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; }
  catch { throw new Error(`Supadata zwróciła odpowiedź inną niż JSON (HTTP ${response.status}).`); }
  return { response, data };
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

export default async function handler(request) {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  try {
    const { url } = await request.json();
    const videoId = videoIdFromUrl(String(url || '').trim());
    if (!videoId) return Response.json({ error: 'Nieprawidłowy link YouTube.' }, { status: 400 });
    const apiKey = process.env.SUPADATA_API_KEY;
    if (!apiKey) return Response.json({ error: 'Brak SUPADATA_API_KEY w Vercel.' }, { status: 500 });

    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    // Current Supadata endpoint. lang is intentionally supplied because it also avoids
    // false transcript-unavailable responses reported for non-default caption languages.
    const params = new URLSearchParams({ url: youtubeUrl, lang: 'pl', text: 'true' });
    let { response, data } = await getJson(`https://api.supadata.ai/v1/transcript?${params}`, apiKey);

    if (response.status === 202 || data?.jobId) {
      const jobId = data?.jobId;
      if (!jobId) return Response.json({ error: 'Supadata rozpoczęła transkrypcję, ale nie zwróciła jobId.', videoId }, { status: 502 });
      const resultUrl = `https://api.supadata.ai/v1/transcript/${encodeURIComponent(jobId)}`;
      const deadline = Date.now() + 50000;
      while (Date.now() < deadline) {
        await sleep(1500);
        ({ response, data } = await getJson(resultUrl, apiKey));
        if (response.status === 202) continue;
        if (!response.ok) return Response.json({ error: `Błąd transkrypcji YouTube: ${detailFrom(data, `HTTP ${response.status}`)}`, videoId }, { status: response.status });
        const status = String(data?.status || data?.data?.status || '').toLowerCase();
        if (status === 'queued' || status === 'processing' || status === 'pending') continue;
        if (status === 'failed') return Response.json({ error: `Generowanie transkrypcji nie powiodło się: ${detailFrom(data, 'błąd zadania')}`, videoId }, { status: 502 });
        const text = transcriptText(data);
        if (text) return Response.json({ videoId, language: data?.lang || data?.data?.lang || '', text: text.slice(0, 60000) });
      }
      return Response.json({ error: 'Transkrypcja nadal się generuje. Spróbuj ponownie za chwilę.', videoId }, { status: 504 });
    }

    if (!response.ok) return Response.json({ error: `Nie udało się odczytać transkrypcji YouTube: ${detailFrom(data, `HTTP ${response.status}`)}`, videoId }, { status: response.status });
    const text = transcriptText(data);
    if (!text) return Response.json({ error: 'Supadata nie zwróciła tekstu transkrypcji dla tego filmu.', videoId }, { status: 404 });
    return Response.json({ videoId, language: data?.lang || '', text: text.slice(0, 60000) });
  } catch (e) {
    console.error('YouTube endpoint error', e);
    return Response.json({ error: 'Nie udało się pobrać transkrypcji YouTube: ' + (e?.message || 'nieznany błąd') }, { status: 502 });
  }
}
