export default {
  async fetch(request) {
    if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    try {
      const { title, topic, audience, language, style, materials, chapters } = await request.json();
      if (!process.env.OPENAI_API_KEY) return Response.json({ error: 'Brak OPENAI_API_KEY w Vercel.' }, { status: 500 });
      const chapterList = Array.isArray(chapters) ? chapters.filter(Boolean) : [];
      if (!chapterList.length) return Response.json({ error: 'Dodaj co najmniej jeden rozdział.' }, { status: 400 });
      const prompt = `Napisz książkę w języku ${language || 'polskim'}.
Tytuł: ${title || 'Bez tytułu'}
Temat: ${topic || ''}
Odbiorca: ${audience || ''}
Styl: ${style || 'Prosty i naturalny'}
Materiały autora: ${materials || 'Brak dodatkowych materiałów'}

Spis treści:
${chapterList.map((c,i)=>`${i+1}. ${c}`).join('\n')}

Napisz pełną, wartościową treść każdego rozdziału. Zachowaj podane tytuły rozdziałów. Pisz naturalnie, konkretnie i bez zbędnych powtórzeń. Zwróć wyłącznie treść książki z wyraźnymi nagłówkami rozdziałów.`;
      const r = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: 'gpt-6-luna', input: prompt, max_output_tokens: 12000 })
      });
      const data = await r.json();
      if (!r.ok) return Response.json({ error: data?.error?.message || 'Błąd OpenAI API' }, { status: r.status });
      const text = data.output_text || (data.output || []).flatMap(x => x.content || []).filter(x => x.type === 'output_text').map(x => x.text).join('\n');
      return Response.json({ text: text || 'Nie udało się odczytać wygenerowanej treści.' });
    } catch (e) {
      return Response.json({ error: e?.message || 'Nieznany błąd' }, { status: 500 });
    }
  }
};