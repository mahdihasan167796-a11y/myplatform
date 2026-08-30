import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getFinancialReport, getPlatformMetrics } from "@/lib/dashboard-queries";
import { UserRole } from "@prisma/client";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/app/login");

  const report = await getFinancialReport(user);
  const platform = user.role === UserRole.SUPER_ADMIN ? await getPlatformMetrics() : null;

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Reports</h1>
      <p className="mb-6 text-sm text-slate-500">
        Based on orders that have actually reached Delivered or Completed — not orders still in progress.
      </p>

      <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Income vs. expense</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Income</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-600">{formatCurrency(report.income)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Supplier cost</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-red-600">{formatCurrency(report.expense)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Net profit</p>
            <p
              className={`mt-1 text-xl font-semibold tabular-nums ${
                report.profit >= 0 ? "text-slate-900" : "text-red-600"
              }`}
            >
              {formatCurrency(report.profit)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Margin</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{report.margin.toFixed(1)}%</p>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-400">{report.deliveredOrderCount} delivered/completed orders counted.</p>
      </div>

      {platform && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Platform metrics</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total stores</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{platform.totalTenants}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Active</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{platform.activeTenants}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">On trial</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{platform.trialTenants}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Live catalog products</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{platform.totalGlobalProducts}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
