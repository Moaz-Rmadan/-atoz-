import React from 'react';

export interface DashboardLayoutProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  headerActions?: React.ReactNode;
  statsGrid?: React.ReactNode;
  filters?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  title,
  description,
  badge,
  headerActions,
  statsGrid,
  filters,
  children,
  className = '',
}) => {
  return (
    <div className={`space-y-6 dir-rtl ${className}`}>
      {/* Dashboard Top Header Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">
              {description}
            </p>
          )}
        </div>

        {headerActions && (
          <div className="flex items-center gap-3 shrink-0 flex-wrap w-full md:w-auto justify-start md:justify-end">
            {headerActions}
          </div>
        )}
      </div>

      {/* Metrics & Statistics Bar Slot */}
      {statsGrid && <div className="space-y-4">{statsGrid}</div>}

      {/* Optional Filter Controls Bar */}
      {filters && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between gap-4 overflow-x-auto">
          {filters}
        </div>
      )}

      {/* Main Body Content Slot */}
      <div className="space-y-6">{children}</div>
    </div>
  );
};
