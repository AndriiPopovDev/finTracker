import { motion } from "framer-motion"
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react"
import { formatUAH, type CurrencyCode } from "@/lib/finance"

type Props = {
  totalIncome: number
  totalExpense: number
  currency: CurrencyCode
}

export function SummaryCards({ totalIncome, totalExpense, currency }: Props) {
  const incomeValue = totalIncome
  const expenseValue = -Math.abs(totalExpense)

  return (
    <div className="grid grid-cols-2 gap-2">
      <motion.div 
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="relative overflow-hidden rounded-xl bg-slate-950 p-3 cursor-pointer transition-colors hover:bg-slate-900/80"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 h-20 w-20 rounded-full bg-emerald-500/3 blur-[30px]"
        />
        <div className="relative flex items-center gap-1.5">
          <ArrowUpCircle className="h-3.5 w-3.5 text-emerald-500/70" aria-hidden="true" />
          <span className="text-[10px] font-medium text-slate-500">
            Income
          </span>
        </div>
        <motion.p 
          key={totalIncome}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="relative mt-1.5 text-base font-semibold text-emerald-400"
        >
          {formatUAH(Math.abs(totalIncome), "plus", currency)}
        </motion.p>
      </motion.div>

      <motion.div 
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="relative overflow-hidden rounded-xl bg-slate-950 p-3 cursor-pointer transition-colors hover:bg-slate-900/80"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 h-20 w-20 rounded-full bg-rose-500/3 blur-[30px]"
        />
        <div className="relative flex items-center gap-1.5">
          <ArrowDownCircle className="h-3.5 w-3.5 text-rose-500/70" aria-hidden="true" />
          <span className="text-[10px] font-medium text-slate-500">
            Expenses
          </span>
        </div>
        <motion.p 
          key={totalExpense}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="relative mt-1.5 text-base font-semibold text-rose-400"
        >
          {formatUAH(Math.abs(totalExpense), "minus", currency)}
        </motion.p>
      </motion.div>
    </div>
  )
}
