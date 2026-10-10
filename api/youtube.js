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

function clean(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function transcriptText(data) {
  if (typeof data?.content === 'string') return clean(data.content);
  if (Array.isArray(data?.content)) return clean(data.content.map(x => typeof x === 'string' ? x : x?.text || '').filter(Boolean).join(' '));
  if (typeof data?.text === 'string') return clean(data.text);
  if (typeof data?.data?.content === 'string') return clean(data.data.content);
  if (Array.isArray(data?.data?.content)) return clean(data.data.content.map(x => typeof x === 'string' ? x : x?.text || '').filter(Boolean).join(' '));
  if (typeof data?.data?.text === 'string') return clean(data.data.text);
  return '';
}

function detailFrom(data, fallback) {
  if (typeof data?.message === 'string') return data.message;
  if (typeof data?.details === 'string') return data.details;
  if (typeof data?.error === 'string') return data.error;
  if (typeof data?.error?.message === 'string') return data.error.message;
  return fallback;
}

async function supadataJson(url, apiKey) {
  const response = await fetch(url, {
    headers: { 'x-api-key': apiKey, accept: 'application/json' }
  });
  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; }
  catch {
    throw new Error(`Supadata zwróciła odpowiedź inną niż JSON (HTTP ${response.status}).`);
  }
  return { response, data };
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export default async function handler(request) {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  try {
    const { url } = await request.json();
    const rawUrl = String(url || '').trim();
    const videoId = videoIdFromUrl(rawUrl);
    if (!videoId) return Response.json({ error: 'Nieprawidłowy link YouTube.' }, { status: 400 });

    const apiKey = process.env.SUPADATA_API_KEY;
    if (!apiKey) return Response.json({ error: 'Brak SUPADATA_API_KEY w Vercel.' }, { status: 500 });

    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const params = new URLSearchParams({ url: youtubeUrl, lang: 'pl', text: 'true', mode: 'auto' });
    const startUrl = `https://api.supadata.ai/v1/transcript?${params.toString()}`;
    let { response, data } = await supadataJson(startUrl, apiKey);

    if (!response.ok && response.status !== 202) {
      return Response.json({ error: `Nie udało się odczytać transkrypcji YouTube: ${detailFrom(data, `HTTP ${response.status}`)}`, videoId }, { status: response.status });
    }

    // Supadata returns a jobId when a transcript must be generated asynchronously.
    if (response.status === 202 || data?.jobId) {
      const jobId = data?.jobId;
      if (!jobId) return Response.json({ error: 'Supadata rozpoczęła zadanie, ale nie zwróciła jobId.', videoId }, { status: 502 });

      const resultUrl = `https://api.supadata.ai/v1/transcript/${encodeURIComponent(jobId)}`;
      const deadline = Date.now() + 45000;

      while (Date.now() < deadline) {
        await sleep(1000);
        ({ response, data } = await supadataJson(resultUrl, apiKey));

        if (!response.ok) {
          return Response.json({ error: `Błąd pobierania wygenerowanej transkrypcji: ${detailFrom(data, `HTTP ${response.status}`)}`, videoId }, { status: response.status });
        }

        const status = String(data?.status || '').toLowerCase();
        if (status === 'failed') {
          return Response.json({ error: `Generowanie transkrypcji nie powiodło się: ${detailFrom(data, 'Supadata zgłosiła błąd zadania.')}`, videoId }, { status: 502 });
        }

        const text = transcriptText(data);
        if (status === 'completed' || text) {
          if (!text) return Response.json({ error: 'Supadata zakończyła zadanie, ale nie zwróciła tekstu transkrypcji.', videoId }, { status: 404 });
          return Response.json({ videoId, language: data?.lang || data?.data?.lang || '', text: text.slice(0, 60000) });
        }
      }

      return Response.json({ error: 'Transkrypcja jest generowana dłużej niż 45 sekund. Spróbuj ponownie za chwilę.', videoId }, { status: 504 });
    }

    const text = transcriptText(data);
    if (!text) return Response.json({ error: 'Supadata nie zwróciła tekstu transkrypcji dla tego filmu.', videoId }, { status: 404 });

    return Response.json({ videoId, language: data?.lang || '', text: text.slice(0, 60000) });
  } catch (e) {
    console.error('YouTube endpoint error', e);
    return Response.json({ error: 'Nie udało się pobrać transkrypcji YouTube: ' + (e?.message || 'nieznany błąd') }, { status: 502 });
  }
}
