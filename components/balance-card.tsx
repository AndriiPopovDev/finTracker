import { Wallet } from "lucide-react"
import { formatUAH } from "@/lib/finance"

type Props = {
  plan: number
  totalExpense: number
}

export function BalanceCard({ plan, totalExpense }: Props) {
  const remaining = plan - totalExpense
  const spentPct = plan > 0 ? Math.min(100, (totalExpense / plan) * 100) : 0

  // Budget health colors
  const healthColor =
    spentPct >= 90
      ? { text: "text-rose-400", bar: "from-rose-500 to-rose-600", glow: "shadow-rose-500/50", icon: "ring-rose-400/20 bg-rose-400/20 text-rose-400" }
      : spentPct >= 60
      ? { text: "text-amber-400", bar: "from-amber-500 to-amber-600", glow: "shadow-amber-500/50", icon: "ring-amber-400/20 bg-amber-400/20 text-amber-400" }
      : { text: "text-emerald-400", bar: "from-emerald-500 to-emerald-600", glow: "shadow-emerald-500/50", icon: "ring-emerald-400/20 bg-emerald-400/20 text-emerald-400" }

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
          <h2 className={`mt-2 text-4xl font-extrabold tracking-tight text-balance ${healthColor.text}`}>
            {formatUAH(remaining)}
          </h2>
          <p className="mt-1 text-xs text-slate-400">From planned income</p>
        </div>
        <div className={`rounded-xl p-2 ring-1 ${healthColor.icon}`}>
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
            className={`h-full rounded-full bg-gradient-to-r ${healthColor.bar} shadow-[0_0_12px_var(--tw-shadow-color)] transition-all ${healthColor.glow}`}
            style={{ width: `${spentPct}%` }}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  )
}
