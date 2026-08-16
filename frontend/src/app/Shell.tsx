import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Braces, CalendarDays, FileSearch, Languages, LayoutDashboard, ListTodo, Network } from 'lucide-react'
import { ShellNavContext, type ActiveApp } from '@/shared/hooks/useShellNav'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { useT } from '@/shared/i18n'
import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher'
import { PaperAnalyzerPage } from '@/features/paper-analyzer'
import { TranslatorPage } from '@/features/translator'
import { ArchTrainerPage } from '@/features/model-review'
import { TodoPage } from '@/features/todos'
import { ContextorPage } from '@/features/contextor'
import { CalendarPage, WeeklyReviewPage } from '@/features/calendar'
import './Shell.css'

type MainApp = Exclude<ActiveApp, 'weekly-review'>
type MobileNavKey = 'plan' | 'paper' | 'translate' | 'model-review' | 'contextor'

interface AppItem { key: MainApp; Icon: LucideIcon }
interface MobileItem { key: MobileNavKey; Icon: LucideIcon; label: string }

const DESKTOP_APPS: AppItem[] = [
  { key: 'todo', Icon: ListTodo },
  { key: 'calendar', Icon: CalendarDays },
  { key: 'paper', Icon: FileSearch },
  { key: 'translate', Icon: Languages },
  { key: 'model-review', Icon: Network },
  { key: 'contextor', Icon: Braces },
]

const MOBILE_APPS: MobileItem[] = [
  { key: 'plan', Icon: LayoutDashboard, label: 'Plan' },
  { key: 'paper', Icon: FileSearch, label: 'Paper' },
  { key: 'translate', Icon: Languages, label: 'Trans' },
  { key: 'model-review', Icon: Network, label: 'Arch' },
  { key: 'contextor', Icon: Braces, label: 'Concepts' },
]

const LAST_PLAN_APP_KEY = 'veloo:last-plan-app'

function loadLastPlanApp(): 'todo' | 'calendar' {
  return localStorage.getItem(LAST_PLAN_APP_KEY) === 'calendar' ? 'calendar' : 'todo'
}

function mobileKeyFor(app: MainApp): MobileNavKey {
  return app === 'todo' || app === 'calendar' ? 'plan' : app
}

