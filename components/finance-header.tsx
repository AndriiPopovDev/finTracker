"use client"

import { useRef } from "react"
import { Download, History, Upload, Wallet } from "lucide-react"
import { exportAllData, importDataFromFile } from "@/lib/data-transfer"

type Props = {
  periodLabel: string
  onToggleHistory: () => void
  historyOpen: boolean
  onImportSuccess: () => void
  onImportError: (message: string) => void
}

export function FinanceHeader({
  periodLabel,
  onToggleHistory,
  historyOpen,
  onImportSuccess,
  onImportError,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    importDataFromFile(file, onImportSuccess, onImportError)
    e.target.value = ""
  }

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
          onClick={exportAllData}
          aria-label="Export data as JSON"
          title="Export backup"
          className="rounded-full p-2 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <Download className="h-5 w-5" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={handleImportClick}
          aria-label="Import data from JSON"
          title="Import backup"
          className="rounded-full p-2 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <Upload className="h-5 w-5" aria-hidden="true" />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
        />

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
