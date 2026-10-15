export default {
  async fetch(request) {
    if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    try {
      const { title, topic, audience, language, style, materials, chapterCount } = await request.json();
      if (!process.env.OPENAI_API_KEY) return Response.json({ error: 'Brak OPENAI_API_KEY w Vercel.' }, { status: 500 });
      const sourceText = (materials || '').slice(0, 50000);
      const count = Math.max(3, Math.min(20, Number(chapterCount) || 7));
      const prompt = `Utwórz unikalny spis treści nowej książki w języku ${language || 'polskim'}.
Tytuł książki: ${title || 'Bez tytułu'}
Temat: ${topic || ''}
Odbiorca: ${audience || ''}
Styl: ${style || 'Prosty i naturalny'}

Materiały źródłowe autora:
${sourceText || 'Brak dodatkowych materiałów.'}

Zasady:
- Spis treści ma wynikać konkretnie z tytułu, tematu i materiałów źródłowych.
- Jeśli materiały pochodzą z istniejącego e-booka, zachowaj jego fakty, idee i sens, ale NIE kopiuj nazw rozdziałów ani spisu treści źródła.
- Stwórz nowe, oryginalne nazwy rozdziałów i inną strukturę redakcyjną.
- Nie używaj stałego szablonu, jeśli nie wynika on z tematu.
- Każde kolejne wygenerowanie może mieć inną strukturę i nazwy.
- Przygotuj DOKŁADNIE ${count} pozycji spisu treści łącznie. Jeśli pasuje do książki, pierwszą pozycją może być wstęp, ostatnią zakończenie, a pozostałe mają być głównymi rozdziałami.
- Zwróć WYŁĄCZNIE poprawny JSON w formacie: {"chapters":["pozycja 1","pozycja 2","..."]}`;
      const r = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: 'gpt-6-luna', input: prompt, max_output_tokens: 1800 })
      });
      const data = await r.json();
      if (!r.ok) return Response.json({ error: data?.error?.message || 'Błąd OpenAI API' }, { status: r.status });
      const text = data.output_text || (data.output || []).flatMap(x => x.content || []).filter(x => x.type === 'output_text').map(x => x.text).join('\n');
      const cleaned = String(text || '').replace(/^```json\s*/i,'').replace(/```\s*$/,'').trim();
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed.chapters) || parsed.chapters.length < 3) throw Error('AI nie zwróciło poprawnego spisu treści.');
      return Response.json({ chapters: parsed.chapters.map(String).slice(0,count) });
    } catch (e) {
      return Response.json({ error: e?.message || 'Nieznany błąd' }, { status: 500 });
    }
  }
};