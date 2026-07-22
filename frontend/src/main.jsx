import React, { createContext, useContext, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import api from './api'
import './styles.css'
import './profile.css'

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/api$/, '')
const AuthContext = createContext(null)
const useAuth = () => useContext(AuthContext)

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'))
  const login = (data) => { localStorage.setItem('token', data.access_token); localStorage.setItem('user', JSON.stringify(data.user)); setUser(data.user) }
  const updateUser = (nextUser) => { localStorage.setItem('user', JSON.stringify(nextUser)); setUser(nextUser) }
  const logout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null) }
  return <AuthContext.Provider value={{ user, login, updateUser, logout }}>{children}</AuthContext.Provider>
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
  return <div className="app"><aside><div className="brand">Attendance</div><nav><NavLink end to={isAdmin ? '/admin' : '/employee'}>Dashboard</NavLink>{isAdmin ? <><NavLink to="/admin/employees">Employees</NavLink><NavLink to="/admin/attendance">Attendance logs</NavLink></> : <><NavLink to="/employee/history">My history</NavLink><NavLink to="/employee/profile">Profile settings</NavLink></>}</nav><div className="profile">{user.profile_image ? <img className="sidebar-avatar" src={`${API_ORIGIN}${user.profile_image}`} alt="Profile" /> : <div className="sidebar-avatar placeholder">{user.name?.charAt(0)?.toUpperCase()}</div>}<strong>{user.name}</strong><span>{isAdmin ? 'Administrator' : 'Employee'}</span><button className="link-button" onClick={logout}>Log out</button></div></aside><section className="content">{children}</section></div>
}

