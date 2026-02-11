// Simple toast notification utility
// Uses a lightweight DOM-based approach to avoid adding dependencies

export type ToastType = 'info' | 'success' | 'warning' | 'error';

const TOAST_DURATION = 4000;
const TOAST_CONTAINER_ID = 'toast-container';

function getOrCreateContainer(): HTMLElement {
  let container = document.getElementById(TOAST_CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = TOAST_CONTAINER_ID;
    container.style.cssText =
      'position:fixed;top:16px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
    document.body.appendChild(container);
  }
  return container;
}

const TYPE_STYLES: Record<ToastType, string> = {
  info: 'background:#2563eb;color:#fff;',
  success: 'background:#16a34a;color:#fff;',
  warning: 'background:#d97706;color:#fff;',
  error: 'background:#dc2626;color:#fff;',
};

export function showToast(message: string, type: ToastType = 'info'): void {
  const container = getOrCreateContainer();

  const toast = document.createElement('div');
  toast.setAttribute('role', 'alert');
  toast.setAttribute('data-testid', 'toast-notification');
  toast.style.cssText =
    `${TYPE_STYLES[type]}padding:12px 20px;border-radius:8px;font-size:14px;font-family:inherit;box-shadow:0 4px 12px rgba(0,0,0,0.15);pointer-events:auto;opacity:0;transition:opacity 0.3s ease;max-width:400px;word-break:break-word;`;
  toast.textContent = message;

  container.appendChild(toast);

  // Trigger fade-in
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
  });

  // Auto-remove after duration
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
      // Clean up container if empty
      if (container.children.length === 0) {
        container.remove();
      }
    }, 300);
  }, TOAST_DURATION);
}
