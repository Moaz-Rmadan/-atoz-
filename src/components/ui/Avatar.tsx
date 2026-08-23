import React, { useState } from 'react';
import { User } from 'lucide-react';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  isLoading?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-base',
  lg: 'w-20 h-20 text-xl',
  xl: 'w-28 h-28 text-2xl',
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'صورة الحساب',
  size = 'md',
  className = '',
  isLoading = false,
}) => {
  const [hasError, setHasError] = useState(false);

  if (isLoading) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-full bg-slate-200 animate-pulse border border-slate-300 flex items-center justify-center shrink-0 ${className}`}
      />
    );
  }

  if (src && !hasError) {
    return (
      <img
        src={src}
        alt={alt}
        onError={() => setHasError(true)}
        className={`${sizeClasses[size]} rounded-full object-cover border border-slate-200 shadow-xs shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center font-bold shrink-0 shadow-xs ${className}`}
    >
      <User className="w-1/2 h-1/2 text-emerald-700" />
    </div>
  );
};
