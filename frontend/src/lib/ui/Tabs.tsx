import { useId, useState, type ReactNode } from 'react'

interface Tab {
  label: string
  content: ReactNode
}

interface TabsProps {
  tabs: Tab[]
}

export function Tabs({ tabs }: TabsProps) {
  const baseId = useId()
  const [active, setActive] = useState(0)

  return (
    <div>
      <div role="tablist" aria-label="Dashboard sections" className="flex gap-1 border-b border-paper-200">
        {tabs.map((tab, index) => (
          <button
            key={tab.label}
            role="tab"
            id={`${baseId}-tab-${index}`}
            aria-controls={`${baseId}-panel-${index}`}
            aria-selected={active === index}
            onClick={() => setActive(index)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              active === index
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-paper-500 hover:text-paper-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel-${active}`}
        aria-labelledby={`${baseId}-tab-${active}`}
        className="pt-6"
      >
        {tabs[active].content}
      </div>
    </div>
  )
}
