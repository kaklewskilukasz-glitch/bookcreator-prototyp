export default {
  async fetch(request) {
    if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    try {
      const { title, topic, style, language } = await request.json();
      if (!process.env.OPENAI_API_KEY) return Response.json({ error: 'Brak OPENAI_API_KEY w Vercel.' }, { status: 500 });
      const bookTitle = String(title || 'Bez tytułu').trim();
      const prompt = `Create a professional vertical ebook cover illustration for a book titled "${bookTitle}". Topic: ${String(topic || '').slice(0,1500)}. Writing style: ${style || 'natural'}. Language context: ${language || 'Polish'}. Premium publishing quality, strong focal composition, readable at thumbnail size. IMPORTANT: create artwork/background only, with NO words, NO letters, NO typography and NO logos; the app will add the exact title itself.`;
      const r = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: 'gpt-image-1', prompt, size: '1024x1536', quality: 'medium', output_format: 'png' })
      });
      const data = await r.json();
      if (!r.ok) return Response.json({ error: data?.error?.message || 'Błąd generowania okładki' }, { status: r.status });
      const b64 = data?.data?.[0]?.b64_json;
      if (!b64) throw Error('AI nie zwróciło obrazu okładki.');
      return Response.json({ image: `data:image/png;base64,${b64}` });
    } catch (e) {
      return Response.json({ error: e?.message || 'Nieznany błąd' }, { status: 500 });
    }
  }
};