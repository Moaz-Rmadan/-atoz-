import React from 'react';
import { Loader2 } from 'lucide-react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string;
  height?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  className = '',
  style,
  ...props
}) => {
  const baseClasses = 'bg-slate-200 animate-pulse shrink-0';

  let variantClass = 'rounded-lg h-4 w-full';
  if (variant === 'circular') variantClass = 'rounded-full w-10 h-10';
  if (variant === 'rectangular') variantClass = 'rounded-xl h-24 w-full';
  if (variant === 'card') variantClass = 'rounded-2xl h-48 w-full border border-slate-200';

  return (
    <div
      className={`${baseClasses} ${variantClass} ${className}`}
      style={{
        ...(width ? { width } : {}),
        ...(height ? { height } : {}),
        ...style,
      }}
      {...props}
    />
  );
};

export interface LoadingOverlayProps {
  message?: string;
  fullScreen?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message = 'جاري التحميل...',
  fullScreen = false,
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center p-8 text-slate-600 dir-rtl">
      <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-3 shadow-2xs border border-emerald-100">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
      <p className="text-sm font-bold text-slate-800">{message}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-xs flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};
