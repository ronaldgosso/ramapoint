import { useApp } from './context/AppContext.jsx'
import MapView from './components/Map/MapView.jsx'
import Toolbar from './components/UI/Toolbar.jsx'
import StatusBar from './components/UI/StatusBar.jsx'
import Sidebar from './components/Panels/Sidebar.jsx'
import PropertiesPanel from './components/Panels/PropertiesPanel.jsx'
import ProjectManager from './components/Panels/ProjectManager.jsx'
import ExportModal from './components/Export/ExportModal.jsx'

export default function App() {
  const { state } = useApp()

  const hasPanelOpen = state.selectedFeatureId !== null || state.selectedNodeId !== null || state.selectedEdgeId !== null
  const hasModalOpen = state.activeModal !== null

  return (
    <div className={`app-shell${hasPanelOpen ? ' panel-open' : ''}${hasModalOpen ? ' modal-open' : ''}`} id="app-shell">
      <Toolbar />
      <Sidebar />
      <MapView />
      {hasPanelOpen && <PropertiesPanel />}
      <StatusBar />

      {/* Modals */}
      {state.activeModal === 'project_manager' && <ProjectManager />}
      {state.activeModal === 'export' && <ExportModal />}
    </div>
  )
}
