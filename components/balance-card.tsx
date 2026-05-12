import { motion } from "framer-motion"
import { Repeat, PiggyBank } from "lucide-react"
import { formatUAH, type CurrencyCode } from "@/lib/finance"
import { triggerHaptic } from "@/lib/haptic"
import { AnimatedCounter, StatCard } from "@/components/ui"
import { ANIMATION } from "@/lib/theme"

type Props = {
  card: number
  cash: number
  savings: number
  monthlyTotal: number
  currency: CurrencyCode
  onCurrencyChange: (currency: CurrencyCode) => void
}

export function BalanceCard({ card, cash, savings, monthlyTotal, currency, onCurrencyChange }: Props) {
  const globalBalance = card + cash
  const remainingBalance = globalBalance - monthlyTotal

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800/40 bg-slate-950 p-4">
      {/* Subtle ambient glow - production optimized */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-24 w-24 rounded-full bg-blue-500/2 blur-[30px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-12 -left-12 h-20 w-20 rounded-full bg-cyan-500/1 blur-[25px]"
      />

      <div className="relative">
        {/* Header with currency selector */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Global Balance
            </p>
            <AnimatedCounter className="mt-1 text-3xl font-semibold tracking-tight text-white">
              {formatUAH(globalBalance, undefined, currency)}
            </AnimatedCounter>
          </div>

          <div className="flex items-center gap-1.5">
            {([
              { code: "UAH", label: "₴" },
              { code: "USD", label: "$" },
              { code: "EUR", label: "€" },
            ] as const).map((item) => (
              <motion.button
                key={item.code}
                type="button"
                onClick={() => {
                  triggerHaptic('light')
                  onCurrencyChange(item.code)
                }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                  currency === item.code
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "text-slate-500 hover:text-slate-300"
                }`}
                aria-label={`Switch currency to ${item.code}`}
                aria-pressed={currency === item.code}
              >
                {item.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Account balances */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="rounded-xl bg-slate-900/40 px-2.5 py-2">
            <p className="text-[10px] font-medium text-slate-500">Card</p>
            <motion.p 
              key={card}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="mt-0.5 text-sm font-semibold text-slate-200"
            >
              {formatUAH(card, undefined, currency)}
            </motion.p>
          </div>
          <div className="rounded-xl bg-slate-900/40 px-2.5 py-2">
            <p className="text-[10px] font-medium text-slate-500">Cash</p>
            <motion.p 
              key={cash}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="mt-0.5 text-sm font-semibold text-slate-200"
            >
              {formatUAH(cash, undefined, currency)}
            </motion.p>
          </div>
          <div className="rounded-xl bg-slate-900/40 px-2.5 py-2">
            <div className="flex items-center gap-1">
              <Repeat className="h-3 w-3 text-purple-500/60" />
              <p className="text-[10px] font-medium text-slate-500">Monthly</p>
            </div>
            <motion.p 
              key={monthlyTotal}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="mt-0.5 text-sm font-semibold text-purple-400/80"
            >
              {formatUAH(monthlyTotal, undefined, currency)}
            </motion.p>
          </div>
        </div>

        {/* Savings - separated section */}
        <motion.div 
          whileTap={{ scale: 0.98 }}
          className="rounded-xl border border-slate-800/30 bg-slate-900/30 px-3 py-2.5 mb-3 cursor-pointer transition-colors hover:bg-slate-900/50"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <PiggyBank className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-xs font-medium text-slate-500">Savings</span>
            </div>
            <motion.span 
              key={savings}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="text-sm font-semibold text-slate-300"
            >
              {formatUAH(savings, undefined, currency)}
            </motion.span>
          </div>
        </motion.div>

        {/* Remaining after monthly */}
        {monthlyTotal > 0 && (
          <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-3 py-2.5">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs font-medium text-slate-500">Available after monthly</span>
              <span className="text-sm font-semibold text-emerald-400">{formatUAH(remainingBalance, undefined, currency)}</span>
            </div>
            <p className="text-[10px] text-slate-600">Global balance minus recurring expenses</p>
          </div>
        )}
      </div>
    </div>
  )
}
