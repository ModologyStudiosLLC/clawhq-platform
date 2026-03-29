'use client'

import { useState, useEffect } from 'react'
import { 
  Activity, 
  AlertTriangle, 
  BarChart3, 
  Cpu, 
  DollarSign, 
  Shield,
  Users,
  Zap
} from 'lucide-react'
import StatCard from './StatCard'
import AgentList from './AgentList'
import CostChart from './CostChart'
import AlertPanel from './AlertPanel'
import QuickActions from './QuickActions'

interface Agent {
  id: string
  name: string
  status: 'running' | 'idle' | 'stopped' | 'error'
  last_heartbeat: string
  cost_today: number
  uptime: string
}

interface CostMetric {
  date: string
  total_cost: number
  agent_costs: Record<string, number>
  model_breakdown: Record<string, number>
}

interface SystemAlert {
  id: string
  type: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  message: string
  timestamp: string
  resolved: boolean
}

export default function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [costs, setCosts] = useState<CostMetric | null>(null)
  const [alerts, setAlerts] = useState<SystemAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const [agentsRes, costsRes, alertsRes] = await Promise.all([
        fetch('http://localhost:8000/api/agents'),
        fetch('http://localhost:8000/api/costs'),
        fetch('http://localhost:8000/api/alerts')
      ])

      const agentsData = await agentsRes.json()
      const costsData = await costsRes.json()
      const alertsData = await alertsRes.json()

      setAgents(agentsData)
      setCosts(costsData)
      setAlerts(alertsData.filter((alert: SystemAlert) => !alert.resolved))
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalCost = costs?.total_cost || 0
  const activeAgents = agents.filter(a => a.status === 'running').length
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'error').length

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ClawHQ Platform</h1>
            <p className="text-gray-600 mt-1">The command center for your OpenClaw ecosystem</p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Zap className="w-4 h-4 inline mr-2" />
              Quick Start
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Cost Today"
          value={`$${totalCost.toFixed(2)}`}
          icon={<DollarSign className="w-6 h-6" />}
          trend="up"
          trendValue="12%"
          color="blue"
        />
        <StatCard
          title="Active Agents"
          value={activeAgents.toString()}
          icon={<Cpu className="w-6 h-6" />}
          trend="stable"
          trendValue="0%"
          color="green"
        />
        <StatCard
          title="System Health"
          value="98%"
          icon={<Activity className="w-6 h-6" />}
          trend="up"
          trendValue="2%"
          color="green"
        />
        <StatCard
          title="Active Alerts"
          value={criticalAlerts.toString()}
          icon={<AlertTriangle className="w-6 h-6" />}
          trend="down"
          trendValue="25%"
          color={criticalAlerts > 0 ? "red" : "gray"}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Agents & Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Agent Status</h2>
              <span className="text-sm text-gray-500">{agents.length} agents</span>
            </div>
            <AgentList agents={agents} loading={loading} />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Cost Intelligence</h2>
            <CostChart costs={costs} loading={loading} />
          </div>
        </div>

        {/* Right Column - Alerts & Quick Actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">System Alerts</h2>
              <Shield className="w-5 h-5 text-gray-400" />
            </div>
            <AlertPanel alerts={alerts} loading={loading} />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <QuickActions />
          </div>

          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-sm p-6 text-white">
            <BarChart3 className="w-8 h-8 mb-3" />
            <h3 className="text-lg font-semibold mb-2">Need Help?</h3>
            <p className="text-blue-100 mb-4">
              Check our documentation or join our community for support.
            </p>
            <div className="flex space-x-3">
              <button className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                Docs
              </button>
              <button className="px-4 py-2 border border-white/30 rounded-lg hover:bg-white/10 transition-colors">
                Community
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div>
            <span className="font-medium">ClawHQ Platform</span> • v1.0.0 • Last updated: Just now
          </div>
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
              All systems operational
            </span>
            <a href="#" className="hover:text-blue-600">Status</a>
            <a href="#" className="hover:text-blue-600">Support</a>
          </div>
        </div>
      </div>
    </div>
  )
}