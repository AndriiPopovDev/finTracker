"use client"

import { useState } from "react"
import { ChevronDown, ChevronLeft, ChevronRight, History, Settings } from "lucide-react"

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

type Props = {
  periodLabel: string
  currentDate: Date
  onDateChange: (date: Date) => void
  onToggleHistory: () => void
  historyOpen: boolean
  onOpenSettings: () => void
}

export function FinanceHeader({
  periodLabel,
  currentDate,
  onDateChange,
  onToggleHistory,
  historyOpen,
  onOpenSettings,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()
  const [pickerYear, setPickerYear] = useState(currentYear)

  const selectMonth = (monthIndex: number) => {
    onDateChange(new Date(pickerYear, monthIndex, 1))
    setPickerOpen(false)
  }

  return (
    <header className="flex items-center justify-between gap-3 py-2">
      <h1 className="text-lg font-extrabold tracking-tight text-white">FinanceTracker</h1>

      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setPickerYear(currentYear)
              setPickerOpen((v) => !v)
            }}
            className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-sm font-medium text-slate-200 transition-colors hover:text-white"
          >
            <span>{periodLabel}</span>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${pickerOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>

          {pickerOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} aria-hidden="true" />
              <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-slate-700 bg-slate-900/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl">
                <div className="mb-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setPickerYear((y) => y - 1)}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                    aria-label="Previous year"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span className="text-sm font-bold text-white">{pickerYear}</span>
                  <button
                    type="button"
                    onClick={() => setPickerYear((y) => y + 1)}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                    aria-label="Next year"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {MONTH_NAMES.map((name, i) => {
                    const isActive = pickerYear === currentYear && i === currentMonth
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => selectMonth(i)}
                        className={`rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
                          isActive
                            ? "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/40"
                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        {name.slice(0, 3)}
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleHistory}
          aria-label={historyOpen ? "Hide history" : "Show history"}
          aria-pressed={historyOpen}
          className={`rounded-full p-2 transition-colors ${
            historyOpen
              ? "bg-slate-800 text-white"
              : "text-slate-300 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <History className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Open settings"
          className="rounded-full p-2 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <Settings className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}
