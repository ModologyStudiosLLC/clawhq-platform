'use client'

import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface CostMetric {
  date: string
  total_cost: number
  agent_costs: Record<string, number>
  model_breakdown: Record<string, number>
}

interface CostChartProps {
  costs: CostMetric | null
  loading: boolean
}

export default function CostChart({ costs, loading }: CostChartProps) {
  if (loading) {
    return (
      <div className="h-64 animate-pulse">
        <div className="h-full bg-gray-200 rounded"></div>
      </div>
    )
  }

  if (!costs) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <DollarSign className="w-8 h-8 text-gray-300 mb-3" />
        <p>No cost data available</p>
      </div>
    )
  }

  // Prepare data for the chart
  const agentCostsData = Object.entries(costs.agent_costs).map(([name, cost]) => ({
    name,
    cost
  }))

  const modelBreakdownData = Object.entries(costs.model_breakdown).map(([model, cost]) => ({
    model,
    cost
  }))

  const totalCost = costs.total_cost
  const yesterdayCost = totalCost * 0.88 // Mock comparison
  const trend = totalCost > yesterdayCost ? 'up' : 'down'
  const percentageChange = Math.abs(((totalCost - yesterdayCost) / yesterdayCost) * 100).toFixed(1)

  return (
    <div>
      {/* Summary */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500">Total Cost Today</p>
          <div className="flex items-baseline space-x-2">
            <p className="text-3xl font-bold text-gray-900">${totalCost.toFixed(2)}</p>
            <div className={`flex items-center text-sm ${trend === 'up' ? 'text-red-600' : 'text-green-600'}`}>
              {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{percentageChange}% {trend === 'up' ? 'increase' : 'decrease'}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Budget Status</p>
          <div className="flex items-center">
            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden mr-3">
              <div 
                className="h-full bg-green-500 rounded-full"
                style={{ width: `${Math.min((totalCost / 50) * 100, 100)}%` }}
              ></div>
            </div>
            <span className="text-sm font-medium text-gray-700">
              ${totalCost.toFixed(2)} / $50.00
            </span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Agent Costs */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Cost by Agent</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agentCostsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`$${value}`, 'Cost']}
                  labelFormatter={(label) => `Agent: ${label}`}
                />
                <Bar dataKey="cost" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Model Breakdown */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Cost by Model</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modelBreakdownData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="model" angle={-45} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`$${value}`, 'Cost']}
                  labelFormatter={(label) => `Model: ${label}`}
                />
                <Bar dataKey="cost" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Cost Breakdown Table */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Detailed Breakdown</h4>
        <div className="overflow-hidden border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Percentage
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {agentCostsData.map((agent, index) => (
                <tr key={`agent-${index}`}>
                  <td className="px-4 py-3 text-sm text-gray-900">Agent</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{agent.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">${agent.cost.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {((agent.cost / totalCost) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
              {modelBreakdownData.map((model, index) => (
                <tr key={`model-${index}`}>
                  <td className="px-4 py-3 text-sm text-gray-900">Model</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{model.model}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">${model.cost.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {((model.cost / totalCost) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}