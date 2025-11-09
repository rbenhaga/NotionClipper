import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { ClipsDistribution } from '@/lib/types';
import { format } from 'date-fns';

interface ClipsHistogramProps {
  data: ClipsDistribution[];
}

export function ClipsHistogram({ data }: ClipsHistogramProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-400">
        No data available
      </div>
    );
  }

  // Use most recent month
  const latestMonth = data[0];

  const histogramData = [
    { range: '0', count: latestMonth.zero_clips, label: '0 clips' },
    { range: '1-5', count: latestMonth.clips_1_5, label: '1-5 clips' },
    { range: '6-10', count: latestMonth.clips_6_10, label: '6-10 clips' },
    { range: '11-25', count: latestMonth.clips_11_25, label: '11-25 clips' },
    { range: '26-50', count: latestMonth.clips_26_50, label: '26-50 clips' },
    { range: '51-100', count: latestMonth.clips_51_100, label: '51-100 clips' },
    { range: '100+', count: latestMonth.clips_100_plus, label: '100+ clips' },
  ];

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={histogramData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" opacity={0.5} />
          <XAxis
            dataKey="range"
            tick={{ fill: '#737373', fontSize: 11 }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#737373', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            label={{ value: 'Users', angle: -90, position: 'insideLeft', fill: '#737373' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e5e5',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
            labelStyle={{ fontWeight: 600, color: '#171717' }}
          />
          <Bar dataKey="count" fill="#0F7B6C" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-3 gap-2 text-sm">
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
          <p className="text-gray-500 dark:text-gray-400 text-xs">Median</p>
          <p className="font-bold text-gray-900 dark:text-white">{latestMonth.median_clips.toFixed(0)}</p>
        </div>
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
          <p className="text-gray-500 dark:text-gray-400 text-xs">Average</p>
          <p className="font-bold text-gray-900 dark:text-white">{latestMonth.avg_clips.toFixed(0)}</p>
        </div>
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
          <p className="text-gray-500 dark:text-gray-400 text-xs">P90</p>
          <p className="font-bold text-gray-900 dark:text-white">{latestMonth.p90_clips.toFixed(0)}</p>
        </div>
      </div>
    </div>
  );
}
