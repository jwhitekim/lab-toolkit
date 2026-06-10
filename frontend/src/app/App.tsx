import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import HomePage from '@/pages/HomePage'
import LoginPage from '@/pages/LoginPage'
import { PaperAnalyzerPage } from '@/features/paper-analyzer'
import { TranslatorPage } from '@/features/translator'
import { ArchTrainerPage } from '@/features/arch-trainer'
import { TodoPage } from '@/features/todos'
import { ContextorPage } from '@/features/contextor'
import { CalendarPage, WeeklyReviewPage } from '@/features/calendar'

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
      <Route path="/login" element={<LoginPage />} />
      <Route path="/:username/" element={<HomePage />} />
      <Route path="/:username/paper" element={<PaperAnalyzerPage />} />
      <Route path="/:username/translate" element={<TranslatorPage />} />
      <Route path="/:username/model-review" element={<ArchTrainerPage />} />
      <Route path="/:username/todo/*" element={<TodoPage />} />
      <Route path="/:username/todo/review" element={<WeeklyReviewPage />} />
      <Route path="/:username/calendar" element={<CalendarPage />} />
      <Route path="/:username/contextor" element={<ContextorPage />} />
    </Routes>
  )
}
