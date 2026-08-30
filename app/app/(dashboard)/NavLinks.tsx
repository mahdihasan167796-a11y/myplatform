"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { label: string; href: string };

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-0.5 px-3 py-4">
      {items.map((item) => {
        const isActive = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              isActive
                ? "block rounded-md border-l-2 border-indigo-600 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700"
                : "block rounded-md border-l-2 border-transparent px-3 py-2 text-sm text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
