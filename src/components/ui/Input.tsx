import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, startIcon, endIcon, className = '', required, id, ...props }, ref) => {
    const inputId = id || props.name || Math.random().toString(36).substring(2, 9);

    return (
      <div className="w-full space-y-1.5 text-right dir-rtl">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-bold text-slate-700">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {startIcon && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none shrink-0">
              {startIcon}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            required={required}
            className={`w-full py-2.5 text-sm bg-slate-50 border rounded-xl text-slate-900 placeholder:text-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60 disabled:bg-slate-100 ${
              startIcon ? 'pr-10' : 'pr-3.5'
            } ${endIcon ? 'pl-10' : 'pl-3.5'} ${
              error
                ? 'border-rose-300 focus:border-rose-600 focus:ring-rose-500/20'
                : 'border-slate-200 focus:border-emerald-600'
            } ${className}`}
            {...props}
          />

          {endIcon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 shrink-0">
              {endIcon}
            </div>
          )}
        </div>

        {error ? (
          <p className="text-xs font-semibold text-rose-600">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-slate-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
