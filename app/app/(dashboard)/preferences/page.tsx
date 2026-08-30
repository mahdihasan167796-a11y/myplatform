import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { updateStoreBranding, updateStoreAddons } from "./actions";
import { UserRole } from "@prisma/client";

export default async function PreferencesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/app/login");

  if (user.role === UserRole.SUPER_ADMIN || !user.tenantId) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm text-slate-600">
          Store preferences apply per-merchant — sign in as a merchant account to edit these.
        </p>
      </div>
    );
  }

  const [tenant, settings] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: user.tenantId } }),
    prisma.storeSetting.findUnique({ where: { tenantId: user.tenantId } }),
  ]);

  const metadata = (settings?.metadata as Record<string, unknown>) ?? {};

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-900">Store preferences</h1>

      <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">Branding</h2>
        <p className="mb-4 text-xs text-slate-500">Shown on your public storefront.</p>
        <form action={updateStoreBranding} className="space-y-4">
          <div>
            <label htmlFor="storeName" className="block text-xs font-medium text-slate-600">
              Store name
            </label>
            <input
              id="storeName"
              name="storeName"
              defaultValue={settings?.storeName ?? tenant?.name ?? ""}
              className="mt-1 w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="logoUrl" className="block text-xs font-medium text-slate-600">
              Logo URL
            </label>
            <input
              id="logoUrl"
              name="logoUrl"
              type="url"
              defaultValue={tenant?.logoUrl ?? ""}
              placeholder="https://…"
              className="mt-1 w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-slate-400">Paste a hosted image URL — direct file upload isn&rsquo;t wired up yet.</p>
          </div>
          <div>
            <label htmlFor="primaryColor" className="block text-xs font-medium text-slate-600">
              Primary color
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="primaryColor"
                name="primaryColor"
                defaultValue={settings?.primaryColor ?? ""}
                placeholder="#4F46E5"
                className="w-40 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              {settings?.primaryColor && (
                <span
                  className="h-8 w-8 rounded-md border border-slate-200"
                  style={{ backgroundColor: settings.primaryColor }}
                  aria-hidden="true"
                />
              )}
            </div>
          </div>
          <button
            type="submit"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Save branding
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">Addons</h2>
        <p className="mb-4 text-xs text-slate-500">Tracking codes stored for your storefront.</p>
        <form action={updateStoreAddons} className="space-y-4">
          <div>
            <label htmlFor="facebookPixelId" className="block text-xs font-medium text-slate-600">
              Facebook Pixel ID
            </label>
            <input
              id="facebookPixelId"
              name="facebookPixelId"
              defaultValue={typeof metadata.facebookPixelId === "string" ? metadata.facebookPixelId : ""}
              className="mt-1 w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="googleTagManagerId" className="block text-xs font-medium text-slate-600">
              Google Tag Manager ID
            </label>
            <input
              id="googleTagManagerId"
              name="googleTagManagerId"
              placeholder="GTM-XXXXXXX"
              defaultValue={typeof metadata.googleTagManagerId === "string" ? metadata.googleTagManagerId : ""}
              className="mt-1 w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Save addons
          </button>
        </form>
      </div>
    </div>
  );
}
