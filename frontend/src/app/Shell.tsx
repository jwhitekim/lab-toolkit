import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { BookOpen, BrainCircuit, Braces, CalendarDays, FileSearch, Languages, LayoutDashboard, ListTodo, Network } from 'lucide-react'
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

type WorkspaceKey = 'plan' | 'research' | 'model-lab'
interface WorkspaceItem { key: WorkspaceKey; Icon: LucideIcon }

const WORKSPACES: WorkspaceItem[] = [
  { key: 'plan', Icon: LayoutDashboard },
  { key: 'research', Icon: BookOpen },
  { key: 'model-lab', Icon: BrainCircuit },
]
const WORKSPACE_APPS: Record<WorkspaceKey, ActiveApp[]> = {
  plan: ['todo', 'calendar'], research: ['paper', 'translate'], 'model-lab': ['model-review', 'contextor'],
}
const DEFAULT_APP: Record<WorkspaceKey, ActiveApp> = { plan: 'todo', research: 'paper', 'model-lab': 'model-review' }
const APP_ICONS: Partial<Record<ActiveApp, LucideIcon>> = {
  todo: ListTodo, calendar: CalendarDays, paper: FileSearch, translate: Languages, 'model-review': Network, contextor: Braces,
}
const LAST_APP_KEY = 'veloo:last-workspace-apps'

function workspaceFor(app: ActiveApp): WorkspaceKey {
  if (app === 'paper' || app === 'translate') return 'research'
  if (app === 'model-review' || app === 'contextor') return 'model-lab'
  return 'plan'
}

function loadLastApps(): Record<WorkspaceKey, ActiveApp> {
  try {
    const saved = JSON.parse(localStorage.getItem(LAST_APP_KEY) ?? '{}') as Partial<Record<WorkspaceKey, ActiveApp>>
    return {
      plan: saved.plan && WORKSPACE_APPS.plan.includes(saved.plan) ? saved.plan : DEFAULT_APP.plan,
      research: saved.research && WORKSPACE_APPS.research.includes(saved.research) ? saved.research : DEFAULT_APP.research,
      'model-lab': saved['model-lab'] && WORKSPACE_APPS['model-lab'].includes(saved['model-lab']) ? saved['model-lab'] : DEFAULT_APP['model-lab'],
    }
  } catch { return { ...DEFAULT_APP } }
}

