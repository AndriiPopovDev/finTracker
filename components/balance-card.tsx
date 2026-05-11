import { Repeat } from "lucide-react"
import { formatUAH, type CurrencyCode } from "@/lib/finance"

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
      {/* Subtle ambient glow - reduced intensity */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-blue-500/3 blur-[40px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-16 -left-12 h-24 w-24 rounded-full bg-cyan-500/2 blur-[35px]"
      />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Global Balance
            </p>
            <h2 className="mt-1.5 text-3xl font-semibold tracking-tight text-white">
              {formatUAH(globalBalance, undefined, currency)}
            </h2>
            <p className="mt-1 text-[11px] font-medium text-slate-500">Card + Cash</p>
          </div>

          <div className="flex items-center gap-2">
            {([
              { code: "UAH", label: "₴" },
              { code: "USD", label: "$" },
              { code: "EUR", label: "€" },
            ] as const).map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => onCurrencyChange(item.code)}
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-all active:scale-95 ${
                  currency === item.code
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                    : "border-slate-800/50 bg-slate-900/50 text-slate-500 hover:text-slate-300"
                }`}
                aria-label={`Switch currency to ${item.code}`}
                aria-pressed={currency === item.code}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-slate-800/40 bg-slate-900/40 px-2.5 py-2">
            <p className="text-[10px] font-semibold text-slate-500">Card</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-200">{formatUAH(card, undefined, currency)}</p>
          </div>
          <div className="rounded-lg border border-slate-800/40 bg-slate-900/40 px-2.5 py-2">
            <p className="text-[10px] font-semibold text-slate-500">Cash</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-200">{formatUAH(cash, undefined, currency)}</p>
          </div>
          <div className="rounded-lg border border-slate-800/40 bg-slate-900/40 px-2.5 py-2">
            <div className="flex items-center gap-1">
              <Repeat className="h-3 w-3 text-purple-500/60" />
              <p className="text-[10px] font-semibold text-slate-500">Monthly</p>
            </div>
            <p className="mt-0.5 text-sm font-semibold text-purple-400/80">{formatUAH(monthlyTotal, undefined, currency)}</p>
          </div>
        </div>

        <div className="mt-2.5 rounded-lg border border-slate-800/30 bg-slate-900/20 px-3 py-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-500">Savings</span>
            <span className="font-semibold text-slate-300">{formatUAH(savings, undefined, currency)}</span>
          </div>
          <p className="mt-0.5 text-[10px] text-slate-600">Excluded from global balance</p>
        </div>

        {monthlyTotal > 0 && (
          <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-500">Available</span>
              <span className="font-semibold text-emerald-400">{formatUAH(remainingBalance, undefined, currency)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
