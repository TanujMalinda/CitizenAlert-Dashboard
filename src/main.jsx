import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './styles.css'

import { isLoggedIn } from './api'
import Layout from './Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import ReviewQueuePage from './pages/ReviewQueuePage'
import AlertsPage from './pages/AlertsPage'
import TvmLogPage from './pages/TvmLogPage'
import RegistrationsPage from './pages/RegistrationsPage'

function RequireAuth({ children }) {
  return isLoggedIn() ? children : <Navigate to="/login" replace />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<RequireAuth><Layout /></RequireAuth>}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/review" element={<ReviewQueuePage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/tvm-log" element={<TvmLogPage />} />
          <Route path="/registrations" element={<RegistrationsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
