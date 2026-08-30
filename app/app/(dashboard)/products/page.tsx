import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getTenantProducts, getGlobalCatalog } from "@/lib/dashboard-queries";
import { importGlobalProduct } from "../actions";
import { ProductSource, UserRole, type User } from "@prisma/client";

const TABS = [
  { key: "published", label: "Published" },
  { key: "draft", label: "Draft" },
  { key: "catalog", label: "Global catalog" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/app/login");

  const { tab: requestedTab } = await searchParams;
  const activeTab: TabKey = TABS.some((t) => t.key === requestedTab) ? (requestedTab as TabKey) : "published";
  const showStoreColumn = user.role === UserRole.SUPER_ADMIN;

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-900">Products</h1>

      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/app/products?tab=${tab.key}`}
            className={
              activeTab === tab.key
                ? "border-b-2 border-indigo-600 px-3 py-2 text-sm font-medium text-indigo-700"
                : "border-b-2 border-transparent px-3 py-2 text-sm text-slate-500 hover:text-slate-900"
            }
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {activeTab === "catalog" ? (
        <GlobalCatalogTab canImport={!!user.tenantId} />
      ) : (
        <TenantProductsTab user={user} isActive={activeTab === "published"} showStoreColumn={showStoreColumn} />
      )}
    </div>
  );
}

async function TenantProductsTab({
  user,
  isActive,
  showStoreColumn,
}: {
  user: User;
  isActive: boolean;
  showStoreColumn: boolean;
}) {
  const products = await getTenantProducts(user, isActive);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Product</th>
            {showStoreColumn && <th className="px-4 py-3">Store</th>}
            <th className="px-4 py-3">Source</th>
            <th className="px-4 py-3">Price</th>
            <th className="px-4 py-3">Stock</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {products.length === 0 && (
            <tr>
              <td colSpan={showStoreColumn ? 5 : 4} className="px-4 py-10 text-center text-sm text-slate-500">
                {isActive ? "No published products yet." : "No drafts yet."}
              </td>
            </tr>
          )}
          {products.map((product) => (
            <tr key={product.id}>
              <td className="px-4 py-3 font-medium text-slate-900">{product.title}</td>
              {showStoreColumn && <td className="px-4 py-3 text-slate-600">{product.tenant.name}</td>}
              <td className="px-4 py-3">
                <span
                  className={
                    product.source === ProductSource.GLOBAL_CATALOG
                      ? "rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700"
                      : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                  }
                >
                  {product.source === ProductSource.GLOBAL_CATALOG ? "Global catalog" : "Own product"}
                </span>
              </td>
              <td className="px-4 py-3 tabular-nums text-slate-900">{formatCurrency(Number(product.price))}</td>
              <td className="px-4 py-3 tabular-nums text-slate-600">{product.stock ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function GlobalCatalogTab({ canImport }: { canImport: boolean }) {
  const globalProducts = await getGlobalCatalog();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {globalProducts.map((gp) => (
        <div key={gp.id} className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="font-medium text-slate-900">{gp.title}</p>
          <p className="mt-1 text-xs text-slate-500">{gp.supplier.name}</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-sm font-semibold text-slate-900">
              {formatCurrency(Number(gp.suggestedPrice ?? gp.basePrice))}
            </span>
            <span className="text-xs text-slate-400">suggested · cost {formatCurrency(Number(gp.basePrice))}</span>
          </div>
          {canImport ? (
            <form action={importGlobalProduct.bind(null, gp.id)} className="mt-3">
              <button
                type="submit"
                className="w-full rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
              >
                Import to my store
              </button>
            </form>
          ) : (
            <p className="mt-3 text-xs text-slate-400">Merchant accounts can import this product.</p>
          )}
        </div>
      ))}
    </div>
  );
}
