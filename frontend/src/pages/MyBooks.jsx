import { useCallback, useEffect, useState } from 'react';
import { api, fmtDate, rupees } from '../api.js';
import { useToast } from '../context/Toast.jsx';

const hue = (c = '') => [...c].reduce((a, ch) => a + ch.charCodeAt(0) * 7, 0) % 360;
const dueText = (r) => {
  if (r.overdue) return `${r.daysLate} ${r.daysLate === 1 ? 'day' : 'days'} late`;
  const left = Math.ceil((new Date(r.dueDate) - Date.now()) / 864e5);
  return left <= 0 ? 'Due today' : `${left} ${left === 1 ? 'day' : 'days'} left`;
};

export default function MyBooks() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const load = useCallback(() => api('/issues/my').then(setRows).catch((e) => toast(e.message, 'error')), []);
  useEffect(() => { load(); }, [load]);

  const call = async (r, action, okText) => {
    try { const rec = await api(`/issues/${r._id}/${action}`, { method: 'POST' }); toast(okText(rec)); load(); }
    catch (ex) { toast(ex.message, 'error'); }
  };
  const giveBack = (r) => call(r, 'return', (rec) =>
    rec.lateFee ? `Returned. Late fee to pay at the desk: ${rupees(rec.lateFee)}` : `Returned "${r.book?.title}". No late fee.`);
  const renew = (r) => call(r, 'renew', (rec) => `Renewed. New due date: ${fmtDate(rec.dueDate)}`);

  const issued = rows.filter((r) => r.status === 'issued');
  const past = rows.filter((r) => r.status === 'returned');
  const overdue = issued.filter((r) => r.overdue);
  const accruing = issued.reduce((s, r) => s + r.currentFee, 0);
  const unpaid = past.filter((r) => r.lateFee > 0 && !r.feePaid).reduce((s, r) => s + r.lateFee, 0);

  return (
    <section>
      <h2 className="title">My books</h2>
      <div className="stats">
        <div><b>{issued.length}</b><span>Borrowed now</span></div>
        <div className={overdue.length ? 'warn' : ''}><b>{overdue.length}</b><span>Overdue</span></div>
        <div className={accruing ? 'warn' : ''}><b>{rupees(accruing)}</b><span>Late fee building up</span></div>
        <div className={unpaid ? 'warn' : ''}><b>{rupees(unpaid)}</b><span>Unpaid fees to clear</span></div>
      </div>

      <h3>Borrowed now</h3>
      <ul className="loans">
        {issued.map((r) => (
          <li key={r._id}>
            <div className="mini" style={{ '--h': hue(r.book?.category) }} />
            <div className="grow">
              <strong>{r.book?.title}</strong>
              <div className="muted">
                {r.book?.author} · borrowed {fmtDate(r.issueDate)} · due {fmtDate(r.dueDate)}
                {r.renewals > 0 && ' · renewed'}
              </div>
            </div>
            <span className={r.overdue ? 'pill bad' : 'pill good'}>{dueText(r)}</span>
            {r.currentFee > 0 && <b className="fee">{rupees(r.currentFee)}</b>}
            <button className="ghost" disabled={!r.canRenew} onClick={() => renew(r)}
              title={r.canRenew ? 'Extend the due date' : r.overdue ? 'Overdue books can only be returned' : 'Already renewed'}>
              Renew
            </button>
            <button onClick={() => giveBack(r)}>Return</button>
          </li>
        ))}
        {!issued.length && <li className="empty">Nothing borrowed yet. Pick a book from the Books page.</li>}
      </ul>

      <h3>History</h3>
      <table>
        <thead><tr><th>Book</th><th>Borrowed</th><th>Returned</th><th>Late fee</th></tr></thead>
        <tbody>
          {past.map((r) => (
            <tr key={r._id}>
              <td>{r.book?.title}</td><td>{fmtDate(r.issueDate)}</td><td>{fmtDate(r.returnDate)}</td>
              <td>
                {r.lateFee > 0 ? <>{rupees(r.lateFee)} <span className={r.feePaid ? 'pill good' : 'pill bad'}>{r.feePaid ? 'Paid' : 'Unpaid'}</span></> : <span className="muted">None</span>}
              </td>
            </tr>
          ))}
          {!past.length && <tr><td colSpan="4" className="muted">No returned books yet.</td></tr>}
        </tbody>
      </table>
    </section>
  );
}