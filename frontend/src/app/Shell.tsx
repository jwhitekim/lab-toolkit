import { useState, useEffect } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Home, FileText, Globe, BookOpen, CheckSquare } from 'lucide-react'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { ShellNavContext, type ActiveApp } from '@/shared/hooks/useShellNav'
import HomePage from '@/pages/HomePage'
import { PaperAnalyzerPage } from '@/features/paper-analyzer'
import { TranslatorPage } from '@/features/translator'
import { ArchTrainerPage } from '@/features/arch-trainer'
import { TodoPage } from '@/features/todos'
import { ContextorPage } from '@/features/contextor'
import { CalendarPage, WeeklyReviewPage } from '@/features/calendar'
import './Shell.css'

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
      <div className="shell-desktop">
        <header className="shell-topbar">
          <div className="shell-brand-wrap">
            <button
              type="button"
              className="shell-brand"
              onClick={() => setActive('home')}
              aria-label="veloo home"
            >
              <span className="shell-brand-mark">v</span>
              <span>veloo</span>
            </button>
          </div>
          <nav className="shell-app-nav" aria-label="Apps">
          {NAV_ITEMS.map(({ key, label, Icon }) => {
            const isActive = active === key || (key === 'todo' && active === 'weekly-review')
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActive(key)}
                className={`shell-app-tab${isActive ? ' is-active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={16} strokeWidth={2.1} />
                <span>{label}</span>
              </button>
            )
          })}
          </nav>
          <div className="shell-topbar-end" aria-hidden="true" />
        </header>
        <main className="shell-content">
          {content}
        </main>
      </div>
    </ShellNavContext.Provider>
  )
}
