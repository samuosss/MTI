import { apiClient } from "../apiClient";
import type { DashboardAnalytics } from "../apiTypes";

export async function getDashboardAnalytics(): Promise<DashboardAnalytics> {
  const { data } = await apiClient.get<DashboardAnalytics>("/api/dashboard/analytics");
  return data;
}
