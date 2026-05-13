/**
 * Reusable Transaction Row Component
 * Displays transaction details with consistent styling and interactions
 */

import { motion } from "framer-motion"
import { 
  CircleArrowDown as ArrowDownCircle, 
  CircleArrowUp as ArrowUpCircle, 
  ArrowLeftRight, 
  Repeat,
  type LucideIcon
} from "lucide-react"
import { formatUAH, type CurrencyCode, type Transaction } from "@/lib/finance"
import { triggerHaptic } from "@/lib/haptic"
import { ANIMATION } from "@/lib/theme"

type TransactionRowProps = {
  transaction: Transaction
  currency: CurrencyCode
  onEdit?: (tx: Transaction) => void
  onDelete?: (id: number) => void
  showActions?: boolean
  index?: number
}

export function TransactionRow({
  transaction,
  currency,
  onEdit,
  onDelete,
  showActions = true,
  index = 0,
}: TransactionRowProps) {
  const isTransfer = transaction.type === "transfer"
  const signedAmount = transaction.type === "income" 
    ? Math.abs(transaction.amount) 
    : transaction.type === "expense" 
      ? -Math.abs(transaction.amount) 
      : 0
  const isIncome = signedAmount > 0

  const IconComponent: LucideIcon = transaction.recurringId 
    ? Repeat
    : isTransfer 
      ? ArrowLeftRight
      : isIncome 
        ? ArrowUpCircle 
        : ArrowDownCircle

  const iconColor = isTransfer
    ? "border-blue-500/15 bg-blue-500/3 text-blue-400/80"
    : isIncome
      ? "border-emerald-500/15 bg-emerald-500/3 text-emerald-400/80"
      : "border-rose-500/15 bg-rose-500/3 text-rose-400/80"

  const amountColor = isTransfer
    ? "text-blue-400"
    : signedAmount > 0
      ? "text-emerald-400"
      : "text-rose-400"

  const formattedAmount = isTransfer
    ? formatUAH(Math.abs(transaction.amount), undefined, currency)
    : formatUAH(
        Math.abs(transaction.amount),
        signedAmount > 0 ? "plus" : "minus",
        currency
      )

  const handleClick = () => {
    triggerHaptic('light')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: parseFloat(ANIMATION.duration.base),
        delay: index * 0.05 
      }}
      whileTap={{ scale: 0.98 }}
      className="flex items-center gap-2.5 rounded-xl bg-slate-950/40 px-3 py-2.5 min-h-[56px] cursor-pointer transition-colors hover:bg-slate-900/60"
      onClick={handleClick}
    >
      {/* Icon */}
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${iconColor}`}
        aria-hidden="true"
      >
        <IconComponent className="h-5 w-5" />
      </span>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${amountColor}`}>
          {formattedAmount}
        </p>
        
        {transaction.name && (
          <p className="truncate text-xs font-medium text-slate-400">
            {transaction.name}
          </p>
        )}
        
        <p className="truncate text-xs text-slate-500">
          {isTransfer ? (
            <>
              {transaction.transferFrom} → {transaction.transferTo}
            </>
          ) : (
            transaction.category
          )}
          {transaction.date && ` • ${transaction.date}`}
        </p>
      </div>

      {/* Actions */}
      {showActions && (onEdit || onDelete) && (
        <div className="flex items-center gap-1">
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(transaction)
              }}
              aria-label={`Edit ${transaction.category} transaction`}
              className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800/40 hover:text-slate-200 min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
            </button>
          )}
          
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(transaction.id)
              }}
              aria-label={`Delete ${transaction.category} transaction`}
              className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800/40 hover:text-rose-400 min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}
