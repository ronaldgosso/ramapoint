/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from '../lib/uuid.js'
import { historyReducer, initialHistoryState, HISTORY_ACTIONS } from '../hooks/useUndoRedo.js'
import { getAllProjects, saveProject } from '../hooks/useProjectStore.js'

// ── Action Types ─────────────────────────────────────────
export const ACTIONS = {
  // Project
  SET_PROJECT:          'SET_PROJECT',
  SET_PROJECT_NAME:     'SET_PROJECT_NAME',
  NEW_PROJECT:          'NEW_PROJECT',
  // Features
  ADD_FEATURE:          'ADD_FEATURE',
  UPDATE_FEATURE:       'UPDATE_FEATURE',
  REMOVE_FEATURE:       'REMOVE_FEATURE',
  SET_FEATURES:         'SET_FEATURES',
  // Selection
  SELECT_FEATURE:       'SELECT_FEATURE',
  DESELECT:             'DESELECT',
  // Drawing
  SET_DRAWING_MODE:     'SET_DRAWING_MODE',
  // Tile
  SET_TILE_LAYER:       'SET_TILE_LAYER',
  // Routing
  ADD_ROUTING_NODE:     'ADD_ROUTING_NODE',
  UPDATE_ROUTING_NODE:  'UPDATE_ROUTING_NODE',
  REMOVE_ROUTING_NODE:  'REMOVE_ROUTING_NODE',
  ADD_ROUTING_EDGE:     'ADD_ROUTING_EDGE',
  REMOVE_ROUTING_EDGE:  'REMOVE_ROUTING_EDGE',
  // Projects list
  SET_PROJECTS:         'SET_PROJECTS',
  // UI
  SET_ONLINE_STATUS:    'SET_ONLINE_STATUS',
  SET_CACHED_TILES:     'SET_CACHED_TILES',
  // Modal
  OPEN_MODAL:           'OPEN_MODAL',
  CLOSE_MODAL:          'CLOSE_MODAL',
  // History
  UNDO:                 HISTORY_ACTIONS.UNDO,
  REDO:                 HISTORY_ACTIONS.REDO,
  PUSH_HISTORY:         HISTORY_ACTIONS.PUSH,
}

