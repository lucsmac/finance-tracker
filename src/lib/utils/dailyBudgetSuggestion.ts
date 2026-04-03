export interface DailyBudgetCalculatorValues {
  food: number
  transport: number
  leisure: number
  personalCare: number
  smallExtras: number
  monthlyExtras: number
}

const WEEKS_PER_MONTH = 52 / 12
const DAYS_PER_MONTH = 30

const roundCurrency = (value: number) => Math.round(value * 100) / 100

export const calculateDailyBudgetSuggestion = (values: DailyBudgetCalculatorValues) => {
  const weeklyTotal =
    values.food +
    values.transport +
    values.leisure +
    values.personalCare +
    values.smallExtras

  const monthlyFromWeekly = weeklyTotal * WEEKS_PER_MONTH
  const monthlyEstimate = monthlyFromWeekly + values.monthlyExtras
  const dailySuggestion = monthlyEstimate / DAYS_PER_MONTH

  return {
    weeklyTotal: roundCurrency(weeklyTotal),
    monthlyFromWeekly: roundCurrency(monthlyFromWeekly),
    monthlyEstimate: roundCurrency(monthlyEstimate),
    dailySuggestion: roundCurrency(dailySuggestion),
  }
}
