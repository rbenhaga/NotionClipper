'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Users, Zap, Globe, RefreshCw } from 'lucide-react';
import {
  getDashboardStats,
  getAnalyticsOverview,
  getPlatformDistribution,
  getClipsDistribution,
  refreshAnalyticsViews,
} from '@/lib/analytics-api';
import type { DashboardStats, AnalyticsOverview, PlatformDistribution, ClipsDistribution } from '@/lib/types';

// Components
import { StatsCard } from '@/components/StatsCard';
import { LineChart } from '@/components/LineChart';
import { BarChart } from '@/components/BarChart';
import { PlatformPieChart } from '@/components/PlatformPieChart';
import { ClipsHistogram } from '@/components/ClipsHistogram';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [overview, setOverview] = useState<AnalyticsOverview[]>([]);
  const [platforms, setPlatforms] = useState<PlatformDistribution[]>([]);
  const [clipsDistribution, setClipsDistribution] = useState<ClipsDistribution[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, overviewData, platformsData, clipsData] = await Promise.all([
        getDashboardStats(),
        getAnalyticsOverview(30),
        getPlatformDistribution(),
        getClipsDistribution(3),
      ]);

      setStats(statsData);
      setOverview(overviewData);
      setPlatforms(platformsData);
      setClipsDistribution(clipsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAnalyticsViews();
      await loadData();
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black">
        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-lg font-medium">Loading analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                NotionClipper Analytics
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Real-time insights & metrics
              </p>
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="font-medium">Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Quick Stats Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Monthly Active Users"
            value={stats?.mau || 0}
            icon={Users}
            trend={+12.5}
            subtitle={`${stats?.dau || 0} active today`}
            color="blue"
          />
          <StatsCard
            title="Clips This Month"
            value={stats?.clips_this_month || 0}
            icon={Zap}
            trend={+8.3}
            subtitle={`${stats?.clips_today || 0} today`}
            color="purple"
          />
          <StatsCard
            title="Premium Users"
            value={stats?.premium_users || 0}
            icon={TrendingUp}
            trend={+15.2}
            subtitle={`${stats?.free_users || 0} free users`}
            color="green"
          />
          <StatsCard
            title="Global Reach"
            value={stats?.countries_active || 0}
            icon={Globe}
            subtitle="countries active"
            color="orange"
          />
        </section>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Active Users Trend */}
          <div className="bg-white dark:bg-gray-800 rounded-apple shadow-notion-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Daily Active Users (Last 30 Days)
            </h3>
            <LineChart data={overview} dataKey="dau" />
          </div>

          {/* Platform Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-apple shadow-notion-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Platform Distribution
            </h3>
            <PlatformPieChart data={platforms} />
          </div>

          {/* Clips Sent Trend */}
          <div className="bg-white dark:bg-gray-800 rounded-apple shadow-notion-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Clips Sent (Last 30 Days)
            </h3>
            <LineChart data={overview} dataKey="total_clips" color="#9065B0" />
          </div>

          {/* Clips Distribution Histogram */}
          <div className="bg-white dark:bg-gray-800 rounded-apple shadow-notion-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Clips per User Distribution
            </h3>
            <ClipsHistogram data={clipsDistribution} />
          </div>
        </div>

        {/* Freemium Insights Section */}
        <section className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-apple p-6 border border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Freemium Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-apple">
              <p className="text-sm text-gray-500 dark:text-gray-400">Median Clips/Month</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {clipsDistribution[0]?.median_clips.toFixed(0) || '—'}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-apple">
              <p className="text-sm text-gray-500 dark:text-gray-400">P90 Clips/Month</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {clipsDistribution[0]?.p90_clips.toFixed(0) || '—'}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-apple">
              <p className="text-sm text-gray-500 dark:text-gray-400">Power Users (100+ clips)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {clipsDistribution[0]?.clips_100_plus || 0}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
            💡 <strong>Recommendation:</strong> Based on data, consider setting free tier limit at{' '}
            <strong className="text-blue-600 dark:text-blue-400">
              {Math.ceil((clipsDistribution[0]?.median_clips || 30) * 1.5)} clips/month
            </strong>{' '}
            to capture median users while incentivizing power users to upgrade.
          </p>
        </section>

        {/* Platform Breakdown Table */}
        <section className="bg-white dark:bg-gray-800 rounded-apple shadow-notion-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Platform Breakdown
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Platform
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Users
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Clips Sent
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Avg Word Count
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Error Rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {platforms.map((platform) => (
                  <tr key={platform.platform} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                      {platform.platform}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 text-right">
                      {platform.users.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 text-right">
                      {platform.clips_sent.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 text-right">
                      {platform.avg_word_count.toFixed(0)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 text-right">
                      {platform.total_events > 0
                        ? ((platform.error_count / platform.total_events) * 100).toFixed(2)
                        : '0.00'}
                      %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>NotionClipper Analytics Dashboard • Built with Apple × Notion design principles</p>
        </div>
      </footer>
    </div>
  );
}
