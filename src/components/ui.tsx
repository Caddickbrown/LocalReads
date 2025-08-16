import React, { useState, useCallback, useContext, useEffect } from 'react'

// Input component with consistent styling
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { className?: string }> = ({ 
  className = '', 
  ...props 
}) => (
  <input 
    {...props} 
    className={`w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 outline-none focus:ring-2 ring-zinc-300 dark:ring-zinc-700 transition-colors ${className}`} 
  />
)

// Textarea component with consistent styling
export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string }> = ({ 
  className = '', 
  ...props 
}) => (
  <textarea 
    {...props} 
    className={`w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 outline-none focus:ring-2 ring-zinc-300 dark:ring-zinc-700 transition-colors ${className}`} 
  />
)

// Button component with variants
export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  className?: string
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}> = ({ 
  children, 
  className = '', 
  variant = 'primary',
  size = 'md',
  ...rest 
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  }
  
  const variantClasses = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500 shadow-sm hover:shadow btn-primary',
    secondary: 'bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-100 focus:ring-zinc-500 border border-zinc-300 dark:border-zinc-600 btn-secondary',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-sm hover:shadow',
    ghost: 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 focus:ring-zinc-500'
  }
  
  return (
    <button 
      {...rest} 
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

// Card components
export const Card: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 shadow-sm card ${className}`}>
    {children}
  </div>
)

export const CardHeader: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`p-4 border-b border-zinc-200 dark:border-zinc-800 ${className}`}>
    {children}
  </div>
)

export const CardContent: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`p-4 ${className}`}>
    {children}
  </div>
)

// Badge component
export const Badge: React.FC<React.PropsWithChildren<{ 
  className?: string
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md'
}>> = ({ 
  children, 
  className = '',
  variant = 'default',
  size = 'md'
}) => {
  const baseClasses = 'inline-flex items-center rounded-full border text-xs font-medium'
  
  const sizeClasses = {
    sm: 'px-2 py-0.5',
    md: 'px-2.5 py-1'
  }
  
  const variantClasses = {
    default: 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
    primary: 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
    secondary: 'border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200',
    success: 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    warning: 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    danger: 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
  }
  
  return (
    <span className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
}

// Select component
export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { className?: string }> = ({ 
  children, 
  className = '', 
  ...props 
}) => (
  <select 
    {...props} 
    className={`w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 outline-none focus:ring-2 ring-zinc-300 dark:ring-zinc-700 transition-colors ${className}`}
  >
    {children}
  </select>
)

// Modal backdrop
export const ModalBackdrop: React.FC<React.PropsWithChildren<{ 
  className?: string
  onClick?: () => void 
}>> = ({ 
  children, 
  className = '',
  onClick 
}) => (
  <div 
    className={`fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 modal-backdrop ${className}`}
    onClick={onClick}
  >
    {children}
  </div>
)

// Loading spinner
export const Spinner: React.FC<{ className?: string; size?: 'sm' | 'md' | 'lg' }> = ({ 
  className = '', 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }
  
  return (
    <div className={`${sizeClasses[size]} border-2 border-zinc-300 border-t-indigo-600 rounded-full animate-spin ${className}`} />
  )
}

// Enhanced empty state component with illustrations and helpful tips
export const EmptyState: React.FC<{ 
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  tips?: string[]
  illustration?: 'books' | 'search' | 'highlights' | 'dashboard' | 'default'
}> = ({ 
  icon, 
  title, 
  description, 
  action, 
  className = '',
  tips = [],
  illustration = 'default'
}) => {
  // Simple ASCII-style illustrations
  const illustrations = {
    books: (
      <div className="text-6xl mb-4 opacity-20 select-none font-mono leading-none">
        📚<br/>
        📖 📕
      </div>
    ),
    search: (
      <div className="text-6xl mb-4 opacity-20 select-none font-mono leading-none">
        🔍<br/>
        📄 📄
      </div>
    ),
    highlights: (
      <div className="text-6xl mb-4 opacity-20 select-none font-mono leading-none">
        ✨<br/>
        📝 💭
      </div>
    ),
    dashboard: (
      <div className="text-6xl mb-4 opacity-20 select-none font-mono leading-none">
        📊<br/>
        📈 📉
      </div>
    ),
    default: null
  }

  return (
    <div className={`text-center py-16 empty-state ${className}`}>
      {/* Illustration */}
      {illustrations[illustration]}
      
      {/* Icon (fallback if no illustration) */}
      {!illustrations[illustration] && icon && (
        <div className="mx-auto w-16 h-16 text-zinc-300 dark:text-zinc-600 mb-6 flex items-center justify-center">
          {icon}
        </div>
      )}
      
      {/* Title */}
      <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-3">{title}</h3>
      
      {/* Description */}
      {description && (
        <p className="text-zinc-600 dark:text-zinc-400 mb-6 max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      )}
      
      {/* Tips */}
      {tips.length > 0 && (
        <div className="mb-8 max-w-lg mx-auto">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">💡 Tips:</p>
          <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2 text-left">
            {tips.map((tip, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-zinc-400 mt-1">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Action */}
      {action && <div className="space-y-2">{action}</div>}
    </div>
  )
}

// Checkbox component
export const Checkbox: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({
  checked,
  onChange,
  label,
  className = '',
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }
  
  const labelSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }
  
  return (
    <label className={`flex items-center gap-2 cursor-pointer ${className}`}>
      <div className={`relative ${sizeClasses[size]}`}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`
            ${sizeClasses[size]} rounded border-2 transition-all duration-200
            ${checked 
              ? 'bg-indigo-600 border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500' 
              : 'bg-white border-zinc-300 dark:bg-zinc-800 dark:border-zinc-600 hover:border-indigo-400 dark:hover:border-indigo-400'
            }
          `}
        >
          {checked && (
            <svg
              className={`${sizeClasses[size]} text-white absolute inset-0 p-0.5`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
      </div>
      {label && (
        <span className={`text-zinc-900 dark:text-zinc-100 ${labelSizeClasses[size]} select-none`}>
          {label}
        </span>
      )}
    </label>
  )
}

// Progress bar component
export const ProgressBar: React.FC<{
  value: number; // 0-100
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning' | 'danger';
}> = ({
  value,
  className = '',
  showLabel = true,
  size = 'md',
  color = 'primary'
}) => {
  const clampedValue = Math.max(0, Math.min(100, value))
  
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  }
  
  const colorClasses = {
    primary: 'bg-indigo-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    danger: 'bg-red-600'
  }
  
  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full ${sizeClasses[size]} bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden`}>
        <div 
          className={`h-full ${colorClasses[color]} transition-all duration-300 ease-out`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between items-center mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          <span>{clampedValue}% complete</span>
        </div>
      )}
    </div>
  )
}