export default function Shell() {
  const t = useT()
  const isMobile = useIsMobile()
  const [active, setActiveState] = useState<ActiveApp>('todo')
  const [lastPlanApp, setLastPlanApp] = useState<'todo' | 'calendar'>(loadLastPlanApp)
  const activeApp: MainApp = active === 'weekly-review' ? 'todo' : active
  const activeMobileKey = mobileKeyFor(activeApp)

  const selectApp = (app: ActiveApp) => {
    setActiveState(app)
    if (app === 'todo' || app === 'calendar') {
      setLastPlanApp(app)
      localStorage.setItem(LAST_PLAN_APP_KEY, app)
    }
  }

  const selectMobileItem = (key: MobileNavKey) => {
    selectApp(key === 'plan' ? lastPlanApp : key)
  }

  const appTitle: Partial<Record<ActiveApp, string>> = {
    paper: t('shell.nav.paper'), translate: t('shell.nav.translate'), contextor: t('shell.nav.contextor'),
    'model-review': t('shell.nav.model-review'), todo: t('shell.nav.todo'), calendar: t('shell.nav.calendar'),
    'weekly-review': t('shell.weeklyReview'),
  }
  useEffect(() => { document.title = appTitle[active] ?? 'Veloo' }, [active, appTitle])

  const mobileTabsRef = useRef<HTMLElement>(null)
  const mobileTrackRef = useRef<HTMLDivElement>(null)
  const mobileTabRefs = useRef<Partial<Record<MobileNavKey, HTMLButtonElement | null>>>({})
  const [mobileIndicatorRect, setMobileIndicatorRect] = useState<{ x: number; width: number } | null>(null)
  const [isDraggingMobile, setIsDraggingMobile] = useState(false)
  const [mobileDragTarget, setMobileDragTarget] = useState<MobileNavKey | null>(null)
  const mobileGestureRef = useRef<{ startX: number; moved: boolean; target: MobileNavKey } | null>(null)
  const suppressMobileClickRef = useRef(false)

  useLayoutEffect(() => {
    if (!isMobile || isDraggingMobile) return
    const sync = () => {
      const button = mobileTabRefs.current[activeMobileKey]
      if (button) setMobileIndicatorRect({ x: button.offsetLeft, width: button.offsetWidth })
    }
    sync()
    const tabs = mobileTabsRef.current
    const button = mobileTabRefs.current[activeMobileKey]
    if (!tabs || !button) return
    const observer = new ResizeObserver(sync)
    observer.observe(tabs)
    observer.observe(button)
    return () => observer.disconnect()
  }, [isMobile, activeMobileKey, isDraggingMobile])

  const nearestMobileTab = (clientX: number): MobileNavKey => {
    let nearest = MOBILE_APPS[0].key
    let distance = Number.POSITIVE_INFINITY
    for (const { key } of MOBILE_APPS) {
      const button = mobileTabRefs.current[key]
      if (!button) continue
      const rect = button.getBoundingClientRect()
      const nextDistance = Math.abs(clientX - (rect.left + rect.width / 2))
      if (nextDistance < distance) {
        nearest = key
        distance = nextDistance
      }
    }
    return nearest
  }

  const moveMobileIndicator = (clientX: number) => {
    const track = mobileTrackRef.current
    const first = mobileTabRefs.current[MOBILE_APPS[0].key]
    const last = mobileTabRefs.current[MOBILE_APPS[MOBILE_APPS.length - 1].key]
    const width = mobileIndicatorRect?.width ?? first?.offsetWidth
    if (!track || !first || !last || width == null) return
    const rect = track.getBoundingClientRect()
    const pointerX = clientX - rect.left - width / 2
    const x = Math.min(last.offsetLeft + last.offsetWidth - width, Math.max(first.offsetLeft, pointerX))
    const target = nearestMobileTab(clientX)
    setMobileIndicatorRect({ x, width })
    setMobileDragTarget(target)
    if (mobileGestureRef.current) mobileGestureRef.current.target = target
  }

  const handleMobilePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    mobileGestureRef.current = { startX: event.clientX, moved: false, target: nearestMobileTab(event.clientX) }
  }

  const handleMobilePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const gesture = mobileGestureRef.current
    if (!gesture) return
    if (!gesture.moved && Math.abs(event.clientX - gesture.startX) < 5) return
    gesture.moved = true
    setIsDraggingMobile(true)
    moveMobileIndicator(event.clientX)
  }

  const finishMobileGesture = (event: React.PointerEvent<HTMLElement>, cancelled = false) => {
    const gesture = mobileGestureRef.current
    mobileGestureRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (gesture?.moved && !cancelled) {
      suppressMobileClickRef.current = true
      selectMobileItem(gesture.target)
      window.setTimeout(() => { suppressMobileClickRef.current = false }, 0)
    }
    const snapKey = gesture?.moved && !cancelled ? gesture.target : activeMobileKey
    const button = mobileTabRefs.current[snapKey]
    if (button) setMobileIndicatorRect({ x: button.offsetLeft, width: button.offsetWidth })
    setIsDraggingMobile(false)
    setMobileDragTarget(null)
  }

  const desktopNavRef = useRef<HTMLElement>(null)
  const desktopTabRefs = useRef<Partial<Record<MainApp, HTMLButtonElement | null>>>({})
  const [desktopIndicatorRect, setDesktopIndicatorRect] = useState<{ x: number; width: number } | null>(null)

  useLayoutEffect(() => {
    if (isMobile) return
    const sync = () => {
      const button = desktopTabRefs.current[activeApp]
      if (button) setDesktopIndicatorRect({ x: button.offsetLeft, width: button.offsetWidth })
    }
    sync()
    const nav = desktopNavRef.current
    const button = desktopTabRefs.current[activeApp]
    if (!nav || !button) return
    const observer = new ResizeObserver(sync)
    observer.observe(nav)
    observer.observe(button)
    return () => observer.disconnect()
  }, [isMobile, activeApp])

  const content = <>
    {active === 'paper' && <PaperAnalyzerPage />}
    {active === 'translate' && <TranslatorPage />}
    {active === 'contextor' && <ContextorPage />}
    {active === 'model-review' && <ArchTrainerPage />}
    {active === 'todo' && <TodoPage />}
    {active === 'calendar' && <CalendarPage />}
    {active === 'weekly-review' && <WeeklyReviewPage />}
  </>

  return <ShellNavContext.Provider value={{ active, setActive: selectApp }}>
    <div className="shell-desktop">
      <header className="shell-topbar">
        <div className="shell-brand-wrap">
          <button type="button" className="shell-brand" onClick={() => selectApp(lastPlanApp)} aria-label={t('shell.home')}>
            <span className="shell-brand-mark"><img src="/favicon.svg?v=2" alt="" width={20} height={20} /></span>
            <span className="shell-brand-text">Veloo</span>
          </button>
        </div>
        <nav ref={desktopNavRef} className="shell-app-nav" aria-label={t('shell.workspaceAria')}>
          {desktopIndicatorRect && <div className="shell-app-tab-indicator" style={{ width: desktopIndicatorRect.width, transform: `translateX(${desktopIndicatorRect.x}px)` }} />}
          {DESKTOP_APPS.map(({ key, Icon }) => <button
            key={key}
            ref={element => { desktopTabRefs.current[key] = element }}
            type="button"
            onClick={() => selectApp(key)}
            className={`shell-app-tab${activeApp === key ? ' is-active' : ''}`}
            aria-current={activeApp === key ? 'page' : undefined}
          >
            <Icon size={15} />
            <span>{t(`shell.nav.${key}`)}</span>
          </button>)}
        </nav>
        <div className="shell-topbar-end"><LanguageSwitcher /></div>
      </header>

      <main className="shell-content">
        {isMobile && activeMobileKey === 'plan' && <nav className="shell-plan-switcher" aria-label={t('shell.workspace.plan')}>
          <button type="button" onClick={() => selectApp('todo')} className={activeApp === 'todo' ? 'is-active' : ''}><ListTodo />{t('shell.nav.todo')}</button>
          <button type="button" onClick={() => selectApp('calendar')} className={activeApp === 'calendar' ? 'is-active' : ''}><CalendarDays />{t('shell.nav.calendar')}</button>
        </nav>}
        <div className="shell-view">{content}</div>
      </main>

      <div className="shell-mobile-dock">
        <nav
          ref={mobileTabsRef}
          className={`shell-mobile-tabs${isDraggingMobile ? ' is-dragging' : ''}`}
          aria-label={t('shell.workspaceAria')}
          onPointerDown={handleMobilePointerDown}
          onPointerMove={handleMobilePointerMove}
          onPointerUp={event => finishMobileGesture(event)}
          onPointerCancel={event => finishMobileGesture(event, true)}
        >
          <div ref={mobileTrackRef} className="shell-mobile-tabs-track">
            {mobileIndicatorRect && <div className="shell-mobile-tab-indicator" style={{ width: mobileIndicatorRect.width, transform: `translateX(${mobileIndicatorRect.x}px)` }} />}
            {MOBILE_APPS.map(({ key, Icon, label }) => <button
              key={key}
              ref={element => { mobileTabRefs.current[key] = element }}
              type="button"
              onClick={() => { if (!suppressMobileClickRef.current) selectMobileItem(key) }}
              className={`shell-mobile-tab${(mobileDragTarget ?? activeMobileKey) === key ? ' is-active' : ''}`}
              aria-current={activeMobileKey === key ? 'page' : undefined}
            >
              <Icon />
              <span>{label}</span>
            </button>)}
          </div>
        </nav>
      </div>
    </div>
  </ShellNavContext.Provider>
}
