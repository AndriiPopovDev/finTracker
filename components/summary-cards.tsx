import { ArrowDownCircle, ArrowUpCircle } from "lucide-react"
import { formatUAH } from "@/lib/finance"

type Props = {
  totalIncome: number
  totalExpense: number
}

export function SummaryCards({ totalIncome, totalExpense }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/10 via-slate-900/60 to-slate-900/40 p-4 shadow-lg shadow-emerald-950/20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-emerald-500/20 blur-2xl"
        />
        <div className="relative flex items-center gap-2 text-slate-300">
          <ArrowUpCircle className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Income
          </span>
        </div>
        <p className="relative mt-3 bg-gradient-to-r from-emerald-300 to-emerald-500 bg-clip-text text-xl font-extrabold text-transparent">
          {formatUAH(totalIncome, "plus")}
        </p>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-rose-500/15 bg-gradient-to-br from-rose-500/10 via-slate-900/60 to-slate-900/40 p-4 shadow-lg shadow-rose-950/20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-rose-500/20 blur-2xl"
        />
        <div className="relative flex items-center gap-2 text-slate-300">
          <ArrowDownCircle className="h-4 w-4 text-rose-400" aria-hidden="true" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Expenses
          </span>
        </div>
        <p className="relative mt-3 bg-gradient-to-r from-rose-300 to-rose-500 bg-clip-text text-xl font-extrabold text-transparent">
          {totalExpense === 0 ? formatUAH(0, "minus") : formatUAH(totalExpense, "minus")}
        </p>
      </div>
    </div>
  )
}