// Toast notification system
interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message?: string
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType | null>(null)

export const ToastProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    const newToast: Toast = { ...toast, id, duration: toast.duration ?? 5000 }
    
    setToasts(prev => [...prev, newToast])
    
    // Auto-remove after duration
    if (newToast.duration !== Infinity) {
      setTimeout(() => {
        removeToast(id)
      }, newToast.duration)
    }
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

const ToastContainer: React.FC<{ toasts: Toast[]; removeToast: (id: string) => void }> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  )
}

const Toast: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  const handleRemove = () => {
    setIsLeaving(true)
    setTimeout(() => onRemove(toast.id), 200)
  }

  const getToastStyles = () => {
    const baseClasses = 'pointer-events-auto transform transition-all duration-200 ease-out shadow-lg rounded-xl border p-4 max-w-sm'
    
    switch (toast.type) {
      case 'success':
        return `${baseClasses} bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-800 dark:text-green-200`
      case 'error':
        return `${baseClasses} bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200`
      case 'warning':
        return `${baseClasses} bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200`
      case 'info':
        return `${baseClasses} bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200`
      default:
        return `${baseClasses} bg-zinc-50 dark:bg-zinc-900/20 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200`
    }
  }

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return '✓'
      case 'error':
        return '✕'
      case 'warning':
        return '⚠'
      case 'info':
        return 'ℹ'
      default:
        return '•'
    }
  }

  return (
    <div
      className={`${getToastStyles()} ${
        isVisible && !isLeaving 
          ? 'translate-x-0 opacity-100 scale-100' 
          : 'translate-x-full opacity-0 scale-95'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-sm font-bold">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium">{toast.title}</div>
          {toast.message && (
            <div className="text-sm opacity-90 mt-1">{toast.message}</div>
          )}
        </div>
        <button
          onClick={handleRemove}
          className="flex-shrink-0 w-4 h-4 opacity-60 hover:opacity-100 transition-opacity"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
