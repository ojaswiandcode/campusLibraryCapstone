import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/Toast.jsx';

const EMPTY = { title: '', author: '', category: '', isbn: '', totalCopies: 1 };
// Stable cover colour per category, so each shelf section looks consistent
const hue = (c) => [...c].reduce((a, ch) => a + ch.charCodeAt(0) * 7, 0) % 360;

export default function Books() {
  const { user } = useAuth();
  const toast = useToast();
  const staff = user.role !== 'student';
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [cats, setCats] = useState([]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null);

  const load = useCallback(async () => {
    const p = new URLSearchParams({ page, limit: 8, search: query, category });
    setData(await api(`/books?${p}`));
    setCats(await api('/books/categories'));
  }, [page, query, category]);

  useEffect(() => { load().catch((e) => toast(e.message, 'error')); }, [load]);

  const act = async (fn, okText) => {
    try { const r = await fn(); if (okText) toast(typeof okText === 'function' ? okText(r) : okText); load(); }
    catch (ex) { toast(ex.message, 'error'); }
  };

  const borrow = (b) => act(
    () => api('/issues/borrow', { method: 'POST', body: { bookId: b._id } }),
    (r) => `Borrowed "${b.title}". Due ${new Date(r.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}.`
  );

  const save = (e) => {
    e.preventDefault();
    const body = { ...form, totalCopies: Number(form.totalCopies) };
    act(() => (form._id ? api(`/books/${form._id}`, { method: 'PUT', body }) : api('/books', { method: 'POST', body })),
      form._id ? 'Book updated' : 'Book added').then(() => setForm(null));
  };

  const remove = (b) => confirm(`Delete "${b.title}"?`) && act(() => api(`/books/${b._id}`, { method: 'DELETE' }), 'Book deleted');

  return (
    <section>
      <div className="hero">
        <div>
          <h2>{staff ? 'Manage the shelves' : `Hi ${user.name.split(' ')[0]}, what are you reading next?`}</h2>
          <p>{data.total} {data.total === 1 ? 'book' : 'books'} {query || category ? 'match your filters' : 'in the library'}</p>
        </div>
        <form className="searchbar" onSubmit={(e) => { e.preventDefault(); setPage(1); setQuery(search); }}>
          <input placeholder="Search by title, author or category" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="sun">Search</button>
        </form>
      </div>

      <div className="chips">
        {['', ...cats].map((c) => (
          <button key={c || 'all'} className={`chip ${category === c ? 'on' : ''}`} onClick={() => { setCategory(c); setPage(1); }}>
            {c || 'All'}
          </button>
        ))}
        {staff && <button className="add" onClick={() => setForm({ ...EMPTY })}>Add book</button>}
      </div>

      {form && (
        <form className="panel grid" onSubmit={save}>
          <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <input placeholder="Author" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} required />
          <input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
          <input placeholder="ISBN (optional)" value={form.isbn || ''} onChange={(e) => setForm({ ...form, isbn: e.target.value })} />
          <input type="number" min="1" placeholder="Total copies" value={form.totalCopies} onChange={(e) => setForm({ ...form, totalCopies: e.target.value })} required />
          <div className="row">
            <button>{form._id ? 'Save changes' : 'Add book'}</button>
            <button type="button" className="ghost" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="books">
        {data.items.map((b) => (
          <article key={b._id} className="book">
            <div className="cover" style={{ '--h': hue(b.category) }}>
              <span className="cat">{b.category}</span>
              <h4>{b.title}</h4>
              <span className="by">{b.author}</span>
            </div>
            <span className={b.availableCopies ? 'pill good' : 'pill bad'}>
              {b.availableCopies ? `${b.availableCopies} of ${b.totalCopies} on shelf` : 'All copies out'}
            </span>
            {staff ? (
              <div className="row">
                <button className="ghost" onClick={() => setForm(b)}>Edit</button>
                <button className="ghost danger" onClick={() => remove(b)}>Delete</button>
              </div>
            ) : b.borrowed ? (
              <button className="ghost" disabled>You have this</button>
            ) : (
              <button disabled={!b.availableCopies} onClick={() => borrow(b)}>{b.availableCopies ? 'Borrow' : 'Unavailable'}</button>
            )}
          </article>
        ))}
      </div>
      {!data.items.length && <p className="empty">No books match that. Try another title, author or category.</p>}

      <div className="row center">
        <button className="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span>Page {data.page || page} of {data.pages}</span>
        <button className="ghost" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
      </div>
    </section>
  );
}