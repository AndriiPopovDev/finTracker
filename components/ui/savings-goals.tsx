"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Target, Calendar, TrendingUp, X, Edit2, Trash2 } from "lucide-react"
import type { CurrencyCode } from "@/lib/finance"
import { formatUAH } from "@/lib/finance"
import { ANIMATION, COLORS } from "@/lib/theme"
import { triggerHaptic } from "@/lib/haptic"

export type SavingsGoal = {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  icon: string
  color: string
  createdAt: string
  monthlyContribution?: number
}

type Props = {
  goals: SavingsGoal[]
  onUpdateGoals: (goals: SavingsGoal[]) => void
  currency: CurrencyCode
  className?: string
}

const GOAL_ICONS = ['🏖️', '🚗', '🏠', '💻', '📱', '🎓', '💎', '🎯']
const GOAL_COLORS = [COLORS.blue[500], COLORS.purple[500], COLORS.emerald[500], COLORS.amber[500], COLORS.rose[500], COLORS.cyan[500]]

export function SavingsGoals({ goals, onUpdateGoals, currency, className = '' }: Props) {
  const [showAdd, setShowAdd] = useState(false)
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null)

  const goalsWithETA = useMemo(() => {
    return goals.map(goal => {
      const remaining = goal.targetAmount - goal.currentAmount
      let etaDays: number | null = null
      
      if (goal.monthlyContribution && goal.monthlyContribution > 0) {
        const monthsNeeded = remaining / goal.monthlyContribution
        etaDays = Math.ceil(monthsNeeded * 30)
      }
      
      const progress = (goal.currentAmount / goal.targetAmount) * 100
      
      return {
        ...goal,
        remaining,
        etaDays,
        progress
      }
    })
  }, [goals])

  const addGoal = (goal: Omit<SavingsGoal, 'id' | 'createdAt'>) => {
    const newGoal: SavingsGoal = {
      ...goal,
      id: `goal_${Date.now()}`,
      createdAt: new Date().toISOString()
    }
    onUpdateGoals([...goals, newGoal])
    triggerHaptic('success')
  }

  const updateGoal = (id: string, patch: Partial<SavingsGoal>) => {
    onUpdateGoals(goals.map(g => g.id === id ? { ...g, ...patch } : g))
    triggerHaptic('light')
  }

  const deleteGoal = (id: string) => {
    onUpdateGoals(goals.filter(g => g.id !== id))
    triggerHaptic('medium')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={ANIMATION.spring.base}
      className={`space-y-3 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-300">Savings Goals</span>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setShowAdd(!showAdd)
            triggerHaptic('light')
          }}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        >
          <Plus className="h-4 w-4" />
        </motion.button>
      </div>

      {/* Add Goal Form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <AddGoalForm 
              onAdd={addGoal} 
              onCancel={() => setShowAdd(false)}
              currency={currency}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Goals List */}
      {goalsWithETA.length === 0 ? (
        <div className="rounded-xl border border-slate-800/40 bg-slate-950/40 py-6 text-center text-xs text-slate-500">
          No savings goals yet. Add one to start tracking!
        </div>
      ) : (
        <div className="space-y-2">
          {goalsWithETA.map((goal, idx) => (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileTap={{ scale: 0.98 }}
              className="rounded-xl border border-slate-800/30 bg-slate-950/50 p-3 cursor-pointer hover:bg-slate-900/50"
              onClick={() => setEditingGoal(goal)}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{goal.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-semibold text-slate-200">{goal.name}</h4>
                    <span className="text-xs font-medium" style={{ color: goal.color }}>
                      {goal.progress.toFixed(0)}%
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden mb-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${goal.progress}%` }}
                      transition={{ duration: 0.5, delay: idx * 0.1 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: goal.color }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>{formatUAH(goal.currentAmount, undefined, currency)} saved</span>
                    {goal.etaDays !== null && goal.etaDays > 0 && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>~{Math.ceil(goal.etaDays / 30)} months</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Edit Goal Modal */}
      <AnimatePresence>
        {editingGoal && (
          <EditGoalModal
            goal={editingGoal}
            onUpdate={(patch) => updateGoal(editingGoal.id, patch)}
            onDelete={() => deleteGoal(editingGoal.id)}
            onClose={() => setEditingGoal(null)}
            currency={currency}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function AddGoalForm({ 
  onAdd, 
  onCancel, 
  currency 
}: { 
  onAdd: (goal: Omit<SavingsGoal, 'id' | 'createdAt'>) => void
  onCancel: () => void
  currency: CurrencyCode
}) {
  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [currentAmount, setCurrentAmount] = useState('0')
  const [monthlyContribution, setMonthlyContribution] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('🎯')
  const [selectedColor, setSelectedColor] = useState(GOAL_COLORS[0])

  const handleSubmit = () => {
    if (!name || !targetAmount) return
    
    onAdd({
      name,
      targetAmount: Number(targetAmount),
      currentAmount: Number(currentAmount) || 0,
      icon: selectedIcon,
      color: selectedColor,
      monthlyContribution: monthlyContribution ? Number(monthlyContribution) : undefined
    })
  }

  return (
    <div className="rounded-xl border border-slate-800/40 bg-slate-950 p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300">New Goal</h3>
        <button onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-200">
          <X className="h-4 w-4" />
        </button>
      </div>

      <input
        type="text"
        placeholder="Goal name (e.g., Vacation)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-slate-200 placeholder:text-slate-600"
      />

      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          placeholder="Target amount"
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-slate-200 placeholder:text-slate-600"
        />
        <input
          type="number"
          placeholder="Current saved"
          value={currentAmount}
          onChange={(e) => setCurrentAmount(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-slate-200 placeholder:text-slate-600"
        />
      </div>

      <input
        type="number"
        placeholder="Monthly contribution (optional)"
        value={monthlyContribution}
        onChange={(e) => setMonthlyContribution(e.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-slate-200 placeholder:text-slate-600"
      />

      {/* Icon Picker */}
      <div className="flex gap-1.5">
        {GOAL_ICONS.map(icon => (
          <button
            key={icon}
            onClick={() => {
              setSelectedIcon(icon)
              triggerHaptic('light')
            }}
            className={`text-lg p-1 rounded ${selectedIcon === icon ? 'bg-slate-800' : ''}`}
          >
            {icon}
          </button>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!name || !targetAmount}
        className="w-full rounded-lg bg-blue-500 py-2 text-xs font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600"
      >
        Create Goal
      </button>
    </div>
  )
}

function EditGoalModal({
  goal,
  onUpdate,
  onDelete,
  onClose,
  currency
}: {
  goal: SavingsGoal
  onUpdate: (patch: Partial<SavingsGoal>) => void
  onDelete: () => void
  onClose: () => void
  currency: CurrencyCode
}) {
  const [amount, setAmount] = useState(String(goal.currentAmount))
  const [contribution, setContribution] = useState(goal.monthlyContribution ? String(goal.monthlyContribution) : '')

  const handleAddFunds = () => {
    const newAmount = goal.currentAmount + Number(amount)
    onUpdate({ currentAmount: newAmount })
    triggerHaptic('success')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-slate-950 border border-slate-800 p-4"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{goal.icon}</span>
            <h3 className="text-sm font-semibold text-slate-200">{goal.name}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl bg-slate-900/50 p-3">
            <p className="text-xs text-slate-400 mb-1">Current Savings</p>
            <p className="text-lg font-bold text-slate-200">{formatUAH(goal.currentAmount, undefined, currency)}</p>
            <p className="text-[10px] text-slate-500 mt-1">
              Target: {formatUAH(goal.targetAmount, undefined, currency)}
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Add amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-slate-200 placeholder:text-slate-600"
            />
            <button
              onClick={handleAddFunds}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-600"
            >
              Add
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Monthly contribution"
              value={contribution}
              onChange={(e) => {
                setContribution(e.target.value)
                onUpdate({ monthlyContribution: e.target.value ? Number(e.target.value) : undefined })
              }}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-slate-200 placeholder:text-slate-600"
            />
            <button
              onClick={() => {
                setContribution('')
                onUpdate({ monthlyContribution: undefined })
              }}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 hover:text-slate-200"
            >
              Clear
            </button>
          </div>

          <button
            onClick={() => {
              onDelete()
              onClose()
            }}
            className="w-full rounded-lg border border-rose-500/30 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10"
          >
            Delete Goal
          </button>
        </div>
      </motion.div>
    </div>
  )
}
