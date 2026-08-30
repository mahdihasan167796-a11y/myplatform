import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getAllGlobalProducts, getSuppliers } from "@/lib/dashboard-queries";
import { createGlobalProduct, updateGlobalProductPricing, setGlobalProductActive } from "./actions";
import { UserRole } from "@prisma/client";

export default async function DropshippingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/app/login");

  if (user.role !== UserRole.SUPER_ADMIN) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm text-slate-600">The Dropshipping Hub is only available to Super Admin accounts.</p>
      </div>
    );
  }

  const [products, suppliers] = await Promise.all([getAllGlobalProducts(), getSuppliers()]);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Dropshipping hub</h1>
      <p className="mb-6 text-sm text-slate-500">Manage the shared supplier catalog every merchant imports from.</p>

      <div className="mb-8 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Add a catalog product</h2>
        {suppliers.length === 0 ? (
          <p className="text-sm text-slate-500">
            No suppliers yet — add one directly in the database before listing products here.
          </p>
        ) : (
          <form action={createGlobalProduct} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="title" className="block text-xs font-medium text-slate-600">
                Product title
              </label>
              <input
                id="title"
                name="title"
                required
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="supplierId" className="block text-xs font-medium text-slate-600">
                Supplier
              </label>
              <select
                id="supplierId"
                name="supplierId"
                required
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="category" className="block text-xs font-medium text-slate-600">
                Category
              </label>
              <input
                id="category"
                name="category"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="basePrice" className="block text-xs font-medium text-slate-600">
                Base wholesale price (৳)
              </label>
              <input
                id="basePrice"
                name="basePrice"
                type="number"
                min="0"
                step="0.01"
                required
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="suggestedPrice" className="block text-xs font-medium text-slate-600">
                Suggested retail price (৳)
              </label>
              <input
                id="suggestedPrice"
                name="suggestedPrice"
                type="number"
                min="0"
                step="0.01"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="sku" className="block text-xs font-medium text-slate-600">
                SKU
              </label>
              <input id="sku" name="sku" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label htmlFor="imageUrl" className="block text-xs font-medium text-slate-600">
                Image URL
              </label>
              <input
                id="imageUrl"
                name="imageUrl"
                type="url"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Add as draft
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Pricing (base / suggested)</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Marketplace</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                  No catalog products yet.
                </td>
              </tr>
            )}
            {products.map((product) => (
              <tr key={product.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{product.title}</td>
                <td className="px-4 py-3 text-slate-600">{product.supplier.name}</td>
                <td className="px-4 py-3">
                  <form
                    action={updateGlobalProductPricing.bind(null, product.id)}
                    className="flex items-center gap-1"
                  >
                    <input
                      name="basePrice"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={Number(product.basePrice)}
                      className="w-20 rounded-md border border-slate-300 px-2 py-1 text-xs"
                    />
                    <input
                      name="suggestedPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={product.suggestedPrice ? Number(product.suggestedPrice) : undefined}
                      className="w-20 rounded-md border border-slate-300 px-2 py-1 text-xs"
                    />
                    <button
                      type="submit"
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                    >
                      Save
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      product.isActive
                        ? "rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                        : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                    }
                  >
                    {product.isActive ? "Live" : "Draft"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <form action={setGlobalProductActive.bind(null, product.id, !product.isActive)}>
                    <button
                      type="submit"
                      className={
                        product.isActive
                          ? "rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                          : "rounded-md bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                      }
                    >
                      {product.isActive ? "Unpublish" : "Push live"}
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
