import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Books from './pages/Books.jsx';
import MyBooks from './pages/MyBooks.jsx';
import IssueReturn from './pages/IssueReturn.jsx';
import Reports from './pages/Reports.jsx';
import Users from './pages/Users.jsx';

function Guard({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="muted">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function Nav() {
  const { user, logout } = useAuth();
  if (!user) return null;
  const staff = user.role !== 'student';
  return (
    <header className="topbar">
      <span className="brand">CampusLibrary</span>
      <nav>
        <NavLink to="/books">Books</NavLink>
        {user.role === 'student' && <NavLink to="/my-books">My books</NavLink>}
        {staff && <NavLink to="/issue">Issue & return</NavLink>}
        {staff && <NavLink to="/reports">Reports</NavLink>}
        {user.role === 'admin' && <NavLink to="/users">Users</NavLink>}
      </nav>
      <div className="who">
        <span>{user.name} <em>({user.role})</em></span>
        <button className="ghost" onClick={logout}>Log out</button>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/books" element={<Guard><Books /></Guard>} />
          <Route path="/my-books" element={<Guard roles={['student']}><MyBooks /></Guard>} />
          <Route path="/issue" element={<Guard roles={['librarian', 'admin']}><IssueReturn /></Guard>} />
          <Route path="/reports" element={<Guard roles={['librarian', 'admin']}><Reports /></Guard>} />
          <Route path="/users" element={<Guard roles={['admin']}><Users /></Guard>} />
          <Route path="*" element={<Navigate to="/books" replace />} />
        </Routes>
      </main>
    </>
  );
}
