'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

interface MobileNavCtx {
  open: boolean
  setOpen: (v: boolean) => void
}

const Ctx = createContext<MobileNavCtx>({ open: false, setOpen: () => {} })

export const useMobileNav = () => useContext(Ctx)

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return <Ctx.Provider value={{ open, setOpen }}>{children}</Ctx.Provider>
}