const fmtDate = (value) => new Date(`${value}T00:00:00`).toLocaleDateString()
const fmtTime = (value) => value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'
const fmtCoordinate = (latitude, longitude) => latitude == null || longitude == null ? '—' : `${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}`
const getLocation = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) return reject(new Error('Location is not supported by this browser.'))
  navigator.geolocation.getCurrentPosition(
    position => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
    () => reject(new Error('Location permission is required to mark attendance.')),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  )
})
const workingHours = (checkIn, checkOut, currentTime) => {
  if (!checkIn) return '—'
  const end = checkOut ? new Date(checkOut) : new Date(currentTime || Date.now())
  const minutes = Math.max(0, Math.floor((end - new Date(checkIn)) / 60000))
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m${checkOut ? '' : ' (in progress)'}`
}
function PageTitle({ title, children }) { return <header className="page-title"><div><h1>{title}</h1><p>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p></div>{children}</header> }

function AdminDashboard() {
  const [stats, setStats] = useState(null), [error, setError] = useState('')
  React.useEffect(() => { api.get('/admin/dashboard').then(r => setStats(r.data)).catch(e => setError(e.response?.data?.detail || 'Could not load dashboard')) }, [])
  return <Layout><PageTitle title="Admin dashboard" />{error && <div className="alert error">{error}</div>}<div className="stats">{[['Total employees', stats?.total_employees], ['Present today', stats?.present_today], ['Absent today', stats?.absent_today]].map(([label, n]) => <div className="stat" key={label}><span>{label}</span><strong>{n ?? '—'}</strong></div>)}</div><OfficeSettingsForm /></Layout>
}

function OfficeSettingsForm() {
  const [form, setForm] = useState({ office_latitude: '', office_longitude: '', allowed_radius: '50' }), [message, setMessage] = useState(''), [error, setError] = useState('')
  React.useEffect(() => { api.get('/office-settings').then(({ data }) => setForm({ office_latitude: data.office_latitude ?? '', office_longitude: data.office_longitude ?? '', allowed_radius: data.allowed_radius ?? 50 })).catch(() => setError('Could not load office settings')) }, [])
  async function save(e) { e.preventDefault(); setError(''); setMessage(''); try { await api.put('/office-settings', { office_latitude: Number(form.office_latitude), office_longitude: Number(form.office_longitude), allowed_radius: Number(form.allowed_radius) }); setMessage('Office location saved.') } catch (e) { setError(e.response?.data?.detail || 'Could not save office settings') } }
  return <form className="panel office-settings form" onSubmit={save}><h2>Office geofence</h2><p>Employees must be within this location and radius to mark attendance.</p>{error && <div className="alert error">{error}</div>}{message && <div className="alert success">{message}</div>}<div className="settings-fields"><label>Office latitude<input type="number" step="any" value={form.office_latitude} onChange={e => setForm({ ...form, office_latitude: e.target.value })} required /></label><label>Office longitude<input type="number" step="any" value={form.office_longitude} onChange={e => setForm({ ...form, office_longitude: e.target.value })} required /></label><label>Allowed radius (meters)<input type="number" min="1" step="any" value={form.allowed_radius} onChange={e => setForm({ ...form, allowed_radius: e.target.value })} required /></label></div><div className="actions"><button>Save office settings</button></div></form>
}

function EmployeeDashboard() {
  const [records, setRecords] = useState([]), [message, setMessage] = useState(''), [error, setError] = useState(''), [now, setNow] = useState(Date.now())
  const load = () => api.get('/attendance/me').then(r => setRecords(r.data)).catch(() => setError('Could not load attendance'))
  React.useEffect(() => { load(); const timer = window.setInterval(() => setNow(Date.now()), 60000); return () => window.clearInterval(timer) }, [])
  const today = new Date().toISOString().slice(0, 10), record = records.find(r => r.date === today)
  async function action(path) { setError(''); setMessage(''); try { const location = await getLocation(); const { data } = await api.post(path, location); setRecords(old => [data, ...old.filter(r => r.id !== data.id)]); setMessage(`${path.includes('check-in') ? 'Checked in' : 'Checked out'} successfully. Location captured.`) } catch (e) { setError(e.response?.data?.detail || e.message || 'Unable to capture location') } }
  return <Layout><PageTitle title="My dashboard" />{message && <div className="alert success">{message}</div>}{error && <div className="alert error">{error}</div>}<div className="today-card"><h2>Today's attendance</h2><p>{record ? `Checked in at ${fmtTime(record.check_in)}${record.check_out ? ` · Checked out at ${fmtTime(record.check_out)}` : ''}` : 'You have not checked in yet.'}</p>{record && <p className="working-hours"><strong>Working hours:</strong> {workingHours(record.check_in, record.check_out, now)}</p>}<div className="actions"><button onClick={() => action('/attendance/check-in')} disabled={!!record}>Check in</button><button className="secondary" onClick={() => action('/attendance/check-out')} disabled={!record || !!record.check_out}>Check out</button></div></div></Layout>
}

function ProfileSettings() {
  const { user, updateUser } = useAuth()
  const [profile, setProfile] = useState({ name: user.name, phone_number: user.phone_number || '' }), [passwords, setPasswords] = useState({ current_password: '', new_password: '', confirm_password: '' }), [message, setMessage] = useState(''), [error, setError] = useState(''), [uploading, setUploading] = useState(false)
  function showError(value) { setMessage(''); setError(value) }
  async function saveProfile(e) { e.preventDefault(); setError(''); setMessage(''); try { const { data } = await api.put('/profile', profile); updateUser(data); setMessage('Profile information updated.') } catch (e) { showError(e.response?.data?.detail || 'Could not update profile') } }
  async function changePassword(e) { e.preventDefault(); setError(''); setMessage(''); if (passwords.new_password !== passwords.confirm_password) return showError('New password and confirmation do not match.'); try { await api.put('/profile/password', { current_password: passwords.current_password, new_password: passwords.new_password }); setPasswords({ current_password: '', new_password: '', confirm_password: '' }); setMessage('Password changed successfully.') } catch (e) { showError(e.response?.data?.detail || 'Could not change password') } }
  async function uploadImage(e) { const file = e.target.files?.[0]; e.target.value = ''; if (!file) return; if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 2 * 1024 * 1024) return showError('Choose a JPG, JPEG, or PNG image no larger than 2 MB.'); setError(''); setMessage(''); setUploading(true); try { const form = new FormData(); form.append('file', file); const { data } = await api.post('/profile/image', form); updateUser(data); setMessage('Profile picture updated.') } catch (e) { showError(e.response?.data?.detail || 'Could not upload profile picture') } finally { setUploading(false) } }
  return <Layout><PageTitle title="Profile settings" />{message && <div className="alert success">{message}</div>}{error && <div className="alert error">{error}</div>}<div className="profile-grid"><section className="panel profile-picture"><h2>Profile picture</h2>{user.profile_image ? <img className="profile-image" src={`${API_ORIGIN}${user.profile_image}`} alt="Profile" /> : <div className="profile-image placeholder">{user.name?.charAt(0)?.toUpperCase()}</div>}<label className="upload-button">{uploading ? 'Uploading…' : 'Replace picture'}<input type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={uploadImage} disabled={uploading} /></label><small>JPG, JPEG, or PNG · maximum 2 MB</small></section><form className="panel form" onSubmit={saveProfile}><h2>Profile information</h2><label>Full name<input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} required /></label><label>Email<input value={user.email} disabled /></label><label>Role<input value={user.role} disabled /></label><label>Phone number<input type="tel" value={profile.phone_number} onChange={e => setProfile({ ...profile, phone_number: e.target.value })} maxLength="30" /></label><div className="actions"><button>Save profile</button></div></form><form className="panel form" onSubmit={changePassword}><h2>Change password</h2><label>Current password<input type="password" value={passwords.current_password} onChange={e => setPasswords({ ...passwords, current_password: e.target.value })} required /></label><label>New password<input type="password" value={passwords.new_password} onChange={e => setPasswords({ ...passwords, new_password: e.target.value })} minLength="6" required /></label><label>Confirm new password<input type="password" value={passwords.confirm_password} onChange={e => setPasswords({ ...passwords, confirm_password: e.target.value })} minLength="6" required /></label><div className="actions"><button>Change password</button></div></form></div></Layout>
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
  return <Layout><PageTitle title={admin ? 'Attendance logs' : 'My attendance history'} />{error && <div className="alert error">{error}</div>}{admin && <div className="filters"><input placeholder="Search employee name or email" value={search} onChange={e => setSearch(e.target.value)} /><input type="date" value={date} onChange={e => setDate(e.target.value)} /><button onClick={load}>Search</button><button className="secondary" onClick={() => { setSearch(''); setDate(''); setTimeout(load, 0) }}>Clear</button></div>}<div className="panel table-panel"><table><thead><tr>{admin && <th>Employee</th>}<th>Date</th><th>Check in</th><th>Check out</th>{admin ? <><th>Check-in coordinates</th><th>Check-out coordinates</th></> : <th>Working hours</th>}<th>Status</th></tr></thead><tbody>{records.map(r => <tr key={r.id}>{admin && <td><strong>{r.user?.name}</strong><br /><small>{r.user?.email}</small></td>}<td>{fmtDate(r.date)}</td><td>{fmtTime(r.check_in)}</td><td>{fmtTime(r.check_out)}</td>{admin ? <><td>{fmtCoordinate(r.check_in_latitude, r.check_in_longitude)}</td><td>{fmtCoordinate(r.check_out_latitude, r.check_out_longitude)}</td></> : <td>{workingHours(r.check_in, r.check_out)}</td>}<td><span className="badge">{r.status}</span></td></tr>)}{!records.length && <tr><td colSpan={admin ? 7 : 5} className="empty">No attendance records found.</td></tr>}</tbody></table></div></Layout>
}

function App() { return <AuthProvider><Routes><Route path="/login" element={<Login />} /><Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} /><Route path="/admin/employees" element={<ProtectedRoute role="admin"><Employees /></ProtectedRoute>} /><Route path="/admin/attendance" element={<ProtectedRoute role="admin"><AttendanceTable admin /></ProtectedRoute>} /><Route path="/employee" element={<ProtectedRoute role="employee"><EmployeeDashboard /></ProtectedRoute>} /><Route path="/employee/history" element={<ProtectedRoute role="employee"><AttendanceTable /></ProtectedRoute>} /><Route path="/employee/profile" element={<ProtectedRoute role="employee"><ProfileSettings /></ProtectedRoute>} /><Route path="*" element={<Navigate to="/login" replace />} /></Routes></AuthProvider> }
createRoot(document.getElementById('root')).render(<BrowserRouter><App /></BrowserRouter>)
