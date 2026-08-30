import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { NavLinks } from "./NavLinks";
import { logout } from "../login/actions";
import { UserRole } from "@prisma/client";

const ALL_ROLES = [UserRole.SUPER_ADMIN, UserRole.MERCHANT_OWNER, UserRole.MERCHANT_STAFF];

// Role-gated nav. Purchases, Customers, and Accounts don't have a page.tsx
// yet — they'll 404 until built in a later phase. Preferences replaces what
// were two separate stubs ("Addons" + "Store preferences") now that Phase 5
// merged them into one page.
const NAV_ITEMS: { label: string; href: string; roles: UserRole[] }[] = [
  { label: "Overview", href: "/app", roles: ALL_ROLES },
  { label: "Orders", href: "/app/orders", roles: ALL_ROLES },
  { label: "Products", href: "/app/products", roles: ALL_ROLES },
  { label: "Purchases", href: "/app/purchases", roles: [UserRole.MERCHANT_OWNER, UserRole.MERCHANT_STAFF] },
  { label: "Customers", href: "/app/customers", roles: ALL_ROLES },
  { label: "Accounts", href: "/app/accounts", roles: ALL_ROLES },
  { label: "Reports", href: "/app/reports", roles: ALL_ROLES },
  { label: "Dropshipping", href: "/app/dropshipping", roles: [UserRole.SUPER_ADMIN] },
  { label: "Preferences", href: "/app/preferences", roles: [UserRole.MERCHANT_OWNER, UserRole.MERCHANT_STAFF] },
];

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/app/login");

  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role)).map(({ label, href }) => ({
    label,
    href,
  }));

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-60 flex-col border-r border-slate-200 bg-white">
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5">
          <div className="h-6 w-6 rounded-md bg-indigo-600" aria-hidden="true" />
          <span className="text-sm font-semibold text-slate-900">
            {user.role === UserRole.SUPER_ADMIN ? "Platform admin" : "Merchant dashboard"}
          </span>
        </div>

        <NavLinks items={items} />

        <div className="border-t border-slate-200 px-5 py-4">
          <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
          <p className="truncate text-xs text-slate-500">{user.email}</p>
          <form action={logout} className="mt-2">
            <button type="submit" className="text-xs font-medium text-slate-500 hover:text-indigo-700">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
