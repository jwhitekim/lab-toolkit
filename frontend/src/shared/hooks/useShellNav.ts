import { createContext, useContext } from 'react'

export type ActiveApp =
  | 'home'
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

export const ShellNavContext = createContext<ShellNav>({ active: 'home', setActive: () => {} })
export const useShellNav = () => useContext(ShellNavContext)
