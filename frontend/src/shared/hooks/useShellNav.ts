import { createContext, useContext } from 'react'

export type ActiveApp =
  | 'paper'
  | 'translate'
  | 'contextor'
  | 'model-review'
  | 'todo'
  | 'calendar'
  | 'weekly-review'

interface ShellNav {
  active: ActiveApp
  setActive: (app: ActiveApp) => void
}

export const ShellNavContext = createContext<ShellNav>({ active: 'todo', setActive: () => {} })
export const useShellNav = () => useContext(ShellNavContext)
