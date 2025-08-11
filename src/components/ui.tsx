import React from 'react'

// Input component with consistent styling
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { className?: string }> = ({ 
  className = '', 
  ...props 
}) => (
  <input 
    {...props} 
    className={`w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 outline-none focus:ring-2 ring-zinc-300 dark:ring-zinc-700 transition-colors ${className}`} 
  />
)

// Textarea component with consistent styling
export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string }> = ({ 
  className = '', 
  ...props 
}) => (
  <textarea 
    {...props} 
    className={`w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 outline-none focus:ring-2 ring-zinc-300 dark:ring-zinc-700 transition-colors ${className}`} 
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
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500 shadow-sm hover:shadow',
    secondary: 'bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-100 focus:ring-zinc-500 border border-zinc-300 dark:border-zinc-600',
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
  <div className={`rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm ${className}`}>
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
    className={`w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 outline-none focus:ring-2 ring-zinc-300 dark:ring-zinc-700 transition-colors ${className}`}
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
    className={`fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 ${className}`}
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

// Empty state component
export const EmptyState: React.FC<{ 
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}> = ({ 
  icon, 
  title, 
  description, 
  action, 
  className = '' 
}) => (
  <div className={`text-center py-12 ${className}`}>
    {icon && <div className="mx-auto w-12 h-12 text-zinc-400 mb-4">{icon}</div>}
    <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">{title}</h3>
    {description && <p className="text-zinc-600 dark:text-zinc-400 mb-6">{description}</p>}
    {action && <div>{action}</div>}
  </div>
)
