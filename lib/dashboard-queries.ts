import { prisma } from "@/lib/prisma";
import { OrderStatus, TenantStatus, TransactionType, UserRole, type User } from "@prisma/client";

/**
 * Super Admin sees every tenant; everyone else is scoped to their own.
 * Throws if a non-super-admin user somehow has no tenantId — that's a data
 * integrity problem, not something to silently paper over.
 */
function tenantFilter(user: User) {
  if (user.role === UserRole.SUPER_ADMIN) return {};
  if (!user.tenantId) throw new Error("Merchant user is missing a tenantId");
  return { tenantId: user.tenantId };
}

export async function getDashboardMetrics(user: User) {
  const where = tenantFilter(user);

  const [totalOrders, completedOrders, accounts] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where: { ...where, status: { in: [OrderStatus.DELIVERED, OrderStatus.COMPLETED] } },
      include: { items: true },
    }),
    user.role === UserRole.SUPER_ADMIN
      ? prisma.account.findMany()
      : prisma.account.findMany({ where: { tenantId: user.tenantId! } }),
  ]);

  const totalSales = completedOrders.reduce((sum, o) => sum + Number(o.total), 0);

  const profit = completedOrders.reduce(
    (sum, o) =>
      sum +
      o.items.reduce(
        (itemSum, item) => itemSum + (Number(item.unitPrice) - Number(item.unitCost ?? 0)) * item.quantity,
        0
      ),
    0
  );

  const cashBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);

  return { totalSales, totalOrders, profit, cashBalance };
}

export async function getOrders(user: User, status?: OrderStatus) {
  const where = { ...tenantFilter(user), ...(status ? { status } : {}) };

  return prisma.order.findMany({
    where,
    include: { customer: true, tenant: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getTenantProducts(user: User, isActive: boolean) {
  const where = { ...tenantFilter(user), isActive };

  return prisma.product.findMany({
    where,
    include: { tenant: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getGlobalCatalog() {
  return prisma.globalProduct.findMany({
    where: { isActive: true },
    include: { supplier: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

// Admin-facing — unlike getGlobalCatalog(), this includes drafts (isActive:
// false) so Super Admin can see what's staged before pushing it live.
export async function getAllGlobalProducts() {
  return prisma.globalProduct.findMany({
    include: { supplier: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSuppliers() {
  return prisma.supplier.findMany({ orderBy: { name: "asc" } });
}

/**
 * Income/expense pulled straight from the ledger rather than re-derived
 * from Order/OrderItem — since updateOrderStatus only ever posts
 * ORDER_CREDIT/SUPPLIER_COST once an order hits DELIVERED or COMPLETED,
 * this is automatically scoped to "delivered orders" with no extra filter.
 */
export async function getFinancialReport(user: User) {
  const where = tenantFilter(user);
  const accounts = await prisma.account.findMany({ where, select: { id: true } });
  const accountIds = accounts.map((a) => a.id);

  const transactions = await prisma.transaction.findMany({
    where: { accountId: { in: accountIds } },
  });

  const income = transactions
    .filter((t) => t.type === TransactionType.ORDER_CREDIT)
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const expense = transactions
    .filter((t) => t.type === TransactionType.SUPPLIER_COST)
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const profit = income - expense;
  const margin = income > 0 ? (profit / income) * 100 : 0;

  const deliveredOrderCount = await prisma.order.count({
    where: { ...where, status: { in: [OrderStatus.DELIVERED, OrderStatus.COMPLETED] } },
  });

  return { income, expense, profit, margin, deliveredOrderCount };
}

export async function getPlatformMetrics() {
  const [totalTenants, activeTenants, trialTenants, totalGlobalProducts] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: TenantStatus.ACTIVE } }),
    prisma.tenant.count({ where: { status: TenantStatus.TRIAL } }),
    prisma.globalProduct.count({ where: { isActive: true } }),
  ]);

  return { totalTenants, activeTenants, trialTenants, totalGlobalProducts };
}
