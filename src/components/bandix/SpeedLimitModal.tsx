import { useState } from 'react';
import { X, Gauge } from 'lucide-react';
import type { ClientTraffic, SpeedLimit } from '@/types/bandix';
import { shortHostname, formatKbps } from '@/lib/formatters';

interface SpeedLimitModalProps {
  client: ClientTraffic;
  onClose: () => void;
  onApply: (limit: SpeedLimit) => void;
}

const PRESET_LIMITS = [
  { label: '1 Mbps', download: 1000, upload: 500 },
  { label: '5 Mbps', download: 5000, upload: 2500 },
  { label: '10 Mbps', download: 10000, upload: 5000 },
  { label: '25 Mbps', download: 25000, upload: 10000 },
  { label: '50 Mbps', download: 50000, upload: 20000 },
];

export function SpeedLimitModal({ client, onClose, onApply }: SpeedLimitModalProps) {
  const [downloadLimit, setDownloadLimit] = useState(10000);
  const [uploadLimit, setUploadLimit] = useState(5000);

  const handlePreset = (download: number, upload: number) => {
    setDownloadLimit(download);
    setUploadLimit(upload);
  };

  const handleApply = () => {
    onApply({
      enabled: true,
      downloadLimit,
      uploadLimit,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative card-gradient rounded-xl border border-border p-6 w-full max-w-md animate-fade-in shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-warning/10">
              <Gauge className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Speed Limit</h2>
              <p className="text-sm text-muted-foreground">{shortHostname(client.hostname)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Presets */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-3">Quick Presets</p>
          <div className="flex flex-wrap gap-2">
            {PRESET_LIMITS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePreset(preset.download, preset.upload)}
                className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-sm transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Limits */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="flex items-center justify-between text-sm mb-2">
              <span>Download Limit</span>
              <span className="text-download font-medium">{formatKbps(downloadLimit)}</span>
            </label>
            <input
              type="range"
              min="100"
              max="100000"
              step="100"
              value={downloadLimit}
              onChange={(e) => setDownloadLimit(parseInt(e.target.value))}
              className="w-full h-2 rounded-full bg-secondary appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-download
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:shadow-lg"
            />
          </div>

          <div>
            <label className="flex items-center justify-between text-sm mb-2">
              <span>Upload Limit</span>
              <span className="text-upload font-medium">{formatKbps(uploadLimit)}</span>
            </label>
            <input
              type="range"
              min="100"
              max="50000"
              step="100"
              value={uploadLimit}
              onChange={(e) => setUploadLimit(parseInt(e.target.value))}
              className="w-full h-2 rounded-full bg-secondary appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-upload
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:shadow-lg"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg bg-secondary hover:bg-secondary/80 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors"
          >
            Apply Limit
          </button>
        </div>
      </div>
    </div>
  );
}
