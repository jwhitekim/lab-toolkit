import type { LucideIcon } from 'lucide-react'
import { Braces, CalendarDays, FileSearch, LayoutDashboard, Languages, ListTodo, Network } from 'lucide-react'

// Primary Navigation — 서로 독립적인 제품 영역. Desktop Sidebar와 Mobile Capsule
// Navigation이 이 하나의 정보 구조를 공유한다 (route는 항상 같고, 표현 방식만 다름).
export type NavKey = 'tasks' | 'calendar' | 'papers' | 'translate' | 'models' | 'concepts'
export type NavGroupKey = 'work' | 'research' | 'knowledge'

export interface NavItem {
  key: NavKey
  path: string // /:username/ 기준 상대 경로
  labelKey: string // i18n 키 (shell.nav.*)
  Icon: LucideIcon
}

export interface NavGroup {
  group: NavGroupKey
  labelKey: string
  items: NavItem[]
}

export const WORKSPACE_NAV: NavGroup[] = [
  {
    group: 'work',
    labelKey: 'shell.navGroup.work',
    items: [
      { key: 'tasks', path: 'tasks', labelKey: 'shell.nav.todo', Icon: ListTodo },
      { key: 'calendar', path: 'calendar', labelKey: 'shell.nav.calendar', Icon: CalendarDays },
    ],
  },
  {
    group: 'research',
    labelKey: 'shell.navGroup.research',
    items: [
      { key: 'papers', path: 'papers', labelKey: 'shell.nav.paper', Icon: FileSearch },
      { key: 'translate', path: 'translate', labelKey: 'shell.nav.translate', Icon: Languages },
    ],
  },
  {
    group: 'knowledge',
    labelKey: 'shell.navGroup.knowledge',
    items: [
      { key: 'models', path: 'models', labelKey: 'shell.nav.model-review', Icon: Network },
      { key: 'concepts', path: 'concepts', labelKey: 'shell.nav.contextor', Icon: Braces },
    ],
  },
]

export const WORKSPACE_NAV_ITEMS: NavItem[] = WORKSPACE_NAV.flatMap(group => group.items)

// Mobile Capsule Navigation은 화면이 좁아 Tasks/Calendar를 "Plan" 하나로 합친다.
// (모바일에서 하단 독 슬롯이 5개까지가 자연스럽다는 기존 결정 — capsule-dock-spec.md)
export type MobilePrimaryKey = 'plan' | 'papers' | 'translate' | 'models' | 'concepts'

export const MOBILE_NAV: { key: MobilePrimaryKey; label: string; Icon: LucideIcon }[] = [
  { key: 'plan', label: 'Plan', Icon: LayoutDashboard },
  { key: 'papers', label: 'Paper', Icon: FileSearch },
  { key: 'translate', label: 'Trans', Icon: Languages },
  { key: 'models', label: 'Models', Icon: Network },
  { key: 'concepts', label: 'Concepts', Icon: Braces },
]

export function mobilePrimaryFor(navKey: NavKey): MobilePrimaryKey {
  return navKey === 'tasks' || navKey === 'calendar' ? 'plan' : navKey
}

// 'plan' 탭이 tasks/calendar 중 어디로 갈지는 마지막 방문지를 기억한다 (기존 동작 유지).
export const LAST_PLAN_KEY = 'veloo:last-plan-app'

export function loadLastPlanNav(): 'tasks' | 'calendar' {
  return localStorage.getItem(LAST_PLAN_KEY) === 'calendar' ? 'calendar' : 'tasks'
}

export function saveLastPlanNav(key: 'tasks' | 'calendar') {
  localStorage.setItem(LAST_PLAN_KEY, key)
}
