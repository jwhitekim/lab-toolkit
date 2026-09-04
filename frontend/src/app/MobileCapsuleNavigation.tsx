import { useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useT } from '@/shared/i18n'
import {
  MOBILE_NAV,
  WORKSPACE_NAV_ITEMS,
  loadLastPlanNav,
  mobilePrimaryFor,
  saveLastPlanNav,
  type MobilePrimaryKey,
  type NavKey,
} from '@/shared/navigation/workspaceNav'

// 모바일 하단 캡슐 독. 시각 디자인·제스처는 기존 Shell.tsx 구현을 그대로 옮긴 것 —
// capsule-dock-spec.md의 "반드시 유지" 대상이라 애니메이션/스타일은 건드리지 않았고,
// 탭 선택이 로컬 state 대신 라우트 이동(navigate)으로 바뀐 것만 다르다.
export default function MobileCapsuleNavigation() {
  const t = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const { username = '' } = useParams()

  // 현재 라우트에서 활성 NavKey를 유도한다 (route가 source of truth).
  const activeNavKey: NavKey =
    WORKSPACE_NAV_ITEMS.find(item => location.pathname.startsWith(`/${username}/${item.path}`))?.key ?? 'tasks'
  const activeMobileKey = mobilePrimaryFor(activeNavKey)

  const goToNav = (key: NavKey) => {
    if (key === 'tasks' || key === 'calendar') saveLastPlanNav(key)
    navigate(`/${username}/${key}`)
  }

  const selectMobileItem = (key: MobilePrimaryKey) => {
    goToNav(key === 'plan' ? loadLastPlanNav() : key)
  }

  const tabsRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Partial<Record<MobilePrimaryKey, HTMLButtonElement | null>>>({})
  const [indicatorRect, setIndicatorRect] = useState<{ x: number; width: number; trackWidth: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragTarget, setDragTarget] = useState<MobilePrimaryKey | null>(null)
  const gestureRef = useRef<{ startX: number; moved: boolean; target: MobilePrimaryKey } | null>(null)
  const suppressClickRef = useRef(false)

  useLayoutEffect(() => {
    if (isDragging) return
    const sync = () => {
      const button = tabRefs.current[activeMobileKey]
      const track = trackRef.current
      if (button && track) setIndicatorRect({ x: button.offsetLeft, width: button.offsetWidth, trackWidth: track.clientWidth })
    }
    sync()
    const tabs = tabsRef.current
    const button = tabRefs.current[activeMobileKey]
    if (!tabs || !button) return
    const observer = new ResizeObserver(sync)
    observer.observe(tabs)
    observer.observe(button)
    return () => observer.disconnect()
  }, [activeMobileKey, isDragging])

  const nearestTab = (clientX: number): MobilePrimaryKey => {
    let nearest = MOBILE_NAV[0].key
    let distance = Number.POSITIVE_INFINITY
    for (const { key } of MOBILE_NAV) {
      const button = tabRefs.current[key]
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

  const moveIndicator = (clientX: number) => {
    const track = trackRef.current
    const first = tabRefs.current[MOBILE_NAV[0].key]
    const last = tabRefs.current[MOBILE_NAV[MOBILE_NAV.length - 1].key]
    const width = indicatorRect?.width ?? first?.offsetWidth
    if (!track || !first || !last || width == null) return
    const rect = track.getBoundingClientRect()
    const pointerX = clientX - rect.left - width / 2
    const x = Math.min(last.offsetLeft + last.offsetWidth - width, Math.max(first.offsetLeft, pointerX))
    const target = nearestTab(clientX)
    setIndicatorRect({ x, width, trackWidth: track.clientWidth })
    setDragTarget(target)
    if (gestureRef.current) gestureRef.current.target = target
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    gestureRef.current = { startX: event.clientX, moved: false, target: nearestTab(event.clientX) }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current
    if (!gesture) return
    if (!gesture.moved && Math.abs(event.clientX - gesture.startX) < 5) return
    gesture.moved = true
    setIsDragging(true)
    moveIndicator(event.clientX)
  }

  const finishGesture = (event: React.PointerEvent<HTMLElement>, cancelled = false) => {
    const gesture = gestureRef.current
    gestureRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (gesture?.moved && !cancelled) {
      suppressClickRef.current = true
      selectMobileItem(gesture.target)
      window.setTimeout(() => { suppressClickRef.current = false }, 0)
    }
    const snapKey = gesture?.moved && !cancelled ? gesture.target : activeMobileKey
    const button = tabRefs.current[snapKey]
    const track = trackRef.current
    if (button && track) setIndicatorRect({ x: button.offsetLeft, width: button.offsetWidth, trackWidth: track.clientWidth })
    setIsDragging(false)
    setDragTarget(null)
  }

  return (
    <>
      {activeMobileKey === 'plan' && (
        <nav className="shell-plan-switcher" aria-label={t('shell.workspace.plan')}>
          <button type="button" onClick={() => goToNav('tasks')} className={activeNavKey === 'tasks' ? 'is-active' : ''}>
            <MOBILE_NAV_TASKS_ICON />{t('shell.nav.todo')}
          </button>
          <button type="button" onClick={() => goToNav('calendar')} className={activeNavKey === 'calendar' ? 'is-active' : ''}>
            <MOBILE_NAV_CALENDAR_ICON />{t('shell.nav.calendar')}
          </button>
        </nav>
      )}

      <div className="shell-mobile-dock">
        <nav
          ref={tabsRef}
          className={`shell-mobile-tabs${isDragging ? ' is-dragging' : ''}`}
          aria-label={t('shell.workspaceAria')}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={event => finishGesture(event)}
          onPointerCancel={event => finishGesture(event, true)}
        >
          <div ref={trackRef} className="shell-mobile-tabs-track">
            {indicatorRect && (
              <div
                className="shell-mobile-tab-indicator"
                style={{
                  width: indicatorRect.width,
                  transform: `translateX(${indicatorRect.x}px)`,
                  // 캡슐이 독 안 어디에 있는지(0~100%)에 따라 표면 반사광(스페큘러 하이라이트)
                  // 위치를 바꾼다 — 고정된 광원 아래로 유리 캡슐이 지나가는 느낌을 낸다.
                  ['--sheen-x' as string]: `${sheenPercent(indicatorRect)}%`,
                } as React.CSSProperties}
              />
            )}
            {MOBILE_NAV.map(({ key, Icon, label }) => (
              <button
                key={key}
                ref={element => { tabRefs.current[key] = element }}
                type="button"
                onClick={() => { if (!suppressClickRef.current) selectMobileItem(key) }}
                className={`shell-mobile-tab${(dragTarget ?? activeMobileKey) === key ? ' is-active' : ''}`}
                aria-current={activeMobileKey === key ? 'page' : undefined}
              >
                <Icon />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </>
  )
}

// 인디케이터가 독 트랙 안에서 좌우로 이동할 수 있는 범위(0~trackWidth-width) 중
// 현재 어디에 있는지를 0~100%로 환산 — 표면 반사광 위치 계산에 쓴다.
function sheenPercent({ x, width, trackWidth }: { x: number; width: number; trackWidth: number }) {
  const range = trackWidth - width
  if (range <= 0) return 50
  return Math.min(100, Math.max(0, (x / range) * 100))
}

// Plan 스위처 아이콘은 WORKSPACE_NAV_ITEMS에서 그대로 가져와 하드코딩 중복을 피한다.
const MOBILE_NAV_TASKS_ICON = WORKSPACE_NAV_ITEMS.find(item => item.key === 'tasks')!.Icon
const MOBILE_NAV_CALENDAR_ICON = WORKSPACE_NAV_ITEMS.find(item => item.key === 'calendar')!.Icon
