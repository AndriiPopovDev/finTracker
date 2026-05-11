import { formatUAH, type CurrencyCode } from "@/lib/finance"

type Props = {
  card: number
  cash: number
  savings: number
  currency: CurrencyCode
  onCurrencyChange: (currency: CurrencyCode) => void
}

export function BalanceCard({ card, cash, savings, currency, onCurrencyChange }: Props) {
  const globalBalance = card + cash

  return (
    <div className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-950 via-slate-900 to-slate-950 p-5 shadow-2xl shadow-blue-950/40">
      {/* gradient glow - enlarged and softened for mobile */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-500/10 blur-[100px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-28 h-96 w-96 rounded-full bg-cyan-500/5 blur-[140px]"
      />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Global Balance
            </p>
            <h2 className="mt-2 text-4xl font-medium tracking-tight text-emerald-400">
              {formatUAH(globalBalance, undefined, currency)}
            </h2>
            <p className="mt-1 text-xs text-slate-400">Card + Cash</p>
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
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-all ${
                  currency === item.code
                    ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.22)]"
                    : "border-slate-700 bg-slate-900/70 text-slate-400 hover:text-slate-200"
                }`}
                aria-label={`Switch currency to ${item.code}`}
                aria-pressed={currency === item.code}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Card</p>
            <p className="mt-1 text-lg font-medium text-slate-200">{formatUAH(card, undefined, currency)}</p>
          </div>
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Cash</p>
            <p className="mt-1 text-lg font-medium text-slate-200">{formatUAH(cash, undefined, currency)}</p>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-blue-500/10 bg-blue-500/5 p-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Savings</span>
            <span className="text-slate-300">{formatUAH(savings, undefined, currency)}</span>
          </div>
          <p className="mt-0.5 text-[10px] text-slate-500">Not included in global balance</p>
        </div>
      </div>
    </div>
  )
}
