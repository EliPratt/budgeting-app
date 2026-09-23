import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { queryKeys } from '../../lib/queryKeys'
import {
  getIncomeVsExpenseTrend,
  getNetWorthTrend,
  getSpendingByCategory,
  type CategorySpending,
  type MonthlyTrendPoint,
  type NetWorthPoint,
} from './api'
import { Card } from '../../lib/ui'

const COLORS = ['#175d51', '#3d9482', '#a4aa93', '#c88a4f', '#7c8370', '#a8452c', '#cbcfbf']
const POSITIVE = '#2f7d54'
const NEGATIVE = '#a8452c'

interface ChartSpendingPoint {
  envelope_id: number | null
  envelope_name: string
  total: number
}

interface ChartTrendPoint {
  month: string
  income: number
  expense: number
}

interface ChartNetWorthPoint {
  month: string
  net_worth: number
}

function toChartSpending(points: CategorySpending[]): ChartSpendingPoint[] {
  return points.map((point) => ({ ...point, total: Number(point.total) }))
}

function toChartTrend(points: MonthlyTrendPoint[]): ChartTrendPoint[] {
  return points.map((point) => ({
    month: point.month,
    income: Number(point.income),
    expense: Number(point.expense),
  }))
}

function toChartNetWorth(points: NetWorthPoint[]): ChartNetWorthPoint[] {
  return points.map((point) => ({ month: point.month, net_worth: Number(point.net_worth) }))
}

export function ReportsPanel() {
  const { data: spendingRaw = [] } = useQuery({
    queryKey: queryKeys.reportsSpending,
    queryFn: () => getSpendingByCategory(),
  })
  const { data: trendRaw = [] } = useQuery({
    queryKey: queryKeys.reportsTrend,
    queryFn: () => getIncomeVsExpenseTrend(6),
  })
  const { data: netWorthRaw = [] } = useQuery({
    queryKey: queryKeys.reportsNetWorth,
    queryFn: () => getNetWorthTrend(6),
  })

  const spending = toChartSpending(spendingRaw)
  const trend = toChartTrend(trendRaw)
  const netWorth = toChartNetWorth(netWorthRaw)

  return (
    <Card title="Reports">
      <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-paper-700">Spending by category (this month)</h3>
        {spending.length === 0 ? (
          <p className="text-sm text-paper-400">No spending yet this month.</p>
        ) : (
          <div className="h-64" data-testid="spending-by-category-chart">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={spending}
                  dataKey="total"
                  nameKey="envelope_name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) => entry.name}
                >
                  {spending.map((entry, index) => (
                    <Cell key={entry.envelope_id ?? 'uncategorized'} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-paper-700">Income vs. expense</h3>
        <div className="h-64" data-testid="income-vs-expense-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e4d9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="income" fill={POSITIVE} name="Income" />
              <Bar dataKey="expense" fill={NEGATIVE} name="Expense" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-paper-700">Net worth</h3>
        <div className="h-64" data-testid="net-worth-chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={netWorth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e4d9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="net_worth" stroke="#175d51" name="Net worth" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      </div>
    </Card>
  )
}
