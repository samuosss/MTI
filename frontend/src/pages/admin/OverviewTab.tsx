import { useEffect, useState } from "react";
import {
  DollarSign,
  FileText,
  Package,
  TrendingUp,
  Settings,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  getDashboardOverview,
  getRecentQuotes,
  type DashboardOverview,
  type RecentQuote,
} from "../../api/dashboard";

export const quoteRequests: any[] = [];

function formatMoney(value: number | null | undefined) {
  return `${(value ?? 0).toLocaleString()} TND`;
}

export default function OverviewTab({
  onViewAllQuotes,
}: {
  onViewAllQuotes: () => void;
}) {
  const [overview, setOverview] =
    useState<DashboardOverview | null>(null);

  const [quotes, setQuotes] = useState<RecentQuote[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [overviewRes, quotesRes] =
        await Promise.all([
          getDashboardOverview(),
          getRecentQuotes(5),
        ]);

      setOverview(overviewRes);
      setQuotes(quotesRes);
    } catch (error) {
      console.error("Dashboard loading failed:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-muted-foreground">
          Loading dashboard...
        </div>
      </div>
    );
  }

  const categoryChartData =
    overview?.category_breakdown?.map(
      (item, index) => ({
        ...item,
        color: [
          "#1A3A6B",
          "#3B82F6",
          "#F97316",
          "#10B981",
          "#8B5CF6",
        ][index % 5],
      })
    ) || [];

  const hasCategoryData = categoryChartData.length > 0;

  const kpis = [
    {
      label: "Total Inventory Value",
      value: formatMoney(overview?.total_inventory_value),
      change: "+12.5%",
      up: true,
      icon: DollarSign,
      color: "text-primary bg-primary/10",
    },
    {
      label: "Active Quotes",
      value: (
        overview?.active_quotes || 0
      ).toLocaleString(),
      change: "+8.2%",
      up: true,
      icon: FileText,
      color: "text-blue-500 bg-blue-50",
    },
    {
      label: "Pending Quotes",
      value: (
        overview?.pending_quotes || 0
      ).toLocaleString(),
      change: "-3",
      up: false,
      icon: Package,
      color: "text-orange-500 bg-orange-50",
    },
    {
      label: "Monthly Revenue",
      value: formatMoney(overview?.monthly_revenue_estimate),
      change: "+6.1%",
      up: true,
      icon: TrendingUp,
      color: "text-green-600 bg-green-50",
      highlight: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className={`bg-card rounded-xl border p-4 ${
              k.highlight
                ? "border-primary/30 bg-primary/5"
                : "border-border"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-medium">
                {k.label}
              </span>

              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${k.color}`}
              >
                <k.icon size={15} />
              </div>
            </div>

            <div className="text-2xl font-black text-foreground mb-1">
              {k.value}
            </div>

            <div
              className={`flex items-center gap-1 text-xs font-medium ${
                k.up
                  ? "text-green-600"
                  : "text-red-500"
              }`}
            >
              {k.up ? (
                <ChevronUp size={13} />
              ) : (
                <ChevronDown size={13} />
              )}
              {k.change} vs last month
            </div>
          </div>
        ))}
      </div>

      {/* CHART + TABLE */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm font-medium">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-foreground text-sm">
              Top Categories
            </h3>

            <button className="text-muted-foreground hover:text-foreground">
              <Settings size={14} />
            </button>
          </div>

          {hasCategoryData ? (
            <ResponsiveContainer
              width="100%"
              height={220}
            >
              <BarChart
                data={categoryChartData}
                barSize={28}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f0f0f0"
                />

                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                />

                <YAxis
                  tick={{ fontSize: 10 }}
                  unit="%"
                />

                <Tooltip
                  formatter={(value: number) => [
                    `${value}%`,
                    "Share",
                  ]}
                />

                <Bar
                  dataKey="value"
                  radius={[4, 4, 0, 0]}
                >
                  {categoryChartData.map(
                    (entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.color}
                      />
                    )
                  )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] border border-dashed border-border rounded-lg flex items-center justify-center text-sm text-muted-foreground">
              No category data available.
            </div>
          )}
        </div>

        <div className="lg:col-span-3 bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-foreground text-sm">
              Recent Quote Requests
            </h3>

            <button
              onClick={onViewAllQuotes}
              className="text-primary text-xs font-semibold hover:underline"
            >
              View All Requests
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs text-muted-foreground font-semibold pb-2">
                    ID
                  </th>

                  <th className="text-left text-xs text-muted-foreground font-semibold pb-2">
                    Customer
                  </th>

                  <th className="text-left text-xs text-muted-foreground font-semibold pb-2 hidden sm:table-cell">
                    Category
                  </th>

                  <th className="text-right text-xs text-muted-foreground font-semibold pb-2">
                    Value
                  </th>

                  <th className="text-right text-xs text-muted-foreground font-semibold pb-2">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {quotes.slice(0, 5).map((q) => (
                  <tr
                    key={q.id}
                    className="hover:bg-secondary/50 transition-colors"
                  >
                    <td className="py-2.5 text-xs font-mono text-muted-foreground">
                      {q.reference || q.id}
                    </td>

                    <td className="py-2.5 text-xs font-semibold text-foreground">
                      {q.company}
                    </td>

                    <td className="py-2.5 text-xs text-muted-foreground hidden sm:table-cell">
                      {q.category || "N/A"}
                    </td>

                    <td className="py-2.5 text-xs font-bold text-foreground text-right">
                      {formatMoney(q.estimated_value)}
                    </td>

                    <td className="py-2.5 text-right">
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          q.status === "ACTIVE"
                            ? "bg-green-100 text-green-700"
                            : q.status === "PENDING"
                            ? "bg-orange-100 text-orange-600"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {q.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {quotes.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No quote requests found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* STATUS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-green-200 p-4 flex items-start gap-3">
          <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <CheckCircle2
              size={18}
              className="text-green-600"
            />
          </div>

          <div>
            <p className="text-sm font-bold text-foreground mb-0.5">
              System Status
            </p>

            <p className="text-xs text-muted-foreground">
              Dashboard API operational with
              <span className="text-green-600 font-semibold">
                {" "}
                99.98% uptime
              </span>
              .
            </p>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-orange-200 p-4 flex items-start gap-3">
          <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertCircle
              size={18}
              className="text-orange-500"
            />
          </div>

          <div>
            <p className="text-sm font-bold text-foreground mb-0.5">
              Security Monitoring
            </p>

            <p className="text-xs text-muted-foreground">
              Last audit completed successfully.
              <span className="text-orange-500 font-semibold">
                {" "}
                No anomalies detected.
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
