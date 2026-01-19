import { Activity, Settings, RefreshCw } from 'lucide-react';
import type { BandixStatus } from '@/types/bandix';
import { formatDuration } from '@/lib/formatters';

interface HeaderProps {
  status: BandixStatus | null;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function Header({ status, isRefreshing, onRefresh }: HeaderProps) {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container flex items-center justify-between h-16 px-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 glow-primary">
            <Activity className="w-5 h-5 text-primary animate-pulse-glow" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              <span className="gradient-text">Bandix</span>
            </h1>
            <p className="text-xs text-muted-foreground">Network Monitor</p>
          </div>
        </div>

        {/* Status & Controls */}
        <div className="flex items-center gap-4">
          {/* Service Status */}
          {status && (
            <div className="hidden sm:flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${status.running ? 'bg-success animate-pulse' : 'bg-destructive'}`} />
                <span className="text-muted-foreground">
                  {status.running ? 'Running' : 'Stopped'}
                </span>
              </div>
              <div className="text-muted-foreground">
                <span className="text-foreground">{status.interface}</span>
              </div>
              <div className="text-muted-foreground">
                Uptime: <span className="text-foreground">{formatDuration(status.uptime)}</span>
              </div>
            </div>
          )}

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Settings Button */}
          <button
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
