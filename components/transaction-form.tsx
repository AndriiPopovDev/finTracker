"use client"

import { useEffect, useState } from "react"
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronDown,
  Plus,
  TrendingUp,
} from "lucide-react"
import { CATEGORIES, formatUAH } from "@/lib/finance"
import { CategorySelect } from "@/components/category-select"

type Props = {
  isIncome: boolean
  setIsIncome: (v: boolean) => void
  amount: string
  setAmount: (v: string) => void
  category: string
  setCategory: (v: string) => void
  onAdd: () => void
  plan: number
  setPlan: (v: number) => void
  totalActualIncome: number
}

export function PlanAndForm({
  isIncome,
  setIsIncome,
  amount,
  setAmount,
  category,
  setCategory,
  onAdd,
  plan,
  setPlan,
  totalActualIncome,
}: Props) {
  const categories = isIncome ? CATEGORIES.income : CATEGORIES.expense

  const [planEditing, setPlanEditing] = useState(false)
  const [planDraft, setPlanDraft] = useState(String(plan))

  useEffect(() => {
    setPlanDraft(String(plan))
  }, [plan])

  const commitPlan = () => {
    const parsed = Number.parseFloat(planDraft.replace(/,/g, ""))
    setPlan(Number.isFinite(parsed) && parsed >= 0 ? parsed : 0)
    setPlanEditing(false)
  }

  return (
    <div className="relative rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/80 via-slate-900/40 to-slate-950/60 p-5 space-y-5 shadow-xl shadow-slate-950/40">
      {/* Plan vs Actual */}
      <div>
        <div className="flex items-center gap-2 text-slate-300">
          <TrendingUp className="h-4 w-4 text-emerald-500" aria-hidden="true" />
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Income — Plan vs Actual
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Total Plan
            </p>
            {planEditing ? (
              <input
                autoFocus
                type="number"
                inputMode="decimal"
                value={planDraft}
                onChange={(e) => setPlanDraft(e.target.value)}
                onBlur={commitPlan}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitPlan()
                  if (e.key === "Escape") {
                    setPlanDraft(String(plan))
                    setPlanEditing(false)
                  }
                }}
                className="mt-1 w-full bg-transparent text-2xl font-extrabold text-white outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setPlanEditing(true)}
                className="mt-1 flex items-center gap-1 text-2xl font-extrabold text-white"
              >
                {formatUAH(plan)}
                <ChevronDown className="h-5 w-5 text-slate-500" aria-hidden="true" />
              </button>
            )}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Total Actual
            </p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-500">
              {formatUAH(totalActualIncome)}
            </p>
          </div>
        </div>
      </div>

      <div className="h-px bg-slate-800" aria-hidden="true" />

      {/* Add Transaction */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Add Transaction
        </p>

        {/* Type toggle */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setIsIncome(false)
              setCategory(CATEGORIES.expense[0].name)
            }}
            className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-colors ${
              !isIncome
                ? "border-rose-500/40 bg-rose-500/10 text-rose-400"
                : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200"
            }`}
          >
            <ArrowDownCircle className="h-4 w-4" aria-hidden="true" />
            Expense
          </button>
          <button
            type="button"
            onClick={() => {
              setIsIncome(true)
              setCategory(CATEGORIES.income[0].name)
            }}
            className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-colors ${
              isIncome
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200"
            }`}
          >
            <ArrowUpCircle className="h-4 w-4" aria-hidden="true" />
            Income
          </button>
        </div>

        {/* Amount + Category + Add */}
        <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
          <label className="relative">
            <span className="sr-only">Amount</span>
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">
              {isIncome ? (
                <ArrowUpCircle className="h-4 w-4 text-emerald-500/80" aria-hidden="true" />
              ) : (
                <ArrowDownCircle className="h-4 w-4 text-rose-500/80" aria-hidden="true" />
              )}
            </span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="Amount..."
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onAdd()
              }}
              className="h-12 w-full rounded-xl border border-slate-800 bg-slate-900/60 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
            />
          </label>

          <CategorySelect
            categories={categories}
            value={category}
            onChange={setCategory}
          />

          <button
            type="button"
            onClick={onAdd}
            aria-label="Add transaction"
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-lg shadow-rose-600/40 transition-transform hover:scale-105 hover:from-rose-400 hover:to-rose-600 active:scale-95"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
