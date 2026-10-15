export default {
  async fetch(request) {
    if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    try {
      const { text, action, language } = await request.json();
      if (!process.env.OPENAI_API_KEY) return Response.json({ error: 'Brak OPENAI_API_KEY w Vercel.' }, { status: 500 });
      if (!text || !String(text).trim()) return Response.json({ error: 'Najpierw zaznacz fragment tekstu.' }, { status: 400 });
      const tasks = {
        improve: 'Popraw ten fragment: zwiększ klarowność, naturalność, płynność i jakość języka, zachowując sens.',
        expand: 'Rozwiń ten fragment o wartościowe szczegóły i przykłady, bez lania wody i bez zmiany głównego sensu.',
        shorten: 'Skróć ten fragment, usuń powtórzenia i zbędne słowa, zachowując najważniejszy sens.',
        rewrite: 'Napisz ten fragment od nowa innymi słowami i konstrukcjami zdań, zachowując znaczenie i naturalny styl.'
      };
      const instruction = tasks[action] || tasks.improve;
      const prompt = `${instruction}\nJęzyk odpowiedzi: ${language || 'Polski'}.\nZwróć wyłącznie gotowy tekst zastępczy, bez komentarza i bez cudzysłowów.\n\nTEKST:\n${String(text).slice(0,12000)}`;
      const r = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: 'gpt-6-luna', input: prompt, max_output_tokens: 4000 })
      });
      const data = await r.json();
      if (!r.ok) return Response.json({ error: data?.error?.message || 'Błąd OpenAI API' }, { status: r.status });
      const output = data.output_text || (data.output || []).flatMap(x => x.content || []).filter(x => x.type === 'output_text').map(x => x.text).join('\n');
      if (!output || !output.trim()) throw Error('AI nie zwróciło poprawionego tekstu.');
      return Response.json({ text: output.trim() });
    } catch (e) {
      return Response.json({ error: e?.message || 'Nieznany błąd' }, { status: 500 });
    }
  }
};