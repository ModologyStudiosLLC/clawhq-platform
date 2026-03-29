import { 
  Plus, 
  Settings, 
  Download, 
  Upload, 
  RefreshCw, 
  Shield,
  Bell,
  Zap
} from 'lucide-react'

const actions = [
  {
    icon: <Plus className="w-5 h-5" />,
    title: 'Add Agent',
    description: 'Connect a new OpenClaw agent',
    color: 'bg-blue-100 text-blue-600',
    action: () => console.log('Add Agent')
  },
  {
    icon: <Settings className="w-5 h-5" />,
    title: 'Configure',
    description: 'Update system settings',
    color: 'bg-gray-100 text-gray-600',
    action: () => console.log('Configure')
  },
  {
    icon: <Download className="w-5 h-5" />,
    title: 'Export Data',
    description: 'Download reports and logs',
    color: 'bg-green-100 text-green-600',
    action: () => console.log('Export Data')
  },
  {
    icon: <Upload className="w-5 h-5" />,
    title: 'Import Config',
    description: 'Load configuration files',
    color: 'bg-purple-100 text-purple-600',
    action: () => console.log('Import Config')
  },
  {
    icon: <RefreshCw className="w-5 h-5" />,
    title: 'Restart All',
    description: 'Restart all agents',
    color: 'bg-yellow-100 text-yellow-600',
    action: () => console.log('Restart All')
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: 'Security Scan',
    description: 'Run security audit',
    color: 'bg-red-100 text-red-600',
    action: () => console.log('Security Scan')
  },
  {
    icon: <Bell className="w-5 h-5" />,
    title: 'Test Alerts',
    description: 'Send test notification',
    color: 'bg-orange-100 text-orange-600',
    action: () => console.log('Test Alerts')
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: 'Optimize',
    description: 'Run cost optimization',
    color: 'bg-indigo-100 text-indigo-600',
    action: () => console.log('Optimize')
  }
]

export default function QuickActions() {
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.action}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left group"
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${action.color}`}>
                {action.icon}
              </div>
              <div>
                <h4 className="font-medium text-gray-900 group-hover:text-blue-600">
                  {action.title}
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  {action.description}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Recent Actions */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Actions</h4>
        <div className="space-y-2">
          {[
            { action: 'Agent "Paperclip" restarted', time: '2 minutes ago' },
            { action: 'Cost alert threshold updated', time: '15 minutes ago' },
            { action: 'Security scan completed', time: '1 hour ago' },
            { action: 'New agent "Nerve" connected', time: '3 hours ago' }
          ].map((item, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="text-gray-700">{item.action}</span>
              <span className="text-gray-500">{item.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* System Status */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-700">System Status</h4>
            <p className="text-xs text-gray-500">Last updated: Just now</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-sm text-green-600">Operational</span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-900">98%</div>
            <div className="text-xs text-gray-500">Uptime</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-900">24ms</div>
            <div className="text-xs text-gray-500">Response Time</div>
          </div>
        </div>
      </div>
    </div>
  )
}