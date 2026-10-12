export default {
  async fetch(request) {
    if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    try {
      const { title, topic, audience, language, style, materials, chapters, targetPages } = await request.json();
      if (!process.env.OPENAI_API_KEY) return Response.json({ error: 'Brak OPENAI_API_KEY w Vercel.' }, { status: 500 });
      const chapterList = Array.isArray(chapters) ? chapters.filter(Boolean) : [];
      if (!chapterList.length) return Response.json({ error: 'Dodaj co najmniej jeden rozdział.' }, { status: 400 });
      const sourceText = materials || 'Brak dodatkowych materiałów';
      const hasLinks = /https?:\/\/\S+/i.test(sourceText);
      const pages = Math.max(10, Math.min(500, Number(targetPages) || 100));
      const targetWords = Math.round(pages * 300);
      const wordsPerChapter = Math.max(500, Math.round(targetWords / chapterList.length));
      const prompt = `Napisz książkę w języku ${language || 'polskim'}.
Tytuł: ${title || 'Bez tytułu'}
Temat: ${topic || ''}
Odbiorca: ${audience || ''}
Styl: ${style || 'Prosty i naturalny'}
Docelowa długość: około ${pages} stron książki 6×9, czyli około ${targetWords} słów łącznie. Traktuj liczbę stron jako cel przybliżony. Rozłóż objętość sensownie pomiędzy wszystkie części; średnio około ${wordsPerChapter} słów na pozycję spisu, ale ważniejsza jest naturalna struktura i kompletność treści.

Materiały autora i źródła:
${sourceText}

Spis treści:
${chapterList.map((c,i)=>`${i+1}. ${c}`).join('\n')}

Jeśli w materiałach są linki WWW lub YouTube, użyj narzędzia web_search, aby odczytać dostępne publicznie informacje z tych źródeł. Dla YouTube oprzyj się na dostępnej treści filmu, transkrypcji/napisach lub wiarygodnych informacjach o materiale; nie wymyślaj treści, której nie udało się odczytać. Napisz pełną, wartościową treść każdego rozdziału. Zachowaj podane tytuły rozdziałów. Pisz naturalnie, konkretnie i bez zbędnych powtórzeń. Nie rozwlekaj tekstu sztucznie tylko po to, by osiągnąć długość. Zwróć wyłącznie treść książki z wyraźnymi nagłówkami rozdziałów.`;
      const body = { model: 'gpt-6-luna', input: prompt, max_output_tokens: 12000 };
      if (hasLinks) body.tools = [{ type: 'web_search' }];
      const r = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify(body)
      });
      const data = await r.json();
      if (!r.ok) return Response.json({ error: data?.error?.message || 'Błąd OpenAI API' }, { status: r.status });
      const text = data.output_text || (data.output || []).flatMap(x => x.content || []).filter(x => x.type === 'output_text').map(x => x.text).join('\n');
      return Response.json({ text: text || 'Nie udało się odczytać wygenerowanej treści.', targetPages: pages, targetWords });
    } catch (e) {
      return Response.json({ error: e?.message || 'Nieznany błąd' }, { status: 500 });
    }
  }
};