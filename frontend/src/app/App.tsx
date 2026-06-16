import { Routes, Route, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import LoginPage from '@/pages/LoginPage'
import Shell from './Shell'

function RootRedirect() {
  const navigate = useNavigate()
  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(data => {
        if (data.username) navigate(`/${data.username}/`, { replace: true })
        else navigate('/login', { replace: true })
      })
      .catch(() => navigate('/login', { replace: true }))
  }, [navigate])
  return null
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/:username/*" element={<Shell />} />
    </Routes>
  )
}
