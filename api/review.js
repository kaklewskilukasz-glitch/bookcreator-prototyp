export default {
  async fetch(request) {
    if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    try {
      const { title, text, language } = await request.json();
      if (!process.env.OPENAI_API_KEY) return Response.json({ error: 'Brak OPENAI_API_KEY w Vercel.' }, { status: 500 });
      if (!String(text || '').trim()) return Response.json({ error: 'Brak treści książki do sprawdzenia.' }, { status: 400 });
      const prompt = `Jesteś doświadczonym redaktorem książkowym. Przeczytaj CAŁĄ poniższą książkę i przygotuj raport redakcyjny. Nie przepisuj książki i nie zmieniaj jej automatycznie. Odpowiedz w języku książki: ${language || 'Polski'}.

Tytuł: ${title || 'Bez tytułu'}

Sprawdź szczególnie:
- czy całość i każdy rozdział mają sens i są logiczne,
- sprzeczności i błędy rozumowania,
- powtórzenia między rozdziałami,
- urwane myśli i słabe przejścia,
- fragmenty niepasujące do tematu,
- styl, klarowność i błędy językowe,
- spójność terminów, tonu i przekazu.

Najpierw podaj krótką ocenę całości w skali 1–10. Potem wypisz najważniejsze problemy, wskazując konkretny rozdział lub fragment, oraz konkretną propozycję poprawy. Na końcu podaj sekcję „Co jest dobre” i krótkie podsumowanie. Jeśli czegoś nie da się ocenić z tekstu, napisz to zamiast zgadywać.

KSIĄŻKA:
${String(text).slice(0,180000)}`;
      const r = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: 'gpt-6-luna', input: prompt, max_output_tokens: 8000 })
      });
      const data = await r.json();
      if (!r.ok) return Response.json({ error: data?.error?.message || 'Błąd OpenAI API' }, { status: r.status });
      const report = data.output_text || (data.output || []).flatMap(x => x.content || []).filter(x => x.type === 'output_text').map(x => x.text).join('\n');
      return Response.json({ report: report || 'Redaktor nie zwrócił raportu.' });
    } catch (e) {
      return Response.json({ error: e?.message || 'Nieznany błąd' }, { status: 500 });
    }
  }
};