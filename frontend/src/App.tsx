import { useEffect, useState } from 'react'
import { getHealth } from './lib/api'

type ApiStatus = 'checking' | 'online' | 'offline'

function App() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking')

  useEffect(() => {
    getHealth()
      .then(() => setApiStatus('online'))
      .catch(() => setApiStatus('offline'))
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="rounded-xl bg-white shadow-sm border border-slate-200 p-8 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Budgeting App</h1>
        <p className="mt-2 text-slate-500">
          API status:{' '}
          <span
            className={
              apiStatus === 'online'
                ? 'text-emerald-600 font-medium'
                : apiStatus === 'offline'
                  ? 'text-red-600 font-medium'
                  : 'text-slate-400'
            }
          >
            {apiStatus}
          </span>
        </p>
      </div>
    </div>
  )
}

export default App
