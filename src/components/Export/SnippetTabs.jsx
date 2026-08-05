import { useState } from 'react'
import { FLUTTER_SNIPPET, REACT_NATIVE_SNIPPET, SWIFT_SNIPPET } from '../../lib/exportZip.js'
import { useApp } from '../../context/AppContext.jsx'

const TABS = [
  { id: 'flutter',  label: 'Flutter',        lang: 'Dart' },
  { id: 'rn',       label: 'React Native',   lang: 'JSX' },
  { id: 'swift',    label: 'iOS Swift',      lang: 'Swift' },
]

export default function SnippetTabs() {
  const { state } = useApp()
  const [activeTab, setActiveTab] = useState('flutter')
  const [copied, setCopied] = useState(false)

  const getSnippet = () => {
    switch (activeTab) {
      case 'flutter': return FLUTTER_SNIPPET(state.project)
      case 'rn':      return REACT_NATIVE_SNIPPET(state.project)
      case 'swift':   return SWIFT_SNIPPET(state.project)
      default:        return ''
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getSnippet())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const ta = document.createElement('textarea')
      ta.value = getSnippet()
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const currentTab = TABS.find((t) => t.id === activeTab)

  return (
    <div>
      <div className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            id={`snippet-tab-${tab.id}`}
            className={`tab-btn${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="code-block">
        <div className="code-block__header">
          <span className="code-block__lang">{currentTab?.lang}</span>
          <button
            id={`copy-snippet-${activeTab}`}
            className="btn btn-ghost"
            style={{ height: '24px', padding: '0 10px', fontSize: '11px' }}
            onClick={handleCopy}
          >
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
        </div>
        <pre><code>{getSnippet()}</code></pre>
      </div>
    </div>
  )
}
