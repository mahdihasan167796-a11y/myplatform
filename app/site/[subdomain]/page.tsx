import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TenantStatus } from "@prisma/client";
import { CheckoutModal } from "./CheckoutModal";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { subdomain },
    include: { settings: true },
  });

  if (!tenant || tenant.status === TenantStatus.SUSPENDED || tenant.status === TenantStatus.CANCELLED) {
    notFound();
  }

  const products = await prisma.product.findMany({
    where: { tenantId: tenant.id, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  const brandColor = tenant.settings?.primaryColor || "#4F46E5";
  const storeName = tenant.settings?.storeName || tenant.name;

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100 px-6 py-5">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          {tenant.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tenant.logoUrl} alt={storeName} className="h-9 w-9 rounded-md object-cover" />
          ) : (
            <div
              className="flex h-9 w-9 items-center justify-center rounded-md text-sm font-semibold text-white"
              style={{ backgroundColor: brandColor }}
            >
              {storeName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-lg font-semibold text-slate-900">{storeName}</span>
        </div>
      </header>

      {tenant.settings?.heroTitle && (
        <div className="px-6 py-10" style={{ backgroundColor: `${brandColor}0D` }}>
          <div className="mx-auto max-w-5xl">
            <h1 className="text-2xl font-semibold text-slate-900">{tenant.settings.heroTitle}</h1>
            {tenant.settings.heroSubtitle && <p className="mt-2 text-slate-600">{tenant.settings.heroSubtitle}</p>}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-5xl px-6 py-10">
        {products.length === 0 ? (
          <p className="text-center text-sm text-slate-500">No products available yet — check back soon.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div key={product.id} className="overflow-hidden rounded-lg border border-slate-200">
                <div className="aspect-square bg-slate-50">
                  {product.images[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.images[0]} alt={product.title} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="p-4">
                  <p className="font-medium text-slate-900">{product.title}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{formatCurrency(Number(product.price))}</p>
                  <CheckoutModal
                    productId={product.id}
                    productTitle={product.title}
                    productPrice={Number(product.price)}
                    brandColor={brandColor}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
