import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import type { LucideIcon } from 'lucide-react'
import { FileText, Globe, BookOpen, CheckSquare } from 'lucide-react'
import { ShellNavContext, type ActiveApp } from '@/shared/hooks/useShellNav'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
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
  mobileLabel: string
  Icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { key: 'todo',      label: 'Todo',           mobileLabel: 'Todo',      Icon: CheckSquare },
  { key: 'paper',     label: 'Paper Analyzer', mobileLabel: 'Paper',     Icon: FileText },
  { key: 'translate', label: 'Translator',     mobileLabel: 'Translate', Icon: Globe },
  { key: 'contextor', label: 'Contextor',      mobileLabel: 'Context',   Icon: BookOpen },
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
  const isMobile = useIsMobile()
  const mobileTabsRef = useRef<HTMLElement>(null)
  const mobileTrackRef = useRef<HTMLDivElement>(null)
  const mobileTabRefs = useRef<Partial<Record<ActiveApp, HTMLButtonElement | null>>>({})
  const [indicatorRect, setIndicatorRect] = useState<{ x: number; width: number } | null>(null)
  const [isDraggingIndicator, setIsDraggingIndicator] = useState(false)
  const [dragTarget, setDragTarget] = useState<ActiveApp | null>(null)
  const dragGestureRef = useRef<{ startX: number; moved: boolean; target: ActiveApp } | null>(null)
  const suppressClickRef = useRef(false)

  useEffect(() => {
    document.title = APP_TITLE[active] ?? 'veloo'
  }, [active])

  const visibleActive = active === 'weekly-review' ? 'todo' : active

  const syncIndicator = () => {
    const button = mobileTabRefs.current[visibleActive]
    if (!button) return
    setIndicatorRect({ x: button.offsetLeft, width: button.offsetWidth })
  }

  // SwiftUI의 matchedGeometryEffect에 대응하는 선택 캡슐 위치를 유지한다.
  useLayoutEffect(() => {
    if (!isMobile) return
    syncIndicator()

    const tabs = mobileTabsRef.current
    const activeButton = mobileTabRefs.current[visibleActive]
    if (!tabs || !activeButton) return

    const observer = new ResizeObserver(syncIndicator)
    observer.observe(tabs)
    observer.observe(activeButton)
    return () => observer.disconnect()
    // visibleActive가 바뀔 때 새 활성 버튼을 다시 관찰한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, visibleActive])

  useEffect(() => {
    if (!isMobile || isDraggingIndicator) return
    const tabs = mobileTabsRef.current
    const activeButton = mobileTabRefs.current[visibleActive]
    if (!tabs || !activeButton) return
    tabs.scrollTo({
      left: activeButton.offsetLeft - (tabs.clientWidth - activeButton.offsetWidth) / 2,
      behavior: 'smooth',
    })
  }, [isMobile, isDraggingIndicator, visibleActive])

  const nearestTab = (clientX: number) => {
    let nearest = NAV_ITEMS[0].key
    let nearestDistance = Number.POSITIVE_INFINITY
    for (const { key } of NAV_ITEMS) {
      const button = mobileTabRefs.current[key]
      if (!button) continue
      const rect = button.getBoundingClientRect()
      const distance = Math.abs(clientX - (rect.left + rect.width / 2))
      if (distance < nearestDistance) {
        nearest = key
        nearestDistance = distance
      }
    }
    return nearest
  }

  const moveIndicatorWithPointer = (clientX: number) => {
    const track = mobileTrackRef.current
    const first = mobileTabRefs.current[NAV_ITEMS[0].key]
    const last = mobileTabRefs.current[NAV_ITEMS[NAV_ITEMS.length - 1].key]
    const width = indicatorRect?.width ?? first?.offsetWidth
    if (!track || !first || !last || width == null) return

    const trackRect = track.getBoundingClientRect()
    const minX = first.offsetLeft
    const maxX = last.offsetLeft + last.offsetWidth - width
    const pointerX = clientX - trackRect.left - width / 2
    setIndicatorRect({ x: Math.min(maxX, Math.max(minX, pointerX)), width })

    const target = nearestTab(clientX)
    if (dragGestureRef.current) dragGestureRef.current.target = target
    setDragTarget(target)
  }

  const handleIndicatorPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragGestureRef.current = { startX: event.clientX, moved: false, target: nearestTab(event.clientX) }
  }

  const handleIndicatorPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const gesture = dragGestureRef.current
    if (!gesture) return
    if (!gesture.moved && Math.abs(event.clientX - gesture.startX) < 5) return
    gesture.moved = true
    setIsDraggingIndicator(true)
    moveIndicatorWithPointer(event.clientX)
  }

  const finishIndicatorGesture = (event: React.PointerEvent<HTMLElement>, cancelled = false) => {
    const gesture = dragGestureRef.current
    dragGestureRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (gesture?.moved && !cancelled) {
      suppressClickRef.current = true
      setActive(gesture.target)
      window.setTimeout(() => { suppressClickRef.current = false }, 0)
    }
    const snapKey = gesture?.moved && !cancelled ? gesture.target : visibleActive
    const snapButton = mobileTabRefs.current[snapKey]
    if (snapButton) {
      setIndicatorRect({ x: snapButton.offsetLeft, width: snapButton.offsetWidth })
    }
    setIsDraggingIndicator(false)
    setDragTarget(null)
  }

  const selectMobileTab = (key: ActiveApp) => {
    if (suppressClickRef.current) return
    setActive(key)
  }

  // 데스크톱 상단 탭 — 드래그는 없고, 탭 전환 시 배경 인디케이터가 새 탭
  // 위치/폭으로 부드럽게 슬라이드한다 (모바일 캡슐과 같은 원리, 제스처만 없음).
  const desktopNavRef = useRef<HTMLElement>(null)
  const desktopTabRefs = useRef<Partial<Record<ActiveApp, HTMLButtonElement | null>>>({})
  const [desktopIndicatorRect, setDesktopIndicatorRect] = useState<{ x: number; width: number } | null>(null)

  const syncDesktopIndicator = () => {
    const button = desktopTabRefs.current[visibleActive]
    if (!button) return
    setDesktopIndicatorRect({ x: button.offsetLeft, width: button.offsetWidth })
  }

  useLayoutEffect(() => {
    if (isMobile) return
    syncDesktopIndicator()

    const nav = desktopNavRef.current
    const activeButton = desktopTabRefs.current[visibleActive]
    if (!nav || !activeButton) return

    const observer = new ResizeObserver(syncDesktopIndicator)
    observer.observe(nav)
    observer.observe(activeButton)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, visibleActive])

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
          <nav ref={desktopNavRef} className="shell-app-nav" aria-label="Apps">
          {desktopIndicatorRect != null && (
            <div
              className="shell-app-tab-indicator"
              style={{
                width: `${desktopIndicatorRect.width}px`,
                transform: `translateX(${desktopIndicatorRect.x}px)`,
              }}
            />
          )}
          {NAV_ITEMS.map(({ key, label, Icon }) => {
            const isActive = active === key || (key === 'todo' && active === 'weekly-review')
            return (
              <button
                key={key}
                ref={el => { desktopTabRefs.current[key] = el }}
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
        <div className="shell-mobile-dock">
          <nav
            ref={mobileTabsRef}
            className={`shell-mobile-tabs${isDraggingIndicator ? ' is-dragging' : ''}`}
            aria-label="Apps"
            onPointerDown={handleIndicatorPointerDown}
            onPointerMove={handleIndicatorPointerMove}
            onPointerUp={event => finishIndicatorGesture(event)}
            onPointerCancel={event => finishIndicatorGesture(event, true)}
          >
            <div ref={mobileTrackRef} className="shell-mobile-tabs-track">
              {indicatorRect != null && (
                <div
                  className="shell-mobile-tab-indicator"
                  style={{
                    width: `${indicatorRect.width}px`,
                    transform: `translateX(${indicatorRect.x}px)`,
                  }}
                />
              )}
              {NAV_ITEMS.map(({ key, mobileLabel, Icon }) => {
                const selectedKey = dragTarget ?? visibleActive
                const isActive = selectedKey === key
                return (
                  <button
                    key={key}
                    ref={element => { mobileTabRefs.current[key] = element }}
                    type="button"
                    onClick={() => selectMobileTab(key)}
                    className={`shell-mobile-tab${isActive ? ' is-active' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon aria-hidden="true" />
                    <span>{mobileLabel}</span>
                  </button>
                )
              })}
            </div>
          </nav>
        </div>
      </div>
    </ShellNavContext.Provider>
  )
}
