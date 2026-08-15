export type Priority = 'urgent' | 'mid' | 'normal'

export interface Step {
  id: number
  todo_id: number
  text: string
  done: boolean
  order_index: number
}

export interface Todo {
  id: number
  name: string
  memo: string
  priority: Priority
  deadline: string
  done: boolean
  ai_strategy: string
  created_at: string
  updated_at: string
  steps: Step[]
    start_time?: string | null
    end_time?: string | null
    remind_at?: string | null
  reminded?: boolean
  completed_at?: string
}

export interface WeeklyReview {
  week_start: string
  week_end: string
  completed: number
  created: number
  completion_rate: number
  overdue: Todo[]
  by_priority: Record<string, { done: number; todo: number }>
}

export type NavFilter = 'today' | 'week' | 'all' | 'memo'
