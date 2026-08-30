import { useEffect } from 'react'
import { useApp } from './context/AppContext.jsx'
import MapView from './components/Map/MapView.jsx'
import Toolbar from './components/UI/Toolbar.jsx'
import StatusBar from './components/UI/StatusBar.jsx'
import Sidebar from './components/Panels/Sidebar.jsx'
import PropertiesPanel from './components/Panels/PropertiesPanel.jsx'
import ProjectManager from './components/Panels/ProjectManager.jsx'
import ExportModal from './components/Export/ExportModal.jsx'
import Toast from './components/UI/Toast.jsx'
import ErrorBoundary from './components/UI/ErrorBoundary.jsx'

export default function App() {
  const { state, dispatch, saveCurrentProject, ACTIONS, canUndo, canRedo, undo, redo } = useApp()

  const hasPanelOpen = state.selectedFeatureId !== null || state.selectedNodeId !== null || state.selectedEdgeId !== null
  const hasModalOpen = state.activeModal !== null

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore shortcuts when user is typing in form inputs/textarea
      const activeEl = document.activeElement
      if (activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.tagName === 'SELECT' ||
        activeEl.isContentEditable
      )) {
        return
      }

      // Use userAgentData (modern) with fallback to userAgent string — navigator.platform is deprecated
      const platform = navigator.userAgentData?.platform ?? navigator.userAgent
      const isMac = /Mac|iPhone|iPad/i.test(platform)
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey

      // Ctrl + Z (Undo)
      if (ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (canUndo) undo()
      }
      // Ctrl + Y (Redo)
      else if (ctrlKey && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        if (canRedo) redo()
      }
      // Ctrl + S (Save)
      else if (ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        dispatch({ type: ACTIONS.SET_SAVE_STATE, saveState: 'saving' })
        saveCurrentProject()
          .then(() => {
            dispatch({ type: ACTIONS.SET_SAVE_STATE, saveState: 'saved' })
            dispatch({ type: ACTIONS.SHOW_TOAST, message: 'Project saved successfully!', toastType: 'success' })
          })
          .catch((err) => {
            console.error('Save failed', err)
            dispatch({ type: ACTIONS.SET_SAVE_STATE, saveState: 'error' })
            dispatch({ type: ACTIONS.SHOW_TOAST, message: 'Save failed: ' + err.message, toastType: 'error' })
          })
      }
      // Esc (Exit drawing mode / clear route)
      else if (e.key === 'Escape') {
        e.preventDefault()
        dispatch({ type: ACTIONS.SET_DRAWING_MODE, mode: null })
        dispatch({ type: ACTIONS.CLEAR_ROUTE })
      }
      // Delete (Delete selected feature / node / edge)
      else if (e.key === 'Delete') {
        e.preventDefault()
        if (state.selectedFeatureId) {
          dispatch({ type: ACTIONS.REMOVE_FEATURE, id: state.selectedFeatureId })
        } else if (state.selectedNodeId) {
          dispatch({ type: ACTIONS.REMOVE_ROUTING_NODE, id: state.selectedNodeId })
        } else if (state.selectedEdgeId) {
          dispatch({ type: ACTIONS.REMOVE_ROUTING_EDGE, id: state.selectedEdgeId })
        }
      }
      // B (Draw Building)
      else if (e.key.toLowerCase() === 'b') {
        e.preventDefault()
        dispatch({ type: ACTIONS.SET_DRAWING_MODE, mode: state.drawingMode === 'building' ? null : 'building' })
      }
      // P (Draw Path)
      else if (e.key.toLowerCase() === 'p') {
        e.preventDefault()
        dispatch({ type: ACTIONS.SET_DRAWING_MODE, mode: state.drawingMode === 'path' ? null : 'path' })
      }
      // M (Place POI / Marker)
      else if (e.key.toLowerCase() === 'm') {
        e.preventDefault()
        dispatch({ type: ACTIONS.SET_DRAWING_MODE, mode: state.drawingMode === 'poi' ? null : 'poi' })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state, dispatch, ACTIONS, canUndo, canRedo, undo, redo, saveCurrentProject])

  return (
    <div className={`app-shell${hasPanelOpen ? ' panel-open' : ''}${hasModalOpen ? ' modal-open' : ''}`} id="app-shell">
      <Toolbar />
      <Sidebar />
      <ErrorBoundary>
        <MapView />
      </ErrorBoundary>
      {hasPanelOpen && (
        <ErrorBoundary>
          <PropertiesPanel />
        </ErrorBoundary>
      )}
      <StatusBar />
      <Toast />

      {/* Modals */}
      {state.activeModal === 'project_manager' && <ProjectManager />}
      {state.activeModal === 'export' && <ExportModal />}
    </div>
  )
}
