import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface LineChartProps {
  data: any[];
  dataKey: string;
  color?: string;
}

export function LineChart({ data, dataKey, color = '#2383E2' }: LineChartProps) {
  const formattedData = data.map((item) => ({
    ...item,
    dateFormatted: format(new Date(item.date), 'MMM dd'),
  })).reverse(); // Reverse to show chronological order

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsLineChart data={formattedData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" opacity={0.5} />
        <XAxis
          dataKey="dateFormatted"
          tick={{ fill: '#737373', fontSize: 12 }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#737373', fontSize: 12 }}
          tickLine={false}
          axisLine={false}
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
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={3}
          dot={{ fill: color, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
