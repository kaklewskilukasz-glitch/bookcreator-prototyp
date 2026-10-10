import { YouTubeTranscriptApi, extractVideoId } from 'extract-youtube';

export const config = { runtime: 'edge' };

export default async function handler(request) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }
  try {
    const { url } = await request.json();
    const videoId = extractVideoId(url || '');
    if (!videoId) return Response.json({ error: 'Nieprawidłowy link YouTube.' }, { status: 400 });

    const api = new YouTubeTranscriptApi();
    const transcript = await api.fetch(videoId);
    const rows = typeof transcript.toRawData === 'function' ? transcript.toRawData() : (transcript.snippets || []);
    const text = rows.map(x => x.text || '').filter(Boolean).join(' ');
    if (!text.trim()) return Response.json({ error: 'Ten film nie ma dostępnej transkrypcji.' }, { status: 404 });

    return Response.json({ videoId, text });
  } catch (e) {
    return Response.json({ error: 'Nie udało się pobrać transkrypcji YouTube: ' + (e?.message || 'nieznany błąd') }, { status: 502 });
  }
}
