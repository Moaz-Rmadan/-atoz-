import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'purple';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'start' | 'end';
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs focus-visible:ring-emerald-500 border border-emerald-700/20',
  secondary:
    'bg-slate-900 hover:bg-slate-800 text-white shadow-2xs focus-visible:ring-slate-700',
  outline:
    'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 focus-visible:ring-slate-400',
  ghost:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-300',
  danger:
    'bg-rose-600 hover:bg-rose-700 text-white shadow-2xs focus-visible:ring-rose-500 border border-rose-700/20',
  success:
    'bg-emerald-500 hover:bg-emerald-600 text-white shadow-2xs focus-visible:ring-emerald-400',
  purple:
    'bg-purple-600 hover:bg-purple-700 text-white shadow-2xs focus-visible:ring-purple-500 border border-purple-700/20',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs font-semibold rounded-lg gap-1.5 min-h-[36px]',
  md: 'px-4 py-2.5 text-sm font-semibold rounded-xl gap-2 min-h-[44px]',
  lg: 'px-6 py-3.5 text-base font-bold rounded-2xl gap-2.5 min-h-[52px]',
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  icon,
  iconPosition = 'start',
  className = '',
  disabled,
  ...props
}) => {
  const isDisabled = disabled || isLoading;

  return (
    <button
      disabled={isDisabled}
      className={`inline-flex items-center justify-center transition-all cursor-pointer select-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none disabled:active:scale-100 ${
        variantStyles[variant]
      } ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        icon && iconPosition === 'start' && <span className="shrink-0">{icon}</span>
      )}

      <span>{children}</span>

      {!isLoading && icon && iconPosition === 'end' && (
        <span className="shrink-0">{icon}</span>
      )}
    </button>
  );
};
