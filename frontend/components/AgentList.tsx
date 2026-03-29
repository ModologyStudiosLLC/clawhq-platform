import { Cpu, Activity, Clock, DollarSign } from 'lucide-react'

interface Agent {
  id: string
  name: string
  status: 'running' | 'idle' | 'stopped' | 'error'
  last_heartbeat: string
  cost_today: number
  uptime: string
}

interface AgentListProps {
  agents: Agent[]
  loading: boolean
}

const statusColors = {
  running: 'bg-green-100 text-green-800',
  idle: 'bg-yellow-100 text-yellow-800',
  stopped: 'bg-gray-100 text-gray-800',
  error: 'bg-red-100 text-red-800'
}

const statusIcons = {
  running: '🟢',
  idle: '🟡',
  stopped: '⚫',
  error: '🔴'
}

export default function AgentList({ agents, loading }: AgentListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    )
  }

  if (agents.length === 0) {
    return (
      <div className="text-center py-8">
        <Cpu className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No agents found</p>
        <p className="text-sm text-gray-400 mt-1">Add your first agent to get started</p>
      </div>
    )
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-3">
      {agents.map(agent => (
        <div 
          key={agent.id}
          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Cpu className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-medium text-gray-900">{agent.name}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${statusColors[agent.status]}`}>
                  {statusIcons[agent.status]} {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                </span>
              </div>
              <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                <span className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatTime(agent.last_heartbeat)}
                </span>
                <span className="flex items-center">
                  <Activity className="w-3 h-3 mr-1" />
                  {agent.uptime}
                </span>
                <span className="flex items-center">
                  <DollarSign className="w-3 h-3 mr-1" />
                  ${agent.cost_today.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors">
              Restart
            </button>
            <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
              Configure
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}