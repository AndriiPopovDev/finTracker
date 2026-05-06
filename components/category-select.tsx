"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Briefcase,
  Check,
  ChevronDown,
  Film,
  Gamepad2,
  Gift,
  Home,
  Laptop,
  Pin,
  ShoppingCart,
  Star,
  User,
  Utensils,
  type LucideIcon,
} from "lucide-react"
import type { CategoryIconName, CategoryInfo } from "@/lib/finance"

const ICONS: Record<CategoryIconName, LucideIcon> = {
  cart: ShoppingCart,
  utensils: Utensils,
  film: Film,
  home: Home,
  gift: Gift,
  gamepad: Gamepad2,
  user: User,
  briefcase: Briefcase,
  star: Star,
  laptop: Laptop,
  pin: Pin,
}

type Props = {
  categories: readonly CategoryInfo[]
  value: string
  onChange: (next: string) => void
  onKeepInputFocus?: () => void
}

export function CategorySelect({ categories, value, onChange, onKeepInputFocus }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  const selected = categories.find((c) => c.name === value) ?? categories[0]
  const SelectedIcon = ICONS[selected.iconName]

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [])

  return (
    <div className="relative min-w-0" ref={ref}>
      <button
        type="button"
        onPointerDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-2.5 text-sm text-white outline-none transition-colors focus:border-blue-500"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
            style={{
              backgroundColor: `${selected.color}1f`,
              color: selected.color,
            }}
            aria-hidden="true"
          >
            <SelectedIcon className="h-3.5 w-3.5" />
          </span>
          <span className="truncate">{selected.name}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, scale: 0.92, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -6 }}
            transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.6 }}
            style={{ transformOrigin: "bottom right" }}
            className="absolute bottom-full right-0 z-[70] mb-2 w-64 max-w-[calc(100vw-2rem)] max-h-[min(250px,45dvh)] overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-slate-900/95 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-2xl ring-1 ring-white/5"
          >
            {categories.map((c, i) => {
              const active = c.name === value
              const Icon = ICONS[c.iconName]
              return (
                <motion.li
                  key={c.name}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.02 * i, duration: 0.18, ease: "easeOut" }}
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(c.name)
                      setOpen(false)
                      onKeepInputFocus?.()
                    }}
                    className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-100 transition-colors hover:bg-white/10 ${
                      active ? "bg-white/10" : ""
                    }`}
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-white/10"
                      style={{
                        backgroundColor: `${c.color}1f`,
                        color: c.color,
                      }}
                      aria-hidden="true"
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 truncate font-medium">{c.name}</span>
                    {active && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.15 }}
                        className="text-emerald-400"
                        aria-hidden="true"
                      >
                        <Check className="h-4 w-4" />
                      </motion.span>
                    )}
                  </button>
                </motion.li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
