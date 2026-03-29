import { AlertTriangle, CheckCircle, Info, XCircle, Bell } from 'lucide-react'

interface SystemAlert {
  id: string
  type: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  message: string
  timestamp: string
  resolved: boolean
}

interface AlertPanelProps {
  alerts: SystemAlert[]
  loading: boolean
}

const severityIcons = {
  info: <Info className="w-4 h-4 text-blue-500" />,
  warning: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
  error: <XCircle className="w-4 h-4 text-red-500" />,
  critical: <AlertTriangle className="w-4 h-4 text-red-600" />
}

const severityColors = {
  info: 'bg-blue-50 border-blue-200',
  warning: 'bg-yellow-50 border-yellow-200',
  error: 'bg-red-50 border-red-200',
  critical: 'bg-red-100 border-red-300'
}

const severityText = {
  info: 'text-blue-700',
  warning: 'text-yellow-700',
  error: 'text-red-700',
  critical: 'text-red-800'
}

export default function AlertPanel({ alerts, loading }: AlertPanelProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-6">
        <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
        <p className="text-gray-700 font-medium">All systems operational</p>
        <p className="text-sm text-gray-500 mt-1">No active alerts</p>
      </div>
    )
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return `${Math.floor(diffMins / 1440)}d ago`
  }

  const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'error')
  const warningAlerts = alerts.filter(a => a.severity === 'warning')
  const infoAlerts = alerts.filter(a => a.severity === 'info')

  return (
    <div>
      {/* Alert Summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-red-700">{criticalAlerts.length}</div>
          <div className="text-xs text-red-600">Critical</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-yellow-700">{warningAlerts.length}</div>
          <div className="text-xs text-yellow-600">Warnings</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-blue-700">{infoAlerts.length}</div>
          <div className="text-xs text-blue-600">Info</div>
        </div>
      </div>

      {/* Alert List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {alerts.map(alert => (
          <div 
            key={alert.id}
            className={`p-4 border rounded-lg ${severityColors[alert.severity]}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="mt-0.5">
                  {severityIcons[alert.severity]}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${severityText[alert.severity]}`}>
                      {alert.type.charAt(0).toUpperCase() + alert.type.slice(1)}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-white/50 rounded">
                      {alert.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{alert.message}</p>
                  <p className="text-xs text-gray-500 mt-2">{formatTime(alert.timestamp)}</p>
                </div>
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <Bell className="w-4 h-4" />
              </button>
            </div>
            <div className="flex space-x-2 mt-3">
              <button className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                Acknowledge
              </button>
              <button className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                Resolve
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Alert Actions */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between">
          <button className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            View All Alerts
          </button>
          <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Configure Alerts
          </button>
        </div>
      </div>
    </div>
  )
}