import { Wallet } from "lucide-react"
import { formatUAH } from "@/lib/finance"

type Props = {
  plan: number
  totalExpense: number
}

export function BalanceCard({ plan, totalExpense }: Props) {
  const remaining = plan - totalExpense
  const spentPct = plan > 0 ? Math.min(100, (totalExpense / plan) * 100) : 0

  return (
    <div className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-950 via-slate-900 to-slate-950 p-5 shadow-2xl shadow-blue-950/40">
      {/* gradient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl"
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Remaining
          </p>
          <h2 className="mt-2 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent text-balance">
            {formatUAH(remaining)}
          </h2>
          <p className="mt-1 text-xs text-slate-400">From planned income</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-500/5 p-2 text-amber-400 ring-1 ring-amber-400/20">
          <Wallet className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>

      <div className="relative mt-5">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Spent {Math.round(spentPct)}%</span>
          <span>
            {formatUAH(totalExpense).replace(" UAH", "")} / {formatUAH(plan)}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800/80">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 shadow-[0_0_12px_rgba(59,130,246,0.6)] transition-all"
            style={{ width: `${spentPct}%` }}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  )
}