export default function Shell() {
  const t = useT()
  const isMobile = useIsMobile()
  const [active, setActiveState] = useState<ActiveApp>('todo')
  const [lastApps, setLastApps] = useState(loadLastApps)
  const activeApp = active === 'weekly-review' ? 'todo' : active
  const activeWorkspace = workspaceFor(activeApp)

  const selectApp = (app: ActiveApp) => {
    setActiveState(app)
    if (app === 'weekly-review') return
    const workspace = workspaceFor(app)
    setLastApps(previous => {
      const next = { ...previous, [workspace]: app }
      localStorage.setItem(LAST_APP_KEY, JSON.stringify(next))
      return next
    })
  }
  const selectWorkspace = (workspace: WorkspaceKey) => selectApp(lastApps[workspace])
  const appTitle: Partial<Record<ActiveApp, string>> = {
    paper: t('shell.nav.paper'), translate: t('shell.nav.translate'), contextor: t('shell.nav.contextor'),
    'model-review': t('shell.nav.model-review'), todo: t('shell.nav.todo'), calendar: t('shell.nav.calendar'), 'weekly-review': t('shell.weeklyReview'),
  }
  useEffect(() => { document.title = appTitle[active] ?? 'Veloo' }, [active, appTitle])

  const mobileTabsRef = useRef<HTMLElement>(null)
  const mobileTrackRef = useRef<HTMLDivElement>(null)
  const mobileTabRefs = useRef<Partial<Record<WorkspaceKey, HTMLElement | null>>>({})
  const [indicatorRect, setIndicatorRect] = useState<{ x: number; width: number } | null>(null)
  const [isDraggingIndicator, setIsDraggingIndicator] = useState(false)
  const [dragTarget, setDragTarget] = useState<WorkspaceKey | null>(null)
  const dragGestureRef = useRef<{ startX: number; moved: boolean; target: WorkspaceKey } | null>(null)
  const suppressClickRef = useRef(false)
  const syncIndicator = () => {
    const button = mobileTabRefs.current[activeWorkspace]
    if (button) setIndicatorRect({ x: button.offsetLeft, width: button.offsetWidth })
  }
  useLayoutEffect(() => {
    if (!isMobile) return
    syncIndicator()
    const tabs = mobileTabsRef.current
    const button = mobileTabRefs.current[activeWorkspace]
    if (!tabs || !button) return
    const observer = new ResizeObserver(syncIndicator)
    observer.observe(tabs); observer.observe(button)
    return () => observer.disconnect()
  }, [isMobile, activeWorkspace, isDraggingIndicator])
  const nearestTab = (clientX: number): WorkspaceKey => {
    let nearest = WORKSPACES[0].key; let distance = Number.POSITIVE_INFINITY
    for (const { key } of WORKSPACES) {
      const button = mobileTabRefs.current[key]; if (!button) continue
      const rect = button.getBoundingClientRect(); const next = Math.abs(clientX - (rect.left + rect.width / 2))
      if (next < distance) { nearest = key; distance = next }
    }
    return nearest
  }
  const moveIndicatorWithPointer = (clientX: number) => {
    const track = mobileTrackRef.current; const first = mobileTabRefs.current[WORKSPACES[0].key]; const last = mobileTabRefs.current[WORKSPACES[2].key]
    const width = indicatorRect?.width ?? first?.offsetWidth
    if (!track || !first || !last || width == null) return
    const rect = track.getBoundingClientRect(); const pointerX = clientX - rect.left - width / 2
    const x = Math.min(last.offsetLeft + last.offsetWidth - width, Math.max(first.offsetLeft, pointerX))
    setIndicatorRect({ x, width }); const target = nearestTab(clientX)
    if (dragGestureRef.current) dragGestureRef.current.target = target
    setDragTarget(target)
  }
  const handleIndicatorPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragGestureRef.current = { startX: event.clientX, moved: false, target: nearestTab(event.clientX) }
  }
  const handleIndicatorPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const gesture = dragGestureRef.current; if (!gesture) return
    if (!gesture.moved && Math.abs(event.clientX - gesture.startX) < 5) return
    gesture.moved = true; setIsDraggingIndicator(true); moveIndicatorWithPointer(event.clientX)
  }
  const finishIndicatorGesture = (event: React.PointerEvent<HTMLElement>, cancelled = false) => {
    const gesture = dragGestureRef.current; dragGestureRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (gesture?.moved && !cancelled) { suppressClickRef.current = true; selectWorkspace(gesture.target); window.setTimeout(() => { suppressClickRef.current = false }, 0) }
    const snapKey = gesture?.moved && !cancelled ? gesture.target : activeWorkspace; const button = mobileTabRefs.current[snapKey]
    if (button) setIndicatorRect({ x: button.offsetLeft, width: button.offsetWidth })
    setIsDraggingIndicator(false); setDragTarget(null)
  }

  const desktopNavRef = useRef<HTMLElement>(null)
  const desktopTabRefs = useRef<Partial<Record<WorkspaceKey, HTMLElement | null>>>({})
  const [desktopIndicatorRect, setDesktopIndicatorRect] = useState<{ x: number; width: number } | null>(null)
  const syncDesktopIndicator = () => { const button = desktopTabRefs.current[activeWorkspace]; if (button) setDesktopIndicatorRect({ x: button.offsetLeft, width: button.offsetWidth }) }
  useLayoutEffect(() => {
    if (isMobile) return
    syncDesktopIndicator(); const nav = desktopNavRef.current; const button = desktopTabRefs.current[activeWorkspace]
    if (!nav || !button) return
    const observer = new ResizeObserver(syncDesktopIndicator); observer.observe(nav); observer.observe(button); return () => observer.disconnect()
  }, [isMobile, activeWorkspace])

  const content = <>
    {active === 'paper' && <PaperAnalyzerPage />}{active === 'translate' && <TranslatorPage />}{active === 'contextor' && <ContextorPage />}
    {active === 'model-review' && <ArchTrainerPage />}{active === 'todo' && <TodoPage />}{active === 'calendar' && <CalendarPage />}{active === 'weekly-review' && <WeeklyReviewPage />}
  </>

  return <ShellNavContext.Provider value={{ active, setActive: selectApp }}>
    <div className="shell-desktop">
      <header className="shell-topbar">
        <div className="shell-brand-wrap"><button type="button" className="shell-brand" onClick={() => selectWorkspace('plan')} aria-label={t('shell.home')}><span className="shell-brand-mark"><img src="/favicon.svg?v=2" alt="" width={20} height={20} /></span><span className="shell-brand-text">Veloo</span></button></div>
        <nav ref={desktopNavRef} className="shell-app-nav" aria-label={t('shell.workspaceAria')}>
          {desktopIndicatorRect && <div className="shell-app-tab-indicator" style={{ width: desktopIndicatorRect.width, transform: `translateX(${desktopIndicatorRect.x}px)` }} />}
          {WORKSPACES.map(({ key, Icon }) => {
            const isActive = activeWorkspace === key
            return <div key={key} ref={element => { desktopTabRefs.current[key] = element }} className={`shell-workspace-item${isActive ? ' is-expanded' : ''}`}>
              {isActive ? <div className="shell-workspace-cluster" aria-label={t(`shell.workspace.${key}`)}><span className="shell-workspace-cluster-label"><Icon size={15} /><span>{t(`shell.workspace.${key}`)}</span></span>{WORKSPACE_APPS[key].map(app => { const AppIcon = APP_ICONS[app] ?? LayoutDashboard; return <button key={app} type="button" onClick={() => selectApp(app)} className={activeApp === app ? 'is-active' : ''} aria-current={activeApp === app ? 'page' : undefined}><AppIcon size={14} /><span>{t(`shell.nav.${app}`)}</span></button> })}</div> : <button type="button" onClick={() => selectWorkspace(key)} className="shell-app-tab"><Icon size={16} /><span>{t(`shell.workspace.${key}`)}</span></button>}
            </div>
          })}
        </nav>
        <div className="shell-topbar-end"><LanguageSwitcher /></div>
      </header>
      <main className="shell-content">{content}</main>
      <div className="shell-mobile-dock"><nav ref={mobileTabsRef} className={`shell-mobile-tabs${isDraggingIndicator ? ' is-dragging' : ''}`} aria-label={t('shell.workspaceAria')} onPointerDown={handleIndicatorPointerDown} onPointerMove={handleIndicatorPointerMove} onPointerUp={event => finishIndicatorGesture(event)} onPointerCancel={event => finishIndicatorGesture(event, true)}><div ref={mobileTrackRef} className="shell-mobile-tabs-track">{indicatorRect && <div className="shell-mobile-tab-indicator" style={{ width: indicatorRect.width, transform: `translateX(${indicatorRect.x}px)` }} />}{WORKSPACES.map(({ key, Icon }) => { const isActive = (dragTarget ?? activeWorkspace) === key; const expanded = activeWorkspace === key && !isDraggingIndicator; return expanded ? <div key={key} ref={element => { mobileTabRefs.current[key] = element }} className="shell-mobile-workspace-group" aria-label={t(`shell.workspace.${key}`)}>{WORKSPACE_APPS[key].map(app => { const AppIcon = APP_ICONS[app] ?? LayoutDashboard; return <button key={app} type="button" onClick={() => selectApp(app)} className={activeApp === app ? 'is-active' : ''} aria-current={activeApp === app ? 'page' : undefined}><AppIcon /><span>{t(`shell.navMobile.${app}`)}</span></button> })}</div> : <button key={key} ref={element => { mobileTabRefs.current[key] = element }} type="button" onClick={() => { if (!suppressClickRef.current) selectWorkspace(key) }} className={`shell-mobile-tab${isActive ? ' is-active' : ''}`} aria-current={isActive ? 'page' : undefined}><Icon /><span>{t(`shell.workspaceMobile.${key}`)}</span></button> })}</div></nav></div>
    </div>
  </ShellNavContext.Provider>
}
