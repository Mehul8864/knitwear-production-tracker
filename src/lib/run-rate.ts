/**
 * StitchOps Run-Rate Engine
 *
 * Calculates production velocity, required daily output, projected completion
 * dates, and risk status for each active milestone.
 *
 * Assumptions (documented):
 * - Working days: Monday–Saturday (Sunday excluded)
 * - Actual daily output = total produced in last 7 calendar days / 7
 *   (uses calendar days, not working days, to give a conservative average)
 * - Status thresholds:
 *   GREEN:  actual >= required
 *   AMBER:  actual >= required * 0.7  (within 30% shortfall — recoverable)
 *   RED:    actual <  required * 0.7  (or projected completion misses deadline)
 */

export type RiskStatus = 'GREEN' | 'AMBER' | 'RED' | 'COMPLETE' | 'NOT_STARTED'

export interface RunRateInput {
  targetQuantity: number
  completedQuantity: number
  milestoneDeadline: Date
  /** Production update records sorted oldest→newest */
  recentUpdates: { date: Date; quantity: number }[]
  /** Reference date (defaults to today) */
  referenceDate?: Date
}

export interface RunRateResult {
  targetQuantity: number
  completedQuantity: number
  remainingQuantity: number
  workingDaysRemaining: number
  requiredDailyOutput: number
  actualDailyOutput: number
  projectedCompletionDate: Date | null
  projectedCompletionDays: number | null
  daysUntilDeadline: number
  status: RiskStatus
  shortfallPerDay: number
  onTrackByDate: boolean
  explanation: string
}

/** Returns true if a date is a working day (Mon–Sat) */
export function isWorkingDay(date: Date): boolean {
  const day = date.getDay()
  return day !== 0 // not Sunday
}

/** Count working days from today (exclusive) through deadline (inclusive) */
export function countWorkingDays(from: Date, to: Date): number {
  if (to <= from) return 0
  let count = 0
  const cursor = new Date(from)
  cursor.setDate(cursor.getDate() + 1)
  cursor.setHours(0, 0, 0, 0)
  const end = new Date(to)
  end.setHours(0, 0, 0, 0)
  while (cursor <= end) {
    if (isWorkingDay(cursor)) count++
    cursor.setDate(cursor.getDate() + 1)
  }
  return count
}

/** Add N working days to a date */
export function addWorkingDays(from: Date, days: number): Date {
  if (days <= 0) return new Date(from)
  const cursor = new Date(from)
  let added = 0
  while (added < days) {
    cursor.setDate(cursor.getDate() + 1)
    if (isWorkingDay(cursor)) added++
  }
  return cursor
}

