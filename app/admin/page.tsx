import type { Metadata } from "next";
import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";
import { loadAdminAnalytics } from "@/lib/admin-analytics";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Analytics · The desk",
  robots: { index: false, follow: false },
};

export default async function AdminAnalyticsPage() {
  const data = await loadAdminAnalytics();
  return <AnalyticsDashboard data={data} />;
}
