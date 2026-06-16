import { useState, useEffect } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Home, FileText, Globe, BookOpen, GitBranch, CheckSquare, CalendarDays } from 'lucide-react'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { ShellNavContext, type ActiveApp } from '@/shared/hooks/useShellNav'
import HomePage from '@/pages/HomePage'
import { PaperAnalyzerPage } from '@/features/paper-analyzer'
import { TranslatorPage } from '@/features/translator'
import { ArchTrainerPage } from '@/features/arch-trainer'
import { TodoPage } from '@/features/todos'
import { ContextorPage } from '@/features/contextor'
import { CalendarPage, WeeklyReviewPage } from '@/features/calendar'

interface NavItem {
  key: ActiveApp
  label: string
  Icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { key: 'home',         label: 'Home',           Icon: Home },
  { key: 'paper',        label: 'Paper Analyzer', Icon: FileText },
  { key: 'translate',    label: 'Translator',     Icon: Globe },
  { key: 'contextor',    label: 'Contextor',      Icon: BookOpen },
  { key: 'todo',         label: 'Todo',           Icon: CheckSquare },
  // { key: 'model-review', label: 'Model Review',   Icon: GitBranch },
  // { key: 'calendar',     label: 'Calendar',       Icon: CalendarDays },
]

const APP_TITLE: Partial<Record<ActiveApp, string>> = {
  paper:          'Paper Analyzer',
  translate:      'Translator',
  contextor:      'Contextor',
  'model-review': 'Model Review',
  todo:           'Todo',
  calendar:       'Calendar',
  'weekly-review':'Weekly Review',
}

export default function Shell() {
  const [active, setActive] = useState<ActiveApp>('home')
  const isMobile = useIsMobile()

  useEffect(() => {
    document.title = active === 'home' ? 'veloo' : (APP_TITLE[active] ?? 'veloo')
  }, [active])

  const content = (
    <>
      {active === 'home'          && <HomePage />}
      {active === 'paper'         && <PaperAnalyzerPage />}
      {active === 'translate'     && <TranslatorPage />}
      {active === 'contextor'     && <ContextorPage />}
      {active === 'model-review'  && <ArchTrainerPage />}
      {active === 'todo'          && <TodoPage />}
      {active === 'calendar'      && <CalendarPage />}
      {active === 'weekly-review' && <WeeklyReviewPage />}
    </>
  )

  if (isMobile) {
    return (
      <ShellNavContext.Provider value={{ active, setActive }}>
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            {content}
          </div>
          <nav style={{
            display: 'flex',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-base)',
            flexShrink: 0,
          }}>
            {NAV_ITEMS.map(({ key, label, Icon }) => {
              const isActive = active === key || (key === 'todo' && active === 'weekly-review')
              return (
                <button
                  key={key}
                  onClick={() => setActive(key)}
                  style={{
                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: '8px 2px 10px', gap: 3,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-disabled)',
                    fontSize: 9, fontFamily: 'var(--font-sans)',
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  <Icon size={18} />
                  {label.split(' ')[0]}
                </button>
              )
            })}
          </nav>
        </div>
      </ShellNavContext.Provider>
    )
  }

  return (
    <ShellNavContext.Provider value={{ active, setActive }}>
      <div style={{ height: '100vh', display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar */}
        <nav style={{
          width: 192, flexShrink: 0,
          background: 'var(--bg-additive)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex', flexDirection: 'column',
          padding: '16px 0', overflowY: 'auto',
        }}>
          <div style={{
            padding: '4px 20px 24px',
            fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em',
            color: 'var(--text-primary)', userSelect: 'none',
          }}>
            veloo
          </div>
          {NAV_ITEMS.map(({ key, label, Icon }) => {
            const isActive = active === key || (key === 'todo' && active === 'weekly-review')
            return (
              <button
                key={key}
                onClick={() => setActive(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '7px 12px', margin: '1px 8px',
                  borderRadius: 'var(--radius-sm)',
                  background: isActive ? 'var(--selected-bg)' : 'transparent',
                  color: isActive ? 'var(--selected-text)' : 'var(--text-secondary)',
                  border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: isActive ? 600 : 400,
                  fontFamily: 'var(--font-sans)', textAlign: 'left',
                  width: 'calc(100% - 16px)',
                  transition: 'background 0.1s, color 0.1s',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    const el = e.currentTarget as HTMLButtonElement
                    el.style.background = 'var(--border-subtle)'
                    el.style.color = 'var(--text-primary)'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    const el = e.currentTarget as HTMLButtonElement
                    el.style.background = 'transparent'
                    el.style.color = 'var(--text-secondary)'
                  }
                }}
              >
                <Icon size={15} />
                {label}
              </button>
            )
          })}
        </nav>
        {/* Content area */}
        <div style={{ flex: 1, overflow: 'auto', minWidth: 0, minHeight: 0 }}>
          {content}
        </div>
      </div>
    </ShellNavContext.Provider>
  )
}
