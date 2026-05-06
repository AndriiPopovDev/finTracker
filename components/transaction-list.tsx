"use client"

import { CircleArrowDown as ArrowDownCircle, CircleArrowUp as ArrowUpCircle, Pencil, Trash2 } from "lucide-react"
import { formatUAH, getCategoryEmoji, type CurrencyCode, type Transaction } from "@/lib/finance"

type Props = {
  transactions: Transaction[]
  periodLabel: string
  onDelete: (id: number) => void
  onEdit: (tx: Transaction) => void
  currency: CurrencyCode
}

export function TransactionList({ transactions, periodLabel, onDelete, onEdit, currency }: Props) {
  return (
    <div className="space-y-3">
      <h3 className="px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        Transactions for {periodLabel}
      </h3>

      {transactions.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-center text-sm text-slate-500">
          No transactions for this period yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {transactions.map((t) => {
            const signedAmount = t.type === "income" ? Math.abs(t.amount) : -Math.abs(t.amount)
            const isIncome = signedAmount > 0
            return (
              <li
                key={t.id}
                className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-3"
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                    isIncome
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                  }`}
                  aria-hidden="true"
                >
                  {isIncome ? (
                    <ArrowUpCircle className="h-5 w-5" />
                  ) : (
                    <ArrowDownCircle className="h-5 w-5" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p
                    className={`text-base font-medium ${
                      signedAmount > 0 ? "text-emerald-500" : "text-rose-500"
                    }`}
                  >
                    {formatUAH(Math.abs(t.amount), signedAmount > 0 ? "plus" : "minus", currency)}
                  </p>
                  {t.name && (
                    <p className="truncate text-xs font-medium text-slate-300">{t.name}</p>
                  )}
                  <p className="truncate text-xs text-slate-400">
                    <span aria-hidden="true">{getCategoryEmoji(t.type, t.category)} </span>
                    {t.category} <span className="text-slate-600">&middot;</span> {t.date}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onEdit(t)}
                  aria-label={`Edit ${t.category} transaction`}
                  className="shrink-0 rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-800 hover:text-blue-400"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(t.id)}
                  aria-label={`Delete ${t.category} transaction`}
                  className="shrink-0 rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-800 hover:text-rose-400"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
