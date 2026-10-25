export default {
  async fetch(request) {
    if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    try {
      const { title, topic, style, language, coverStyle, mood, instructions } = await request.json();
      if (!process.env.OPENAI_API_KEY) return Response.json({ error: 'Brak OPENAI_API_KEY w Vercel.' }, { status: 500 });
      const bookTitle = String(title || 'Bez tytułu').trim();
      const prompt = `Design ONLY the artwork/background for a premium bestselling nonfiction ebook cover. Book title for semantic context only: "${bookTitle}". Topic: ${String(topic || '').slice(0,1500)}. Writing style: ${style || 'natural'}. Language context: ${language || 'Polish'}.
Requested cover style: ${coverStyle || 'Premium / modern'}.
Requested mood and color direction: ${mood || 'Professional, sophisticated, strong contrast'}.
Author's custom visual directions: ${String(instructions || 'None').slice(0,2000)}.

Visual direction: sophisticated contemporary publishing design suitable for Amazon KDP; elegant, memorable, emotionally strong; one clear visual concept; premium editorial art direction; polished lighting, texture and depth; professional color harmony; compelling at thumbnail size. Follow the requested cover style, mood and custom directions whenever they do not conflict with the no-text requirement. Avoid cheap clip-art, childish cartoon aesthetics, stock-template appearance, clutter, UI graphics, charts, checklists and unnecessary decorative elements. Reserve calm negative space in the upper third for the app to place the title and some calm space near the bottom for the author name.

CRITICAL: artwork/background ONLY. Do NOT render the book title. Do NOT render any words, letters, numbers, typography, captions, logos, watermarks, signatures, labels or readable writing anywhere in the image.`;
      const r = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-image-2.5-flare',
          prompt,
          size: '1024x1536',
          quality: 'high',
          output_format: 'png'
        })
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