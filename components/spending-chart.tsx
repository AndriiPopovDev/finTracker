"use client"

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts"
import { ChartPie as PieIcon } from "lucide-react"
import { CATEGORIES, COLORS, formatUAH, getCategoryEmoji } from "@/lib/finance"

type ChartDatum = { name: string; value: number }

type Props = {
  data: ChartDatum[]
  totalExpense: number
}

export function SpendingChart({ data, totalExpense }: Props) {
  const hasData = data.length > 0

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/80 via-slate-900/40 to-slate-950/60 p-5 shadow-xl shadow-slate-950/40">
      <div className="flex items-center gap-2 text-slate-300">
        <PieIcon className="h-4 w-4 text-blue-400" aria-hidden="true" />
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
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
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-200">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: barColor }}
                        aria-hidden="true"
                      />
                      <span aria-hidden="true">{getCategoryEmoji("expense", d.name)}</span>
                      <span>{d.name}</span>
                    </span>
                    <span className="font-medium text-slate-300">
                      {formatUAH(d.value)}
                      <span className="ml-1.5 text-[11px] text-slate-500">{Math.round(pct)}%</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/80">
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
    </div>
  )
}
