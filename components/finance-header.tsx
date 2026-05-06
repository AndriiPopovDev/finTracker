"use client"

import { History, Wallet } from "lucide-react"

type Props = {
  periodLabel: string
  onToggleHistory: () => void
  historyOpen: boolean
}

export function FinanceHeader({ periodLabel, onToggleHistory, historyOpen }: Props) {
  return (
    <header className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-blue-500/15 p-2 text-blue-400">
          <Wallet className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-extrabold text-white tracking-tight">FinanceTracker</h1>
      </div>

      <div className="flex items-center gap-2">
        <span className="rounded-full border border-slate-700 bg-slate-900/60 px-4 py-1.5 text-xs font-medium text-slate-200">
          {periodLabel}
        </span>
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
      </div>
    </header>
  )
}
