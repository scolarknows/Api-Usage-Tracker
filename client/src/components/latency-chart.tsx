import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { ChartPoint } from '../types/api.ts';

interface LatencyChartProps {
  points: ChartPoint[];
}

export function LatencyChart({ points }: LatencyChartProps) {
  if (points.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-wine/60 dark:text-rose/60 border border-dashed border-rose/30 rounded-xl">
        No checks recorded yet in this range
      </div>
    );
  }

  const formattedData = points.map((p) => {
    const d = new Date(p.timestamp);
    const timeLabel = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    return {
      timestamp: timeLabel,
      latencyMs: p.latencyMs, // null when check failed!
      isUp: p.isUp,
      error: p.error,
    };
  });

  return (
    <div className="h-72 w-full pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#D49A9A" opacity={0.2} />
          <XAxis
            dataKey="timestamp"
            stroke="#AA5E7A"
            fontSize={11}
            tickLine={false}
            minTickGap={30}
          />
          <YAxis stroke="#AA5E7A" fontSize={11} tickLine={false} unit="ms" />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const item = payload[0]?.payload as {
                  latencyMs: number | null;
                  isUp: boolean;
                  error: string | null;
                };
                return (
                  <div className="p-3 rounded-lg border border-rose/30 bg-surface dark:bg-dark-card shadow-lg text-xs font-mono">
                    <p className="font-semibold mb-1 text-wine dark:text-rose">{label}</p>
                    {item.isUp ? (
                      <p className="text-emerald-600 dark:text-emerald-400">
                        Latency: {item.latencyMs} ms
                      </p>
                    ) : (
                      <p className="text-rose-600 dark:text-rose-400">
                        Offline: {item.error || 'Failed'}
                      </p>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Line
            type="monotone"
            dataKey="latencyMs"
            stroke="#7C0E44"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: '#7C0E44' }}
            connectNulls={false} // Never plot 0ms for failed check
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
