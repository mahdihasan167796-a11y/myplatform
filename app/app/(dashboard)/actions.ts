"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { OrderStatus, ProductSource, TransactionType, UserRole } from "@prisma/client";

// The two statuses at which an order's revenue is considered earned.
const REVENUE_STATUSES: OrderStatus[] = [OrderStatus.DELIVERED, OrderStatus.COMPLETED];

export async function updateOrderStatus(orderId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/app/login");

  const status = formData.get("status") as OrderStatus;
  if (!Object.values(OrderStatus).includes(status)) {
    throw new Error("Invalid status");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } } },
  });
  if (!order) throw new Error("Order not found");

  // Merchants can only touch their own tenant's orders; Super Admin can touch any.
  if (user.role !== UserRole.SUPER_ADMIN && order.tenantId !== user.tenantId) {
    throw new Error("Not authorized to update this order");
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status } });

    // Only post the ledger the moment an order FIRST reaches a revenue
    // status — not on every subsequent save while it stays there.
    const enteringRevenueState =
      REVENUE_STATUSES.includes(status) && !REVENUE_STATUSES.includes(order.status);
    if (!enteringRevenueState) return;

    // Idempotency guard — the real source of truth. Doesn't rely on the
    // status-transition check above being race-free; even if two updates
    // land close together, only one ORDER_CREDIT will ever exist per order.
    const alreadyPosted = await tx.transaction.findFirst({
      where: { orderId: order.id, type: TransactionType.ORDER_CREDIT },
    });
    if (alreadyPosted) return;

    const account = await tx.account.upsert({
      where: { tenantId: order.tenantId },
      update: {},
      create: { tenantId: order.tenantId, balance: 0 },
    });

    const orderTotal = Number(order.total);

    await tx.transaction.create({
      data: {
        accountId: account.id,
        orderId: order.id,
        type: TransactionType.ORDER_CREDIT,
        amount: orderTotal,
        note: `Order ${order.orderNumber} — revenue`,
      },
    });
    await tx.account.update({
      where: { id: account.id },
      data: { balance: { increment: orderTotal } },
    });

    // Cost of goods owed back to the platform, but only for items actually
    // sourced from the global catalog — a merchant's own OWN_PRODUCT items
    // don't owe the platform anything.
    const supplierCost = order.items
      .filter((item) => item.product.source === ProductSource.GLOBAL_CATALOG)
      .reduce((sum, item) => sum + Number(item.unitCost ?? 0) * item.quantity, 0);

    if (supplierCost > 0) {
      await tx.transaction.create({
        data: {
          accountId: account.id,
          orderId: order.id,
          type: TransactionType.SUPPLIER_COST,
          amount: supplierCost,
          note: `Order ${order.orderNumber} — supplier cost`,
        },
      });
      await tx.account.update({
        where: { id: account.id },
        data: { balance: { decrement: supplierCost } },
      });
    }
  });

  revalidatePath("/app/orders");
  revalidatePath("/app");
  revalidatePath("/app/accounts");
}

export async function importGlobalProduct(globalProductId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/app/login");
  if (!user.tenantId) throw new Error("Only merchant accounts can import products");

  const globalProduct = await prisma.globalProduct.findUnique({ where: { id: globalProductId } });
  if (!globalProduct) throw new Error("Global product not found");

  await prisma.product.create({
    data: {
      tenantId: user.tenantId,
      source: ProductSource.GLOBAL_CATALOG,
      globalProductId: globalProduct.id,
      title: globalProduct.title,
      description: globalProduct.description,
      images: globalProduct.images,
      price: globalProduct.suggestedPrice ?? globalProduct.basePrice,
      costPrice: globalProduct.basePrice,
      isActive: false, // lands as a draft — merchant reviews pricing before publishing
    },
  });

  revalidatePath("/app/products");
}

