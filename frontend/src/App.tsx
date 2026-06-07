import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import Home from './pages/Home'
import PaperAnalyzer from './pages/PaperAnalyzer'
import Translator from './pages/Translator'
import ArchTrainer from './pages/ArchTrainer'
import Todo from './pages/Todo'
import Login from './pages/Login'
import Contextor from './pages/Contextor'
import Calendar from './pages/Calendar'
import WeeklyReview from './pages/WeeklyReview'

const PAGE_TITLES: Record<string, string> = {
  '': 'Home',
  'paper': 'Paper Analyzer',
  'translate': 'Translator',
  'model-review': 'Model Review',
  'todo': 'Todo',
  'contextor': 'Contextor',
  'calendar': 'Calendar',
}

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
  const location = useLocation()

  useEffect(() => {
    const segments = location.pathname.split('/')
    const segment = segments[1] === 'login' ? null : (segments[2] ?? '')
    const title = segment === null ? 'Login' : (PAGE_TITLES[segment] ?? 'Lab Toolkit')
    document.title = title
  }, [location.pathname])

  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/:username/" element={<Home />} />
      <Route path="/:username/paper" element={<PaperAnalyzer />} />
      <Route path="/:username/translate" element={<Translator />} />
      <Route path="/:username/model-review" element={<ArchTrainer />} />
      <Route path="/:username/todo/*" element={<Todo />} />
      <Route path="/:username/todo/review" element={<WeeklyReview />} />
      <Route path="/:username/calendar" element={<Calendar />} />
      <Route path="/:username/contextor" element={<Contextor />} />
    </Routes>
  )
}
