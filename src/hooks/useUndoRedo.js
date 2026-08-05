import { useCallback } from 'react'

/**
 * Undo/Redo reducer actions
 */
export const HISTORY_ACTIONS = {
  PUSH: 'PUSH_HISTORY',
  UNDO: 'UNDO',
  REDO: 'REDO',
  CLEAR: 'CLEAR_HISTORY',
}

/**
 * Initial undo/redo state
 */
export const initialHistoryState = {
  history: [],
  historyIndex: -1,
}

/**
 * Reducer that manages history stack
 * Integrates with AppContext dispatch
 */
export function historyReducer(state, action) {
  switch (action.type) {
    case HISTORY_ACTIONS.PUSH: {
      // Trim any future states when new action is committed
      const truncated = state.history.slice(0, state.historyIndex + 1)
      const newHistory = [...truncated, action.snapshot]
      // Cap at 50 undo steps
      const capped = newHistory.length > 50 ? newHistory.slice(newHistory.length - 50) : newHistory
      return {
        history: capped,
        historyIndex: capped.length - 1,
      }
    }
    case HISTORY_ACTIONS.UNDO: {
      if (state.historyIndex <= 0) return state
      return { ...state, historyIndex: state.historyIndex - 1 }
    }
    case HISTORY_ACTIONS.REDO: {
      if (state.historyIndex >= state.history.length - 1) return state
      return { ...state, historyIndex: state.historyIndex + 1 }
    }
    case HISTORY_ACTIONS.CLEAR: {
      return initialHistoryState
    }
    default:
      return state
  }
}

/**
 * Hook that exposes undo/redo helpers
 * Works with an AppContext that uses the historyReducer
 */
export function useUndoRedo(state, dispatch) {
  const canUndo = state.historyIndex > 0
  const canRedo = state.historyIndex < state.history.length - 1

  const currentSnapshot = state.history[state.historyIndex] || null
  const undoSnapshot = canUndo ? state.history[state.historyIndex - 1] : null
  const redoSnapshot = canRedo ? state.history[state.historyIndex + 1] : null

  const pushHistory = useCallback(
    (snapshot) => dispatch({ type: HISTORY_ACTIONS.PUSH, snapshot }),
    [dispatch]
  )

  const undo = useCallback(() => {
    if (canUndo) dispatch({ type: HISTORY_ACTIONS.UNDO })
  }, [canUndo, dispatch])

  const redo = useCallback(() => {
    if (canRedo) dispatch({ type: HISTORY_ACTIONS.REDO })
  }, [canRedo, dispatch])

  return { canUndo, canRedo, pushHistory, undo, redo, currentSnapshot, undoSnapshot, redoSnapshot }
}
