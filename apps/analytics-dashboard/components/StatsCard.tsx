import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  trend?: number;
  subtitle?: string;
  color?: 'blue' | 'purple' | 'green' | 'orange' | 'red';
}

const colorClasses = {
  blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
  red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
};

export function StatsCard({ title, value, icon: Icon, trend, subtitle, color = 'blue' }: StatsCardProps) {
  const formattedValue = value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toLocaleString();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-apple shadow-notion-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-notion-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{formattedValue}</p>

          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
          )}

          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-2 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">
                {trend >= 0 ? '+' : ''}
                {trend.toFixed(1)}%
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">vs last period</span>
            </div>
          )}
        </div>

        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
