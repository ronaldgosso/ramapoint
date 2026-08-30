import { Component } from 'react'

/**
 * ErrorBoundary — catches render errors in child tree and shows a
 * recovery UI instead of crashing the entire application.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Uncaught render error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="error-boundary-fallback" role="alert">
          <div className="error-boundary-fallback__icon" aria-hidden="true">⚠️</div>
          <h2 className="error-boundary-fallback__title">Something went wrong</h2>
          <p className="error-boundary-fallback__message">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            className="btn btn-primary"
            onClick={this.handleReset}
          >
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
