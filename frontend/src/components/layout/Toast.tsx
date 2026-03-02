import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  isVisible: boolean;
  onDismiss: () => void;
}

export default function Toast({ message, type, isVisible, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(() => {
      onDismiss();
    }, 5000);

    return () => clearTimeout(timer);
  }, [isVisible, onDismiss]);

  if (!isVisible) return null;

  const bgColor = type === 'success' ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400';
  const textColor = type === 'success' ? 'text-green-800' : 'text-red-800';
  const iconColor = type === 'success' ? 'text-green-500' : 'text-red-500';
  const Icon = type === 'success' ? CheckCircle : AlertCircle;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 max-w-sm w-full border rounded-lg shadow-lg p-4 ${bgColor}`}
      role="alert"
      data-testid="toast"
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconColor}`} />
        <p className={`text-sm font-medium flex-1 ${textColor}`}>{message}</p>
        <button
          onClick={onDismiss}
          className={`flex-shrink-0 ${textColor} hover:opacity-70`}
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
