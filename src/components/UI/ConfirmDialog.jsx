/**
 * ConfirmDialog — Modal confirmation dialog that replaces window.confirm().
 * Consistent with the app's design system; supports danger variant.
 */
export default function ConfirmDialog({
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  danger = false,
}) {
  return (
    <div
      className="modal-overlay confirm-dialog-overlay"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="confirm-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-dialog__icon" aria-hidden="true">
          {danger ? '🗑️' : '❓'}
        </div>
        <h3
          id="confirm-dialog-title"
          className="confirm-dialog__title"
        >
          {title}
        </h3>
        {message && (
          <p className="confirm-dialog__message">{message}</p>
        )}
        <div className="confirm-dialog__actions">
          <button
            className="btn btn-ghost"
            onClick={onCancel}
            autoFocus
          >
            {cancelLabel}
          </button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
