import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'primary' | 'download' | 'upload' | 'warning';
}

export function StatCard({ title, value, subtitle, icon, trend, color = 'primary' }: StatCardProps) {
  const colorClasses = {
    primary: 'text-primary',
    download: 'text-download',
    upload: 'text-upload',
    warning: 'text-warning',
  };

  const bgClasses = {
    primary: 'bg-primary/10',
    download: 'bg-download/10',
    upload: 'bg-upload/10',
    warning: 'bg-warning/10',
  };

  return (
    <div className="card-gradient rounded-xl border border-border p-4 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`text-2xl font-semibold tracking-tight ${colorClasses[color]}`}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${bgClasses[color]}`}>
          <div className={colorClasses[color]}>
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}
