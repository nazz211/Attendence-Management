import React, { createContext, useContext, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import api from './api'
import './styles.css'

const AuthContext = createContext(null)
const useAuth = () => useContext(AuthContext)

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'))
  const login = (data) => { localStorage.setItem('token', data.access_token); localStorage.setItem('user', JSON.stringify(data.user)); setUser(data.user) }
  const logout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null) }
  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

function ProtectedRoute({ role, children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/employee'} replace />
  return children
}

function Login() {
  const { user, login } = useAuth(); const navigate = useNavigate()
  const [email, setEmail] = useState('admin@example.com'), [password, setPassword] = useState('admin123'), [error, setError] = useState(''), [loading, setLoading] = useState(false)
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/employee'} replace />
  async function submit(e) { e.preventDefault(); setError(''); setLoading(true); try { const { data } = await api.post('/auth/login', { email, password }); login(data); navigate(data.user.role === 'admin' ? '/admin' : '/employee') } catch (e) { setError(e.response?.data?.detail || 'Unable to sign in') } finally { setLoading(false) } }
  return <main className="login-page"><form className="login-card" onSubmit={submit}><h1>Attendance</h1><p>Employee Attendance Management System</p>{error && <div className="alert error">{error}</div>}<label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label><label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label><button disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button><small>Default administrator: admin@example.com / admin123</small></form></main>
}

function Layout({ children }) {
  const { user, logout } = useAuth(); const isAdmin = user.role === 'admin'
  return <div className="app"><aside><div className="brand">Attendance</div><nav><NavLink end to={isAdmin ? '/admin' : '/employee'}>Dashboard</NavLink>{isAdmin ? <><NavLink to="/admin/employees">Employees</NavLink><NavLink to="/admin/attendance">Attendance logs</NavLink></> : <NavLink to="/employee/history">My history</NavLink>}</nav><div className="profile"><strong>{user.name}</strong><span>{isAdmin ? 'Administrator' : 'Employee'}</span><button className="link-button" onClick={logout}>Log out</button></div></aside><section className="content">{children}</section></div>
}

const fmtDate = (value) => new Date(`${value}T00:00:00`).toLocaleDateString()
const fmtTime = (value) => value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'
function PageTitle({ title, children }) { return <header className="page-title"><div><h1>{title}</h1><p>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p></div>{children}</header> }

function AdminDashboard() {
  const [stats, setStats] = useState(null), [error, setError] = useState('')
  React.useEffect(() => { api.get('/admin/dashboard').then(r => setStats(r.data)).catch(e => setError(e.response?.data?.detail || 'Could not load dashboard')) }, [])
  return <Layout><PageTitle title="Admin dashboard" />{error && <div className="alert error">{error}</div>}<div className="stats">{[['Total employees', stats?.total_employees], ['Present today', stats?.present_today], ['Absent today', stats?.absent_today]].map(([label, n]) => <div className="stat" key={label}><span>{label}</span><strong>{n ?? '—'}</strong></div>)}</div></Layout>
}

function EmployeeDashboard() {
  const [records, setRecords] = useState([]), [message, setMessage] = useState(''), [error, setError] = useState('')
  const load = () => api.get('/attendance/me').then(r => setRecords(r.data)).catch(() => setError('Could not load attendance'))
  React.useEffect(() => { load() }, [])
  const today = new Date().toISOString().slice(0, 10), record = records.find(r => r.date === today)
  async function action(path) { setError(''); setMessage(''); try { const { data } = await api.post(path); setRecords(old => [data, ...old.filter(r => r.id !== data.id)]); setMessage(path.includes('check-in') ? 'Checked in successfully.' : 'Checked out successfully.') } catch (e) { setError(e.response?.data?.detail || 'Action failed') } }
  return <Layout><PageTitle title="My dashboard" />{message && <div className="alert success">{message}</div>}{error && <div className="alert error">{error}</div>}<div className="today-card"><h2>Today's attendance</h2><p>{record ? `Checked in at ${fmtTime(record.check_in)}${record.check_out ? ` · Checked out at ${fmtTime(record.check_out)}` : ''}` : 'You have not checked in yet.'}</p><div className="actions"><button onClick={() => action('/attendance/check-in')} disabled={!!record}>Check in</button><button className="secondary" onClick={() => action('/attendance/check-out')} disabled={!record || !!record.check_out}>Check out</button></div></div></Layout>
}

function Employees() {
  const empty = { name: '', email: '', password: '' }; const [users, setUsers] = useState([]), [form, setForm] = useState(empty), [editing, setEditing] = useState(null), [error, setError] = useState('')
  const load = () => api.get('/users').then(r => setUsers(r.data)).catch(() => setError('Could not load employees')); React.useEffect(() => { load() }, [])
  function change(e) { setForm({ ...form, [e.target.name]: e.target.value }) }
  async function submit(e) { e.preventDefault(); setError(''); try { const payload = editing && !form.password ? { name: form.name, email: form.email } : form; if (editing) await api.put(`/users/${editing}`, payload); else await api.post('/users', payload); setForm(empty); setEditing(null); load() } catch (e) { setError(e.response?.data?.detail || 'Could not save employee') } }
  function edit(u) { setEditing(u.id); setForm({ name: u.name, email: u.email, password: '' }) }
  async function remove(id) { if (!window.confirm('Delete this employee and their attendance records?')) return; try { await api.delete(`/users/${id}`); load() } catch (e) { setError(e.response?.data?.detail || 'Could not delete employee') } }
  return <Layout><PageTitle title="Employee management" />{error && <div className="alert error">{error}</div>}<div className="split"><form className="panel form" onSubmit={submit}><h2>{editing ? 'Edit employee' : 'Add employee'}</h2><label>Name<input name="name" value={form.name} onChange={change} required /></label><label>Email<input name="email" type="email" value={form.email} onChange={change} required /></label><label>Password<input name="password" type="password" value={form.password} onChange={change} required={!editing} placeholder={editing ? 'Leave blank to keep current password' : ''} /></label><div className="actions"><button>{editing ? 'Save changes' : 'Create employee'}</button>{editing && <button type="button" className="secondary" onClick={() => { setEditing(null); setForm(empty) }}>Cancel</button>}</div></form><div className="panel table-panel"><h2>Employees</h2><table><thead><tr><th>Name</th><th>Email</th><th>Created</th><th></th></tr></thead><tbody>{users.map(u => <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{fmtDate(u.created_at.slice(0, 10))}</td><td className="row-actions"><button className="text" onClick={() => edit(u)}>Edit</button><button className="text danger" onClick={() => remove(u.id)}>Delete</button></td></tr>)}{!users.length && <tr><td colSpan="4" className="empty">No employees yet.</td></tr>}</tbody></table></div></div></Layout>
}

function AttendanceTable({ admin = false }) {
  const [records, setRecords] = useState([]), [search, setSearch] = useState(''), [date, setDate] = useState(''), [error, setError] = useState('')
  const load = () => { const params = admin ? { search: search || undefined, date: date || undefined } : {}; api.get(admin ? '/attendance' : '/attendance/me', { params }).then(r => setRecords(r.data)).catch(() => setError('Could not load attendance records')) }
  React.useEffect(() => { load() }, [])
  return <Layout><PageTitle title={admin ? 'Attendance logs' : 'My attendance history'} />{error && <div className="alert error">{error}</div>}{admin && <div className="filters"><input placeholder="Search employee name or email" value={search} onChange={e => setSearch(e.target.value)} /><input type="date" value={date} onChange={e => setDate(e.target.value)} /><button onClick={load}>Search</button><button className="secondary" onClick={() => { setSearch(''); setDate(''); setTimeout(load, 0) }}>Clear</button></div>}<div className="panel table-panel"><table><thead><tr>{admin && <th>Employee</th>}<th>Date</th><th>Check in</th><th>Check out</th><th>Status</th></tr></thead><tbody>{records.map(r => <tr key={r.id}>{admin && <td><strong>{r.user?.name}</strong><br /><small>{r.user?.email}</small></td>}<td>{fmtDate(r.date)}</td><td>{fmtTime(r.check_in)}</td><td>{fmtTime(r.check_out)}</td><td><span className="badge">{r.status}</span></td></tr>)}{!records.length && <tr><td colSpan={admin ? 5 : 4} className="empty">No attendance records found.</td></tr>}</tbody></table></div></Layout>
}

function App() { return <AuthProvider><Routes><Route path="/login" element={<Login />} /><Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} /><Route path="/admin/employees" element={<ProtectedRoute role="admin"><Employees /></ProtectedRoute>} /><Route path="/admin/attendance" element={<ProtectedRoute role="admin"><AttendanceTable admin /></ProtectedRoute>} /><Route path="/employee" element={<ProtectedRoute role="employee"><EmployeeDashboard /></ProtectedRoute>} /><Route path="/employee/history" element={<ProtectedRoute role="employee"><AttendanceTable /></ProtectedRoute>} /><Route path="*" element={<Navigate to="/login" replace />} /></Routes></AuthProvider> }
createRoot(document.getElementById('root')).render(<BrowserRouter><App /></BrowserRouter>)
