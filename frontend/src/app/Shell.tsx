import { useState, useEffect } from 'react'
import type { LucideIcon } from 'lucide-react'
import { FileText, Globe, BookOpen, CheckSquare } from 'lucide-react'
import { ShellNavContext, type ActiveApp } from '@/shared/hooks/useShellNav'
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
  { key: 'todo',         label: 'Todo',           Icon: CheckSquare },
  { key: 'paper',        label: 'Paper Analyzer', Icon: FileText },
  { key: 'translate',    label: 'Translator',     Icon: Globe },
  { key: 'contextor',    label: 'Contextor',      Icon: BookOpen },
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
  const [active, setActive] = useState<ActiveApp>('todo')

  useEffect(() => {
    document.title = APP_TITLE[active] ?? 'veloo'
  }, [active])

  const content = (
    <>
      {active === 'paper'         && <PaperAnalyzerPage />}
      {active === 'translate'     && <TranslatorPage />}
      {active === 'contextor'     && <ContextorPage />}
      {active === 'model-review'  && <ArchTrainerPage />}
      {active === 'todo'          && <TodoPage />}
      {active === 'calendar'      && <CalendarPage />}
      {active === 'weekly-review' && <WeeklyReviewPage />}
    </>
  )

  return (
    <ShellNavContext.Provider value={{ active, setActive }}>
      <div className="shell-desktop">
        <header className="shell-topbar">
          <div className="shell-brand-wrap">
            <button
              type="button"
              className="shell-brand"
              onClick={() => setActive('todo')}
              aria-label="veloo home"
            >
              <span className="shell-brand-mark">
                <img src="/favicon.svg" alt="" width={20} height={20} />
              </span>
              <span className="shell-brand-text">veloo</span>
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
