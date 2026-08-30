import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getDashboardMetrics } from "@/lib/dashboard-queries";
import { UserRole } from "@prisma/client";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function DashboardOverviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/app/login");

  const metrics = await getDashboardMetrics(user);
  const isProfit = metrics.profit >= 0;

  const cards: { label: string; value: string; tone: "neutral" | "positive" | "negative" }[] = [
    { label: "Total sales", value: formatCurrency(metrics.totalSales), tone: "neutral" },
    { label: "Total orders", value: metrics.totalOrders.toLocaleString(), tone: "neutral" },
    {
      label: isProfit ? "Profit" : "Loss",
      value: formatCurrency(Math.abs(metrics.profit)),
      tone: isProfit ? "positive" : "negative",
    },
    { label: "Cash balance", value: formatCurrency(metrics.cashBalance), tone: "neutral" },
  ];

  const toneClass: Record<string, string> = {
    positive: "text-emerald-600",
    negative: "text-red-600",
    neutral: "text-slate-900",
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">
          {user.role === UserRole.SUPER_ADMIN ? "Platform overview" : "Overview"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {user.role === UserRole.SUPER_ADMIN
            ? "Aggregated across every store on the platform, all-time."
            : "Your store's performance at a glance, all-time."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className={`mt-2 text-2xl font-semibold tabular-nums ${toneClass[card.tone]}`}>{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
