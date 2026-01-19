import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { BandwidthSnapshot } from '@/types/bandix';
import { formatSpeed } from '@/lib/formatters';

interface BandwidthChartProps {
  data: BandwidthSnapshot[];
}

export function BandwidthChart({ data }: BandwidthChartProps) {
  const chartData = useMemo(() => {
    return data.map((point, index) => ({
      time: index,
      download: point.download,
      upload: point.upload,
    }));
  }, [data]);

  const currentDownload = data.length > 0 ? data[data.length - 1].download : 0;
  const currentUpload = data.length > 0 ? data[data.length - 1].upload : 0;

  return (
    <div className="card-gradient rounded-xl border border-border p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium">Real-time Bandwidth</h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-download" />
            <span className="text-muted-foreground">Down:</span>
            <span className="font-medium text-download">{formatSpeed(currentDownload)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-upload" />
            <span className="text-muted-foreground">Up:</span>
            <span className="font-medium text-upload">{formatSpeed(currentUpload)}</span>
          </div>
        </div>
      </div>
      
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="downloadGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(142, 76%, 50%)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(142, 76%, 50%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="uploadGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(280, 100%, 70%)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(280, 100%, 70%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" hide />
            <YAxis hide domain={[0, 'auto']} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl">
                      <p className="text-download text-sm">
                        ↓ {formatSpeed(payload[0].value as number)}
                      </p>
                      <p className="text-upload text-sm">
                        ↑ {formatSpeed(payload[1].value as number)}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="download"
              stroke="hsl(142, 76%, 50%)"
              strokeWidth={2}
              fill="url(#downloadGradient)"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="upload"
              stroke="hsl(280, 100%, 70%)"
              strokeWidth={2}
              fill="url(#uploadGradient)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
