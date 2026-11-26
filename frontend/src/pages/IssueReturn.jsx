import { useCallback, useEffect, useState } from 'react';
import { api, fmtDate, rupees } from '../api.js';
import { useToast } from '../context/Toast.jsx';

export default function IssueReturn() {
  const toast = useToast();
  const [books, setBooks] = useState([]);
  const [active, setActive] = useState([]);
  const [unpaid, setUnpaid] = useState([]);
  const [email, setEmail] = useState('');
  const [bookId, setBookId] = useState('');

  const load = useCallback(async () => {
    const b = await api('/books?limit=100');
    setBooks(b.items.filter((x) => x.availableCopies > 0));
    setActive(await api('/issues?status=issued'));
    setUnpaid(await api('/issues?status=returned&unpaid=1'));
  }, []);
  useEffect(() => { load().catch((e) => toast(e.message, 'error')); }, [load]);

  const run = async (fn, okText) => {
    try { const r = await fn(); toast(typeof okText === 'function' ? okText(r) : okText); load(); return true; }
    catch (ex) { toast(ex.message, 'error'); return false; }
  };

  const issue = async (e) => {
    e.preventDefault();
    const ok = await run(() => api('/issues', { method: 'POST', body: { studentEmail: email, bookId } }),
      (rec) => `Issued. Due on ${fmtDate(rec.dueDate)}.`);
    if (ok) { setEmail(''); setBookId(''); }
  };

  return (
    <section>
      <h2 className="title">Issue & return</h2>
      <form className="panel row" onSubmit={issue}>
        <input className="grow" type="email" placeholder="Student email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <select className="grow" value={bookId} onChange={(e) => setBookId(e.target.value)} required>
          <option value="">Choose a book</option>
          {books.map((b) => <option key={b._id} value={b._id}>{b.title} ({b.availableCopies} left)</option>)}
        </select>
        <button>Issue book</button>
      </form>

      <h3>Currently issued ({active.length})</h3>
      <table>
        <thead><tr><th>Book</th><th>Student</th><th>Due</th><th>Fee if returned now</th><th></th></tr></thead>
        <tbody>
          {active.map((r) => (
            <tr key={r._id}>
              <td>{r.book?.title}</td>
              <td>{r.student?.name}<div className="muted">{r.student?.email}</div></td>
              <td>{fmtDate(r.dueDate)} {r.daysLate > 0 && <span className="pill bad">{r.daysLate}d late</span>}</td>
              <td>{rupees(r.currentFee)}</td>
              <td><button onClick={() => run(() => api(`/issues/${r._id}/return`, { method: 'POST' }),
                (rec) => rec.lateFee ? `Returned. Collect late fee of ${rupees(rec.lateFee)}.` : 'Returned. No late fee.')}>Return</button></td>
            </tr>
          ))}
          {!active.length && <tr><td colSpan="5" className="muted">No books are out right now.</td></tr>}
        </tbody>
      </table>

      <h3>Late fees to collect ({unpaid.length})</h3>
      <table>
        <thead><tr><th>Student</th><th>Book</th><th>Returned</th><th>Fee</th><th></th></tr></thead>
        <tbody>
          {unpaid.map((r) => (
            <tr key={r._id}>
              <td>{r.student?.name}<div className="muted">{r.student?.email}</div></td>
              <td>{r.book?.title}</td><td>{fmtDate(r.returnDate)}</td><td><b>{rupees(r.lateFee)}</b></td>
              <td><button onClick={() => run(() => api(`/issues/${r._id}/pay`, { method: 'POST' }), 'Marked as paid')}>Mark paid</button></td>
            </tr>
          ))}
          {!unpaid.length && <tr><td colSpan="5" className="muted">No pending fees.</td></tr>}
        </tbody>
      </table>
    </section>
  );
}