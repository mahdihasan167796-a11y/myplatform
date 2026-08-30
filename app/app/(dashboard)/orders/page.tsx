import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getOrders } from "@/lib/dashboard-queries";
import { updateOrderStatus } from "../actions";
import { OrderStatus, UserRole } from "@prisma/client";

const TABS: { label: string; status: OrderStatus }[] = [
  { label: "Pending", status: OrderStatus.PENDING },
  { label: "Approved", status: OrderStatus.APPROVED },
  { label: "Ready to ship", status: OrderStatus.READY_TO_SHIP },
  { label: "In transit", status: OrderStatus.IN_TRANSIT },
  { label: "Delivered", status: OrderStatus.DELIVERED },
];

// The dropdown covers the full lifecycle, including the stages that don't
// get a top-level tab (FOLLOW_UP, SEND_TO_SUPPLIER, COMPLETED, RETURNED,
// CANCELLED) — tabs are a curated view, the status field itself isn't.
const STATUS_OPTIONS = Object.values(OrderStatus);

function formatStatusLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/app/login");

  const { status: requestedStatus } = await searchParams;
  const activeStatus = (Object.values(OrderStatus) as string[]).includes(requestedStatus ?? "")
    ? (requestedStatus as OrderStatus)
    : OrderStatus.PENDING;

  const orders = await getOrders(user, activeStatus);
  const showStoreColumn = user.role === UserRole.SUPER_ADMIN;

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-900">Orders</h1>

      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {TABS.map((tab) => (
          <Link
            key={tab.status}
            href={`/app/orders?status=${tab.status}`}
            className={
              activeStatus === tab.status
                ? "border-b-2 border-indigo-600 px-3 py-2 text-sm font-medium text-indigo-700"
                : "border-b-2 border-transparent px-3 py-2 text-sm text-slate-500 hover:text-slate-900"
            }
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Order</th>
              {showStoreColumn && <th className="px-4 py-3">Store</th>}
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.length === 0 && (
              <tr>
                <td colSpan={showStoreColumn ? 5 : 4} className="px-4 py-10 text-center text-sm text-slate-500">
                  No orders in this status yet.
                </td>
              </tr>
            )}
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{order.orderNumber}</td>
                {showStoreColumn && <td className="px-4 py-3 text-slate-600">{order.tenant.name}</td>}
                <td className="px-4 py-3">
                  <div className="text-slate-900">{order.customer.name}</div>
                  <div className="text-xs text-slate-500">{order.customer.phone}</div>
                </td>
                <td className="px-4 py-3 tabular-nums text-slate-900">{formatCurrency(Number(order.total))}</td>
                <td className="px-4 py-3">
                  <form action={updateOrderStatus.bind(null, order.id)} className="flex items-center gap-2">
                    <select
                      name="status"
                      defaultValue={order.status}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {formatStatusLabel(s)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded-md bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                    >
                      Update
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
