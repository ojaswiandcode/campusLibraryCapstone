import { useEffect, useState } from 'react';
import { api, fmtDate, rupees } from '../api.js';

export default function Reports() {
  const [top, setTop] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [err, setErr] = useState('');
  const [sum, setSum] = useState(null);

  useEffect(() => {
    Promise.all([api('/reports/most-borrowed'), api('/reports/overdue'), api('/reports/summary')])
      .then(([t, o, s]) => { setTop(t); setOverdue(o); setSum(s); })
      .catch((e) => setErr(e.message));
  }, []);

  const max = Math.max(1, ...top.map((t) => t.count));

  return (
    <section>
      <h2 className="title">Reports</h2>
      {err && <p className="error">{err}</p>}
      {sum && (
        <div className="stats">
          <div><b>{sum.titles}</b><span>Titles ({sum.copies} copies)</span></div>
          <div><b>{sum.available}</b><span>Copies on shelf</span></div>
          <div><b>{sum.issued}</b><span>Out right now</span></div>
          <div className={sum.overdue ? 'warn' : ''}><b>{sum.overdue}</b><span>Overdue</span></div>
          <div><b>{sum.members}</b><span>Student members</span></div>
          <div><b>₹{sum.feesCollected}</b><span>Late fees charged</span></div>
        </div>
      )}

      <h3>Most borrowed books</h3>
      <ul className="bars">
        {top.map((t) => (
          <li key={t.bookId}>
            <span className="grow">{t.title} <span className="muted">· {t.author}</span></span>
            <div className="bar"><i style={{ width: `${(t.count / max) * 100}%` }} /></div>
            <b>{t.count}</b>
          </li>
        ))}
        {!top.length && <li className="muted">No borrowing data yet.</li>}
      </ul>

      <h3>Overdue books ({overdue.length})</h3>
      <table>
        <thead><tr><th>Book</th><th>Student</th><th>Due</th><th>Days late</th><th>Fee</th></tr></thead>
        <tbody>
          {overdue.map((o) => (
            <tr key={o._id}>
              <td>{o.title}</td>
              <td>{o.studentName}<div className="muted">{o.studentEmail}</div></td>
              <td>{fmtDate(o.dueDate)}</td><td>{o.daysOverdue}</td><td>{rupees(o.fee)}</td>
            </tr>
          ))}
          {!overdue.length && <tr><td colSpan="5" className="muted">Nothing overdue. Nice.</td></tr>}
        </tbody>
      </table>
    </section>
  );
}