import { createClient } from '@supabase/supabase-js';

function client(req) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const auth = req.headers.authorization || '';
  if (!url || !key) throw new Error('Brak konfiguracji Supabase');
  return createClient(url, key, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
}

export default async function handler(req, res) {
  try {
    const sb = client(req);
    const { data: { user }, error: userError } = await sb.auth.getUser();
    if (userError || !user) return res.status(401).json({ error: 'Zaloguj się ponownie.' });

    if (req.method === 'GET') {
      const { data, error } = await sb.from('books').select('id,title,data,updated_at').order('updated_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json({ books: data || [] });
    }
    if (req.method === 'POST') {
      const { id, title, content, html } = req.body || {};
      const row = { user_id: user.id, title: (title || 'Bez tytułu').trim(), data: { content: content || '', html: html || '' }, updated_at: new Date().toISOString() };
      let q = id ? sb.from('books').update(row).eq('id', id).select('id,title,data,updated_at').single()
                 : sb.from('books').insert(row).select('id,title,data,updated_at').single();
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json({ book: data });
    }
    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'Brak ID książki.' });
      const { error } = await sb.from('books').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Błąd zapisu książki' });
  }
}
