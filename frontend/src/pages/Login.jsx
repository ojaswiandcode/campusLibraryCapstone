import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const DEMO = [
  ['Student', 'student@campus.edu', 'student123'],
  ['Librarian', 'librarian@campus.edu', 'lib12345'],
  ['Admin', 'admin@campus.edu', 'admin123'],
];

export default function Login() {
  const { user, login, register } = useAuth();
  const nav = useNavigate();
  const [signup, setSignup] = useState(false);
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  if (user) return <Navigate to="/books" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      if (signup) await register(f.name, f.email, f.password);
      else await login(f.email, f.password);
      nav('/books');
    } catch (ex) { setErr(ex.message); }
  };

  return (
    <div className="auth">
      <aside className="auth-art">
        <div className="spines" aria-hidden="true">
          {Array.from({ length: 11 }).map((_, i) => <span key={i} />)}
        </div>
        <h1>CampusLibrary</h1>
        <p>Find a book, borrow it in one tap, and get reminded before it's due.</p>
      </aside>
      <div className="auth-form">
        <h2>{signup ? 'Create your account' : 'Welcome back'}</h2>
        <form onSubmit={submit} className="stack">
          {signup && <input placeholder="Full name" value={f.name} onChange={set('name')} required />}
          <input type="email" placeholder="Email" value={f.email} onChange={set('email')} required />
          <input type="password" placeholder="Password (min 6 characters)" minLength={6} value={f.password} onChange={set('password')} required />
          {err && <p className="error">{err}</p>}
          <button className="big">{signup ? 'Create account' : 'Log in'}</button>
        </form>
        <button className="link" onClick={() => { setSignup(!signup); setErr(''); }}>
          {signup ? 'I already have an account' : 'New student? Create an account'}
        </button>
        {!signup && (
          <div className="demo">
            <span className="muted">Try a demo account:</span>
            {DEMO.map(([label, email, password]) => (
              <button key={label} type="button" className="chip" onClick={() => setF({ ...f, email, password })}>{label}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}