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
  const [indicatorRect, setIndicatorRect] = useState<{ x: number; width: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  // 실제 인스타그램 앱 터치 동작 재현: 손가락이 닿아있는 동안(탭이든 드래그든) 바 전체가 살짝
  // 부풀고, 인디케이터도 그 비율 그대로 같이 커지며(부모 scale의 자연스러운 효과, 별도 계산 불필요)
  // 진한 그레이 → 연한 그레이로 바뀐다. 손을 떼면 원래대로. isDragging(5px 이상 움직여야 켜짐)과
  // 달리 isPressed는 pointerdown 즉시 켜진다 — 살짝 눌렀다 떼는 탭에도 피드백이 있어야 하므로.
  const [isPressed, setIsPressed] = useState(false)
  const [dragTarget, setDragTarget] = useState<MobilePrimaryKey | null>(null)
  const gestureRef = useRef<{ startX: number; moved: boolean; target: MobilePrimaryKey } | null>(null)
  const suppressClickRef = useRef(false)

  useLayoutEffect(() => {
    if (isDragging) return
    const button = tabRefs.current[activeMobileKey]
    const track = trackRef.current
    if (!button || !track) return
    setIndicatorRect(indicatorRectFor(button))

    const tabs = tabsRef.current
    const observer = new ResizeObserver(() => {
      const b = tabRefs.current[activeMobileKey]
      if (b) setIndicatorRect(indicatorRectFor(b))
    })
    if (tabs) observer.observe(tabs)
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
    const width = indicatorRect?.width ?? (first ? first.offsetWidth - INDICATOR_INSET * 2 : undefined)
    if (!track || !first || !last || width == null) return
    const rect = track.getBoundingClientRect()
    const pointerX = clientX - rect.left - width / 2
    const minX = first.offsetLeft + INDICATOR_INSET
    const maxX = last.offsetLeft + last.offsetWidth - INDICATOR_INSET - width
    const x = Math.min(maxX, Math.max(minX, pointerX))
    const target = nearestTab(clientX)
    setIndicatorRect({ x, width })
    setDragTarget(target)
    if (gestureRef.current) gestureRef.current.target = target
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    gestureRef.current = { startX: event.clientX, moved: false, target: nearestTab(event.clientX) }
    setIsPressed(true)
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
    if (button) setIndicatorRect(indicatorRectFor(button))
    setIsDragging(false)
    setDragTarget(null)
    setIsPressed(false)
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
          className={`shell-mobile-tabs${isDragging ? ' is-dragging' : ''}${isPressed ? ' is-pressed' : ''}`}
          aria-label={t('shell.workspaceAria')}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={event => finishGesture(event)}
          onPointerCancel={event => finishGesture(event, true)}
        >
          <div ref={trackRef} className="shell-mobile-tabs-track">
            {indicatorRect && (
              <div
                className={`shell-mobile-tab-indicator${isPressed ? ' is-pressed' : ''}`}
                style={{
                  width: indicatorRect.width,
                  transform: `translateX(${indicatorRect.x}px)`,
                }}
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

// 인디케이터 폭을 탭 버튼(offsetWidth) 그대로 쓰면 세그먼트 전체를 꽉 채운다. 좁은 화면에서
// 5개 탭 세그먼트 폭이 다 ~70px 정도로 좁아서(flex:1 20%, 탭마다 동일), 인셋을 너무 크게 주면
// 높이(WorkspaceLayout.css의 .shell-mobile-tab-indicator, 44px)보다 폭이 좁아져 다시 원형이
// 된다 — 인셋을 3px로 줄여서 폭을 최대한 확보(2026-09-05 실제 기기 DOM 계산값으로 확인).
const INDICATOR_INSET = 3

function indicatorRectFor(button: HTMLButtonElement) {
  return {
    x: button.offsetLeft + INDICATOR_INSET,
    width: button.offsetWidth - INDICATOR_INSET * 2,
  }
}

// Plan 스위처 아이콘은 WORKSPACE_NAV_ITEMS에서 그대로 가져와 하드코딩 중복을 피한다.
const MOBILE_NAV_TASKS_ICON = WORKSPACE_NAV_ITEMS.find(item => item.key === 'tasks')!.Icon
const MOBILE_NAV_CALENDAR_ICON = WORKSPACE_NAV_ITEMS.find(item => item.key === 'calendar')!.Icon
