import type { GameExecution } from '@/types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface Props { executions: GameExecution[]; loading?: boolean; }

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#f87171', '#a78bfa'];
const SUPPORTED_GAMES = ['Pixel Blade', 'Loot Hero', 'Survive Lava', 'Flick', 'UNC Tester'];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs">
      <p className="text-white font-semibold">{payload[0].name}</p>
      <p className="text-gray-400">{payload[0].value.toLocaleString()} executions</p>
      <p className="text-gray-500">{payload[0].payload.percent}%</p>
    </div>
  );
};

export function GameBreakdownChart({ executions, loading = false }: Props) {
  if (loading) return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-40 bg-gray-800" />
      <Skeleton className="h-40 w-full bg-gray-800 rounded-lg" />
    </div>
  );

  const grouped: Record<string, number> = {};
  for (const e of executions) {
    const name = e.game_name ?? `Place ${e.place_id}`;
    if (!SUPPORTED_GAMES.includes(name)) continue;
    grouped[name] = (grouped[name] ?? 0) + e.count;
  }

  const total = Object.values(grouped).reduce((s, v) => s + v, 0);
  const data = SUPPORTED_GAMES
    .filter(name => (grouped[name] ?? 0) > 0)
    .map(name => ({
      name,
      value: grouped[name] ?? 0,
      percent: total > 0 ? Math.round(((grouped[name] ?? 0) / total) * 100) : 0,
    }));

  if (data.length === 0) return (
    <div>
      <h4 className="text-sm font-medium text-gray-400 mb-3">Per-Game Breakdown</h4>
      <p className="text-center text-gray-500 text-xs py-8">No data yet</p>
    </div>
  );

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-400 mb-3">Per-Game Breakdown</h4>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
