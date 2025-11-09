# NotionClipper Analytics Dashboard

> **Enterprise-grade analytics dashboard with Apple × Notion design**
>
> Beautiful, fast, and RGPD-compliant analytics for NotionClipper.

![Dashboard Preview](https://via.placeholder.com/800x400/2383E2/ffffff?text=NotionClipper+Analytics)

---

## Features

- **Real-time Metrics**: DAU, WAU, MAU, clips sent, premium users
- **Platform Analytics**: Distribution across Windows, macOS, Linux, Chrome, Firefox
- **Freemium Insights**: Usage distribution, median/P90 stats to optimize pricing tiers
- **Retention Tracking**: Cohort analysis (D1, D7, D30, D90)
- **Geographic Distribution**: Global user reach by country
- **Beautiful UI**: Notion-inspired design with dark mode support

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Charts**: Recharts
- **Styling**: Tailwind CSS
- **TypeScript**: Full type safety

---

## Getting Started

### 1. Prerequisites

- Node.js 20+
- pnpm (or npm/yarn)
- Supabase account with analytics tables set up

### 2. Install Dependencies

```bash
cd apps/analytics-dashboard
pnpm install
```

### 3. Configure Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3001](http://localhost:3001) to view the dashboard.

### 5. Build for Production

```bash
pnpm build
pnpm start
```

---

## Dashboard Sections

### 1. Quick Stats

- **Monthly Active Users (MAU)**: Users who sent ≥1 clip
- **Daily Active Users (DAU)**: Active users today
- **Clips This Month**: Total clips sent this month
- **Premium Users**: Users on paid plan
- **Global Reach**: Countries with active users

### 2. Charts & Visualizations

- **Daily Active Users Trend**: 30-day line chart
- **Platform Distribution**: Pie chart showing Electron vs Extension usage
- **Clips Sent Trend**: Monthly clips volume
- **Clips Distribution Histogram**: Freemium optimization insights

### 3. Freemium Insights

Critical for pricing decisions:
- **Median clips/month**: Typical user behavior
- **P90 clips/month**: Power user threshold
- **100+ clips users**: Premium conversion candidates

**Recommendation Algorithm**: Dashboard suggests optimal free tier limit based on median usage.

### 4. Platform Breakdown Table

Detailed metrics per platform:
- Users count
- Clips sent
- Average word count
- Error rate

---

## Database Schema

The dashboard queries these Supabase views:

### Materialized Views (Pre-aggregated for Performance)

- `dashboard_quick_stats` - Real-time overview metrics
- `analytics_overview` - Daily time-series data
- `platform_distribution` - Platform usage breakdown
- `clips_per_user_distribution` - Histogram data for freemium
- `retention_cohorts` - User retention by cohort
- `geographic_distribution` - Users by country

### Refresh Strategy

Views are refreshed automatically:
- **Hourly**: Via cron job (Supabase Edge Function)
- **Manual**: Click "Refresh" button in dashboard

---

## Deployment

### Vercel (Recommended)

```bash
vercel
```

### Environment Variables

Set these in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Custom Domain

Integrate into your marketing site:

```html
<!-- Embed dashboard in iframe -->
<iframe src="https://analytics.notionclipper.com" width="100%" height="800px"></iframe>
```

Or use Next.js rewrites for seamless integration.

---

## Security

- **Row Level Security (RLS)**: Enabled on all tables
- **Service Role**: Server-side only, never exposed to client
- **RGPD Compliant**: No PII, anonymized IPs
- **Private Dashboard**: Set `robots: 'noindex'` in metadata

---

## Customization

### Colors

Edit `tailwind.config.js`:
```js
colors: {
  primary: { /* your brand colors */ }
}
```

### Charts

Customize in `components/*.tsx`:
- Change colors: `color="#yourColor"`
- Add new metrics: Query Supabase views

### Metrics

Add custom metrics:
1. Create new materialized view in Supabase
2. Add API function in `lib/analytics-api.ts`
3. Create component in `components/`
4. Add to dashboard `app/page.tsx`

---

## Business Use Cases

### 1. Beta Testing Analysis

Track beta tester behavior to:
- Identify power users
- Optimize onboarding flow
- Set freemium limits

### 2. Fundraising / Acquisition

Show investors:
- **Growth**: MAU/DAU trends
- **Engagement**: Clips per user
- **Retention**: D7/D30 cohorts
- **Market**: Geographic distribution

### 3. Product Decisions

- **Which platforms to prioritize?** See platform distribution
- **What free tier limit?** Check clips histogram
- **Where to expand?** Geographic data

---

## Performance

- **Load Time**: < 2s (with Supabase caching)
- **Update Frequency**: Hourly (materialized views)
- **Data Retention**: 90 days (raw events), 2 years (aggregations)

---

## Support

For issues or questions:
- GitHub Issues: [NotionClipper Analytics](https://github.com/yourusername/notionclipper/issues)
- Email: support@notionclipper.com

---

## License

UNLICENSED - Proprietary software

---

**Built with ❤️ using Apple × Notion design principles**
