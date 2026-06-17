import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { logout, userName } from './api'

const isSuperAdmin = () => localStorage.getItem('user_role') === 'super_admin'

export default function Layout() {
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const superAdmin = isSuperAdmin()

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="logo">🛡️</span>
          <div>
            <h1>CitizenAlert</h1>
            <small>Authority Dashboard</small>
          </div>
        </div>
        <nav>
          <NavLink to="/" end>📊 Overview</NavLink>
          <NavLink to="/review">⚖️ Review Queue</NavLink>
          <NavLink to="/alerts">🗂️ All Alerts</NavLink>
          <NavLink to="/tvm-log">📜 TVM Audit Log</NavLink>
          {superAdmin && (
            <NavLink to="/registrations">👤 Registrations</NavLink>
          )}
        </nav>
        <div className="footer">
          <div>👤 {userName()}{superAdmin ? ' · Admin' : ''}</div>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
