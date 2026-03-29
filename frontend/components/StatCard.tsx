import { ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: string
  icon: ReactNode
  trend: 'up' | 'down' | 'stable'
  trendValue: string
  color: 'blue' | 'green' | 'red' | 'gray' | 'yellow'
}

const colorClasses = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  red: 'bg-red-50 text-red-600',
  gray: 'bg-gray-50 text-gray-600',
  yellow: 'bg-yellow-50 text-yellow-600'
}

const trendIcons = {
  up: '↗',
  down: '↘',
  stable: '→'
}

export default function StatCard({ 
  title, 
  value, 
  icon, 
  trend, 
  trendValue, 
  color 
}: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <div className={`text-sm font-medium px-2 py-1 rounded ${
          trend === 'up' ? 'bg-green-50 text-green-700' :
          trend === 'down' ? 'bg-red-50 text-red-700' :
          'bg-gray-50 text-gray-700'
        }`}>
          {trendIcons[trend]} {trendValue}
        </div>
      </div>
      <div>
        <p className="text-sm text-gray-500 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}