// ── Default new project ──────────────────────────────────
function newProjectTemplate(name = 'Untitled Campus') {
  return {
    id: uuidv4(),
    name,
    center: [40.7128, -74.006],
    zoom: 16,
    features: [],
    routingNodes: [],
    routingEdges: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// ── Initial State ────────────────────────────────────────
const initialState = {
  project: newProjectTemplate(),
  projects: [],
  selectedFeatureId: null,
  selectedNodeId: null,
  activeTileLayer: localStorage.getItem('ramapoint_tile') || localStorage.getItem('campass_tile') || 'carto',
  drawingMode: null,
  onlineStatus: navigator.onLine,
  cachedTileCount: 0,
  activeModal: null,   // 'export' | 'project_manager' | 'new_project'
  ...initialHistoryState,
}

// ── Reducer ──────────────────────────────────────────────
function appReducer(state, action) {
  switch (action.type) {
    // ── Project ───────────────────────────────────────────
    case ACTIONS.SET_PROJECT:
      return { ...state, project: action.project, selectedFeatureId: null, selectedNodeId: null }

    case ACTIONS.SET_PROJECT_NAME:
      return { ...state, project: { ...state.project, name: action.name } }

    case ACTIONS.NEW_PROJECT: {
      const p = newProjectTemplate(action.name)
      return { ...state, project: p, selectedFeatureId: null, selectedNodeId: null, drawingMode: null }
    }

    // ── Features ──────────────────────────────────────────
    case ACTIONS.ADD_FEATURE: {
      const feature = { id: uuidv4(), ...action.feature }
      const features = [...state.project.features, feature]
      return {
        ...state,
        project: { ...state.project, features },
        selectedFeatureId: feature.id,
      }
    }

    case ACTIONS.UPDATE_FEATURE: {
      const features = state.project.features.map((f) =>
        f.id === action.id ? { ...f, ...action.updates } : f
      )
      return { ...state, project: { ...state.project, features } }
    }

    case ACTIONS.REMOVE_FEATURE: {
      const features = state.project.features.filter((f) => f.id !== action.id)
      return {
        ...state,
        project: { ...state.project, features },
        selectedFeatureId: state.selectedFeatureId === action.id ? null : state.selectedFeatureId,
      }
    }

    case ACTIONS.SET_FEATURES:
      return { ...state, project: { ...state.project, features: action.features } }

    // ── Selection ─────────────────────────────────────────
    case ACTIONS.SELECT_FEATURE:
      return { ...state, selectedFeatureId: action.id, selectedNodeId: null }

    case ACTIONS.DESELECT:
      return { ...state, selectedFeatureId: null, selectedNodeId: null }

    // ── Drawing ───────────────────────────────────────────
    case ACTIONS.SET_DRAWING_MODE:
      return { ...state, drawingMode: action.mode }

    // ── Tile ──────────────────────────────────────────────
    case ACTIONS.SET_TILE_LAYER:
      localStorage.setItem('ramapoint_tile', action.layerId)
      return { ...state, activeTileLayer: action.layerId }

    // ── Routing ───────────────────────────────────────────
    case ACTIONS.ADD_ROUTING_NODE: {
      const node = { id: uuidv4(), ...action.node }
      const routingNodes = [...state.project.routingNodes, node]
      return { ...state, project: { ...state.project, routingNodes }, selectedNodeId: node.id }
    }

    case ACTIONS.UPDATE_ROUTING_NODE: {
      const routingNodes = state.project.routingNodes.map((n) =>
        n.id === action.id ? { ...n, ...action.updates } : n
      )
      return { ...state, project: { ...state.project, routingNodes } }
    }

    case ACTIONS.REMOVE_ROUTING_NODE: {
      const routingNodes = state.project.routingNodes.filter((n) => n.id !== action.id)
      const routingEdges = state.project.routingEdges.filter(
        (e) => e.from !== action.id && e.to !== action.id
      )
      return {
        ...state,
        project: { ...state.project, routingNodes, routingEdges },
        selectedNodeId: state.selectedNodeId === action.id ? null : state.selectedNodeId,
      }
    }

    case ACTIONS.ADD_ROUTING_EDGE: {
      const edge = { id: uuidv4(), ...action.edge }
      const routingEdges = [...state.project.routingEdges, edge]
      return { ...state, project: { ...state.project, routingEdges } }
    }

    case ACTIONS.REMOVE_ROUTING_EDGE: {
      const routingEdges = state.project.routingEdges.filter((e) => e.id !== action.id)
      return { ...state, project: { ...state.project, routingEdges } }
    }

    // ── Projects list ─────────────────────────────────────
    case ACTIONS.SET_PROJECTS:
      return { ...state, projects: action.projects }

    // ── UI ────────────────────────────────────────────────
    case ACTIONS.SET_ONLINE_STATUS:
      return { ...state, onlineStatus: action.isOnline }

    case ACTIONS.SET_CACHED_TILES:
      return { ...state, cachedTileCount: action.count }

    case ACTIONS.OPEN_MODAL:
      return { ...state, activeModal: action.modal }

    case ACTIONS.CLOSE_MODAL:
      return { ...state, activeModal: null }

    // ── History ───────────────────────────────────────────
    case HISTORY_ACTIONS.PUSH: {
      const histResult = historyReducer(
        { history: state.history, historyIndex: state.historyIndex },
        action
      )
      return { ...state, ...histResult }
    }

    case HISTORY_ACTIONS.UNDO: {
      const histResult = historyReducer(
        { history: state.history, historyIndex: state.historyIndex },
        action
      )
      // Restore project from history snapshot
      const snapshot = histResult.historyIndex >= 0
        ? state.history[histResult.historyIndex]
        : null
      return {
        ...state,
        ...histResult,
        project: snapshot ? snapshot.project : state.project,
      }
    }

    case HISTORY_ACTIONS.REDO: {
      const histResult = historyReducer(
        { history: state.history, historyIndex: state.historyIndex },
        action
      )
      const snapshot = histResult.historyIndex >= 0
        ? state.history[histResult.historyIndex]
        : null
      return {
        ...state,
        ...histResult,
        project: snapshot ? snapshot.project : state.project,
      }
    }

    default:
      return state
  }
}

// ── Context ──────────────────────────────────────────────
const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  // Load projects from IndexedDB on mount
  useEffect(() => {
    getAllProjects()
      .then((projects) => dispatch({ type: ACTIONS.SET_PROJECTS, projects: projects.reverse() }))
      .catch(() => {})
  }, [])

  // Online/offline event listeners
  useEffect(() => {
    const onOnline = () => dispatch({ type: ACTIONS.SET_ONLINE_STATUS, isOnline: true })
    const onOffline = () => dispatch({ type: ACTIONS.SET_ONLINE_STATUS, isOnline: false })
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  // Helper: save current project to IndexedDB + history
  const saveCurrentProject = useCallback(async () => {
    const project = { ...state.project, updatedAt: new Date().toISOString() }
    await saveProject(project)
    const projects = await getAllProjects()
    dispatch({ type: ACTIONS.SET_PROJECTS, projects: projects.reverse() })
    return project
  }, [state.project])

  // Push history snapshot (call after any feature mutation)
  const pushSnapshot = useCallback(() => {
    dispatch({
      type: HISTORY_ACTIONS.PUSH,
      snapshot: { project: state.project },
    })
  }, [state.project])

  const value = { state, dispatch, saveCurrentProject, pushSnapshot, ACTIONS }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

export default AppContext
