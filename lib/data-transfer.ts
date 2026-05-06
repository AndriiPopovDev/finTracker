import type { Transaction } from "@/lib/finance"

export type FinanceBackup = {
  version: 1
  exportedAt: string
  data: {
    [monthKey: string]: Transaction[]
  }
  plans: {
    [planKey: string]: number
  }
}

export function exportAllData(): void {
  if (typeof window === "undefined") return

  const data: FinanceBackup["data"] = {}
  const plans: FinanceBackup["plans"] = {}

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i)
    if (!key) continue

    if (key.startsWith("finance_")) {
      try {
        const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]")
        if (Array.isArray(parsed)) data[key] = parsed
      } catch {
        // skip malformed entries
      }
    } else if (key.startsWith("plan_")) {
      const raw = window.localStorage.getItem(key)
      const value = raw !== null ? Number(raw) : NaN
      if (Number.isFinite(value)) plans[key] = value
    }
  }

  const backup: FinanceBackup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
    plans,
  }

  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "finance-backup.json"
  a.click()
  URL.revokeObjectURL(url)
}

export function importDataFromFile(
  file: File,
  onSuccess: () => void,
  onError: (message: string) => void
): void {
  const reader = new FileReader()

  reader.onload = (e) => {
    try {
      const raw = e.target?.result
      if (typeof raw !== "string") throw new Error("Could not read file.")

      const parsed: unknown = JSON.parse(raw)

      if (
        typeof parsed !== "object" ||
        parsed === null ||
        (parsed as FinanceBackup).version !== 1 ||
        typeof (parsed as FinanceBackup).data !== "object" ||
        typeof (parsed as FinanceBackup).plans !== "object"
      ) {
        throw new Error("Invalid backup format. Expected a version 1 finance-backup.json file.")
      }

      const backup = parsed as FinanceBackup

      // Validate that all data entries are arrays of transaction-like objects
      for (const [key, txs] of Object.entries(backup.data)) {
        if (!key.startsWith("finance_") || !Array.isArray(txs)) {
          throw new Error(`Invalid data entry: "${key}"`)
        }
      }

      // Clear existing finance/plan keys then write imported data
      const keysToRemove: string[] = []
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i)
        if (k && (k.startsWith("finance_") || k.startsWith("plan_"))) {
          keysToRemove.push(k)
        }
      }
      keysToRemove.forEach((k) => window.localStorage.removeItem(k))

      for (const [key, txs] of Object.entries(backup.data)) {
        window.localStorage.setItem(key, JSON.stringify(txs))
      }
      for (const [key, value] of Object.entries(backup.plans)) {
        window.localStorage.setItem(key, String(value))
      }

      onSuccess()
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to import file.")
    }
  }

  reader.onerror = () => onError("Failed to read the file.")
  reader.readAsText(file)
}
