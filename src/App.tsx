import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Resources from './pages/Resources'
import CheckInOut from './pages/CheckInOut'
import Stock from './pages/Stock'
import Incidents from './pages/Incidents'
import Reports from './pages/Reports'
import Admin from './pages/Admin'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/checkinout" element={<CheckInOut />} />
        <Route path="/stock" element={<Stock />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route
          path="/reports"
          element={
            <ProtectedRoute adminOnly>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <Admin />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
