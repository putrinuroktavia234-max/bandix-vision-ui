import { Play, Square, RotateCcw, Power } from 'lucide-react';
import type { BandixStatus } from '@/types/bandix';

interface ServiceControlsProps {
  status: BandixStatus | null;
  onControl: (action: 'start' | 'stop' | 'restart') => void;
}

export function ServiceControls({ status, onControl }: ServiceControlsProps) {
  const isRunning = status?.running ?? false;

  return (
    <div className="card-gradient rounded-xl border border-border p-4 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Power className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-medium">Service Control</h3>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-success animate-pulse' : 'bg-destructive'}`} />
        <span className="text-sm">
          bandixd is <span className={isRunning ? 'text-success' : 'text-destructive'}>{isRunning ? 'running' : 'stopped'}</span>
        </span>
      </div>
      
      <div className="flex gap-2">
        {isRunning ? (
          <button
            onClick={() => onControl('stop')}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 text-sm font-medium transition-colors"
          >
            <Square className="w-4 h-4" />
            Stop
          </button>
        ) : (
          <button
            onClick={() => onControl('start')}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-success/20 text-success hover:bg-success/30 text-sm font-medium transition-colors"
          >
            <Play className="w-4 h-4" />
            Start
          </button>
        )}
        
        <button
          onClick={() => onControl('restart')}
          disabled={!isRunning}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-info/20 text-info hover:bg-info/30 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCcw className="w-4 h-4" />
          Restart
        </button>
      </div>
    </div>
  );
}
