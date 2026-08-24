import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from '@/pages/LoginPage'
import LandingPage from '@/pages/LandingPage'
import ProtectedWorkspace from './ProtectedWorkspace'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage mode="login" />} />
      <Route path="/signup" element={<LoginPage mode="signup" />} />
      <Route path="/register" element={<Navigate to="/signup" replace />} />
      <Route path="/:username/*" element={<ProtectedWorkspace />} />
    </Routes>
  )
}
