import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'librarian' });
  const [msg, setMsg] = useState({ type: '', text: '' });

  const load = useCallback(async () => setUsers(await api('/users')), []);
  useEffect(() => { load().catch((e) => setMsg({ type: 'error', text: e.message })); }, [load]);

  const run = async (fn, okText) => {
    try { await fn(); setMsg({ type: 'ok', text: okText }); load(); }
    catch (ex) { setMsg({ type: 'error', text: ex.message }); }
  };

  return (
    <section>
      <h2 className="title">Users</h2>
      <form className="panel grid" onSubmit={(e) => { e.preventDefault(); run(async () => { await api('/users', { method: 'POST', body: f }); setF({ ...f, name: '', email: '', password: '' }); }, 'User created'); }}>
        <input placeholder="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
        <input type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
        <input type="password" placeholder="Temporary password" minLength={6} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
        <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
          <option>librarian</option><option>student</option><option>admin</option>
        </select>
        <button>Create user</button>
      </form>
      {msg.text && <p className={msg.type === 'error' ? 'error' : 'ok'}>{msg.text}</p>}

      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u._id}>
              <td>{u.name}</td><td>{u.email}</td>
              <td>
                <select value={u.role} disabled={u._id === me.id}
                  onChange={(e) => run(() => api(`/users/${u._id}/role`, { method: 'PATCH', body: { role: e.target.value } }), 'Role updated')}>
                  <option>librarian</option><option>student</option><option>admin</option>
                </select>
              </td>
              <td>{u._id !== me.id && <button className="ghost danger" onClick={() => confirm(`Delete ${u.name}?`) && run(() => api(`/users/${u._id}`, { method: 'DELETE' }), 'User deleted')}>Delete</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}