export function calculateRunRate(input: RunRateInput): RunRateResult {
  const {
    targetQuantity,
    completedQuantity,
    milestoneDeadline,
    recentUpdates,
    referenceDate = new Date(),
  } = input

  const today = new Date(referenceDate)
  today.setHours(0, 0, 0, 0)
  const deadline = new Date(milestoneDeadline)
  deadline.setHours(0, 0, 0, 0)

  const remainingQuantity = Math.max(0, targetQuantity - completedQuantity)
  const daysUntilDeadline = Math.ceil(
    (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )

  // Already complete
  if (remainingQuantity === 0) {
    return {
      targetQuantity,
      completedQuantity,
      remainingQuantity: 0,
      workingDaysRemaining: 0,
      requiredDailyOutput: 0,
      actualDailyOutput: 0,
      projectedCompletionDate: today,
      projectedCompletionDays: 0,
      daysUntilDeadline,
      status: 'COMPLETE',
      shortfallPerDay: 0,
      onTrackByDate: true,
      explanation: 'This milestone is complete.',
    }
  }

  // Deadline passed
  if (daysUntilDeadline < 0) {
    return {
      targetQuantity,
      completedQuantity,
      remainingQuantity,
      workingDaysRemaining: 0,
      requiredDailyOutput: Infinity,
      actualDailyOutput: 0,
      projectedCompletionDate: null,
      projectedCompletionDays: null,
      daysUntilDeadline,
      status: 'RED',
      shortfallPerDay: Infinity,
      onTrackByDate: false,
      explanation: `Deadline has passed. ${remainingQuantity.toLocaleString()} pcs still remaining.`,
    }
  }

  const workingDaysRemaining = countWorkingDays(today, deadline)
  const requiredDailyOutput =
    workingDaysRemaining > 0 ? remainingQuantity / workingDaysRemaining : Infinity

  // Calculate actual daily output from last 7 calendar days
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const recentTotal = recentUpdates
    .filter((u) => {
      const d = new Date(u.date)
      d.setHours(0, 0, 0, 0)
      return d >= sevenDaysAgo && d <= today
    })
    .reduce((sum, u) => sum + u.quantity, 0)

  const actualDailyOutput = recentTotal / 7

  // Projected completion
  let projectedCompletionDate: Date | null = null
  let projectedCompletionDays: number | null = null
  if (actualDailyOutput > 0) {
    const daysNeeded = Math.ceil(remainingQuantity / actualDailyOutput)
    projectedCompletionDate = addWorkingDays(today, daysNeeded)
    projectedCompletionDays = daysNeeded
  }

  const shortfallPerDay = Math.max(0, requiredDailyOutput - actualDailyOutput)
  const onTrackByDate =
    projectedCompletionDate !== null &&
    projectedCompletionDate <= deadline

  // Status classification
  // GREEN:  on track (actual >= required)
  // AMBER:  below required but within 30% shortfall
  // RED:    > 30% shortfall OR projected completion misses deadline OR no output
  let status: RiskStatus
  if (workingDaysRemaining === 0 && remainingQuantity > 0) {
    status = 'RED'
  } else if (actualDailyOutput === 0 && remainingQuantity > 0) {
    status = 'RED'
  } else if (actualDailyOutput >= requiredDailyOutput) {
    status = 'GREEN'
  } else if (actualDailyOutput >= requiredDailyOutput * 0.7 && onTrackByDate) {
    status = 'AMBER'
  } else {
    status = 'RED'
  }

  // Explanation
  let explanation = ''
  if (status === 'GREEN') {
    explanation = `On track. Producing ${actualDailyOutput.toFixed(0)} pcs/day vs required ${requiredDailyOutput.toFixed(0)} pcs/day with ${workingDaysRemaining} working days remaining.`
  } else if (status === 'AMBER') {
    explanation = `At risk. Producing ${actualDailyOutput.toFixed(0)} pcs/day but requires ${requiredDailyOutput.toFixed(0)} pcs/day. Shortfall of ${shortfallPerDay.toFixed(0)} pcs/day — still recoverable with increased output.`
  } else if (actualDailyOutput === 0) {
    explanation = `No production reported in the last 7 days. Requires ${requiredDailyOutput.toFixed(0)} pcs/day to meet deadline.`
  } else {
    explanation = `Delayed. Producing ${actualDailyOutput.toFixed(0)} pcs/day but requires ${requiredDailyOutput.toFixed(0)} pcs/day. Projected to miss deadline by ${projectedCompletionDate ? Math.max(0, Math.ceil((projectedCompletionDate.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24))) : '?'} days.`
  }

  return {
    targetQuantity,
    completedQuantity,
    remainingQuantity,
    workingDaysRemaining,
    requiredDailyOutput,
    actualDailyOutput,
    projectedCompletionDate,
    projectedCompletionDays,
    daysUntilDeadline,
    status,
    shortfallPerDay,
    onTrackByDate,
    explanation,
  }
}

/**
 * Early-warning: returns true if milestone deadline is within 14 days
 * AND the run-rate status is not GREEN.
 */
export function isEarlyWarning(result: RunRateResult): boolean {
  return (
    result.daysUntilDeadline <= 14 &&
    result.daysUntilDeadline >= 0 &&
    result.status !== 'GREEN' &&
    result.status !== 'COMPLETE'
  )
}
