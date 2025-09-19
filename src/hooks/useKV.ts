import { useEffect, useState } from 'react'

// Simple localStorage backed hook replicating minimal useKV semantics
export function useKV<T>(key: string, initial: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw != null) return JSON.parse(raw)
    } catch {}
    return initial
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {}
  }, [key, value])

  const setter = (next: T | ((prev: T) => T)) => {
    setValue(prev => typeof next === 'function' ? (next as (p: T) => T)(prev) : next)
  }

  return [value, setter]
}
