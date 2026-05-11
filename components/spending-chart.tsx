"use client"

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts"
import { ChartPie as PieIcon } from "lucide-react"
import { CATEGORIES, COLORS, formatUAH, getCategoryEmoji, type CurrencyCode } from "@/lib/finance"

type ChartDatum = { name: string; value: number }

type Props = {
  data: ChartDatum[]
  totalExpense: number
  currency: CurrencyCode
  forecastValue: number
}

export function SpendingChart({ data, totalExpense, currency, forecastValue }: Props) {
  const hasData = data.length > 0
  const forecastClass = forecastValue >= 0 ? "text-emerald-500" : "text-rose-500"

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800/40 bg-slate-950 p-4">
      <div className="flex items-center gap-2">
        <PieIcon className="h-4 w-4 text-blue-400/80" aria-hidden="true" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Spending Breakdown
        </span>
      </div>

      {hasData ? (
        <>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-4 space-y-3">
            {data.map((d, i) => {
              const pct = totalExpense > 0 ? (d.value / totalExpense) * 100 : 0
              const catInfo = CATEGORIES.expense.find((c) => c.name === d.name)
              const barColor = catInfo?.color ?? COLORS[i % COLORS.length]
              return (
                <li key={d.name} className="space-y-1.5">
                  <div className="flex items-start justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-300">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: barColor }}
                        aria-hidden="true"
                      />
                      <span aria-hidden="true">{getCategoryEmoji("expense", d.name)}</span>
                      <span className="font-medium">{d.name}</span>
                    </span>
                    <div className="flex items-baseline gap-2 text-right flex-shrink-0">
                      <span className="font-semibold text-slate-200">{formatUAH(d.value, undefined, currency)}</span>
                      <span className="text-[11px] font-medium text-slate-500 w-8">{Math.round(pct)}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/50">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: barColor }}
                      aria-hidden="true"
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      ) : (
        <p className="mt-6 text-center text-sm text-slate-500">
          No expenses for this period yet.
        </p>
      )}
      <p className="mt-4 text-sm text-slate-500">
        Based on your current habits, you will have{" "}
        <span className={`align-baseline font-semibold ${forecastClass}`}>{formatUAH(forecastValue, undefined, currency)}</span>{" "}
        left by the end of the month.
      </p>
    </div>
  )
}
