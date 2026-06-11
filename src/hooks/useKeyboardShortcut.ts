import { useEffect } from 'react'

type ShortcutHandler = (e: KeyboardEvent) => void

export function useKeyboardShortcut(key: string, handler: ShortcutHandler, deps: any[] = []) {
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault()
        handler(e)
      }
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [key, handler, ...deps])
}