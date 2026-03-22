import type { GameExecution } from '@/types';
import type { DateRange } from '@/types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subHours, subDays, startOfHour, startOfDay } from 'date-fns';

interface Props { executions: GameExecution[]; dateRange: DateRange; loading?: boolean; }

function buildChartData(executions: GameExecution[], dateRange: DateRange) {
  const now = Date.now();
  const buckets: { label: string; executions: number }[] = [];

  if (dateRange === '24h') {
    for (let i = 23; i >= 0; i--) {
      const start = startOfHour(subHours(now, i)).getTime();
      const end = start + 3600000;
      const count = executions.filter(e => {
        const t = new Date(e.last_executed_at).getTime();
        return t >= start && t < end;
      }).reduce((s, e) => s + e.count, 0);
      buckets.push({ label: format(start, 'HH:mm'), executions: count });
    }
  } else {
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    for (let i = days - 1; i >= 0; i--) {
      const start = startOfDay(subDays(now, i)).getTime();
      const end = start + 86400000;
      const count = executions.filter(e => {
        const t = new Date(e.last_executed_at).getTime();
        return t >= start && t < end;
      }).reduce((s, e) => s + e.count, 0);
      buckets.push({ label: format(start, 'MMM d'), executions: count });
    }
  }

  return buckets;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      <p className="text-indigo-400 font-semibold">{payload[0].value.toLocaleString()} executions</p>
    </div>
  );
};

export function ExecutionsChart({ executions, dateRange, loading = false }: Props) {
  if (loading) return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-40 bg-gray-800" />
      <Skeleton className="h-40 w-full bg-gray-800 rounded-lg" />
    </div>
  );

  const data = buildChartData(executions, dateRange);
  const ticks = dateRange === '24h'
    ? data.filter((_, i) => i % 4 === 0).map(d => d.label)
    : dateRange === '90d'
      ? data.filter((_, i) => i % 10 === 0).map(d => d.label)
      : undefined;

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-400 mb-3">Executions Over Time</h4>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="execGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 10 }} ticks={ticks} />
          <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="executions" stroke="#3b82f6" strokeWidth={2} fill="url(#execGrad)" dot={false} activeDot={{ r: 4, fill: '#3b82f6' }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
