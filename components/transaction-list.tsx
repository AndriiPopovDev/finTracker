"use client"

import { useState } from "react"
import { CircleArrowDown as ArrowDownCircle, CircleArrowUp as ArrowUpCircle, ArrowLeftRight, Repeat, Pencil, Trash2, ChevronDown } from "lucide-react"
import { formatUAH, getCategoryEmoji, type CurrencyCode, type Transaction } from "@/lib/finance"

type Props = {
  transactions: Transaction[]
  periodLabel: string
  onDelete: (id: number) => void
  onEdit: (tx: Transaction) => void
  currency: CurrencyCode
}

const VISIBLE_COUNT = 3
const EXPANDED_COUNT = 5

export function TransactionList({ transactions, periodLabel, onDelete, onEdit, currency }: Props) {
  const [visibleCount, setVisibleCount] = useState(VISIBLE_COUNT)
  const visibleTransactions = transactions.slice(0, visibleCount)
  const hasMore = transactions.length > visibleCount
  const remainingCount = transactions.length - visibleCount

  const handleShowMore = () => {
    setVisibleCount((prev) => Math.min(prev + EXPANDED_COUNT, transactions.length))
  }

  const handleShowLess = () => {
    setVisibleCount(VISIBLE_COUNT)
  }

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
        <>
          <ul className="space-y-2">
            {visibleTransactions.map((t) => {
            const isTransfer = t.type === "transfer"
            const signedAmount = t.type === "income" ? Math.abs(t.amount) : t.type === "expense" ? -Math.abs(t.amount) : 0
            const isIncome = signedAmount > 0
            return (
              <li
                key={t.id}
                className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-3"
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                    isTransfer
                      ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                      : isIncome
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                  }`}
                  aria-hidden="true"
                >
                  {t.recurringId ? (
                    <Repeat className="h-5 w-5 text-purple-400" />
                  ) : isTransfer ? (
                    <ArrowLeftRight className="h-5 w-5" />
                  ) : isIncome ? (
                    <ArrowUpCircle className="h-5 w-5" />
                  ) : (
                    <ArrowDownCircle className="h-5 w-5" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p
                    className={`text-base font-medium ${
                      isTransfer ? "text-blue-400" :
                      signedAmount > 0 ? "text-emerald-500" : "text-rose-500"
                    }`}
                  >
                    {isTransfer ? (
                      formatUAH(Math.abs(t.amount), undefined, currency)
                    ) : (
                      formatUAH(Math.abs(t.amount), signedAmount > 0 ? "plus" : "minus", currency)
                    )}
                  </p>
                  {t.name && (
                    <p className="truncate text-xs font-medium text-slate-300">{t.name}</p>
                  )}
                  <p className="truncate text-xs text-slate-400">
                    {isTransfer ? (
                      <>
                        <span className="capitalize text-blue-400">{t.transferFrom}</span>
                        <span className="text-slate-600"> → </span>
                        <span className="capitalize text-emerald-400">{t.transferTo}</span>
                      </>
                    ) : (
                      <>
                        <span aria-hidden="true">{getCategoryEmoji(t.type, t.category)} </span>
                        {t.category} <span className="text-slate-600">&middot;</span> {t.date}
                        {t.destination && (
                          <>
                            <span className="text-slate-600"> &middot; </span>
                            <span className={`capitalize ${
                              t.destination === "card" ? "text-blue-400" :
                              t.destination === "cash" ? "text-amber-400" :
                              "text-purple-400"
                            }`}>{t.destination}</span>
                          </>
                        )}
                      </>
                    )}
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

          {(hasMore || visibleCount > VISIBLE_COUNT) && (
            <button
              type="button"
              onClick={visibleCount >= transactions.length ? handleShowLess : handleShowMore}
              className="mx-auto mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-700/50 bg-slate-900/60 py-2.5 text-xs font-semibold text-slate-400 transition-all hover:border-blue-500/40 hover:bg-slate-800 hover:text-blue-400 active:scale-[0.98]"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${visibleCount >= transactions.length ? "rotate-180" : ""}`} />
              {visibleCount >= transactions.length ? "Show less" : `${remainingCount} more`}
            </button>
          )}
        </>
      )}
    </div>
  )
}
