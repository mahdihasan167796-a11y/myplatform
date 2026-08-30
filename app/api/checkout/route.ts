import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TenantStatus } from "@prisma/client";

// Flat per-zone courier rates. Worth moving into StoreSetting.courierSettings
// (already on the schema) once merchants need their own rates instead of a
// single platform-wide table.
const SHIPPING_FEES: Record<string, number> = {
  inside_dhaka: 70,
  outside_dhaka: 130,
};

export async function POST(req: NextRequest) {
  const tenantSubdomain = req.headers.get("x-tenant-subdomain");
  if (!tenantSubdomain) {
    return NextResponse.json({ error: "Missing store context" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { productId, quantity, name, phone, address, zone } = body;

  if (!productId || !name || !phone || !address || !zone) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (typeof zone !== "string" || !(zone in SHIPPING_FEES)) {
    return NextResponse.json({ error: "Invalid delivery zone" }, { status: 400 });
  }
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1) {
    return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { subdomain: tenantSubdomain } });
  if (!tenant || tenant.status === TenantStatus.SUSPENDED || tenant.status === TenantStatus.CANCELLED) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const product = await prisma.product.findFirst({
    where: { id: String(productId), tenantId: tenant.id, isActive: true },
  });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const customer = await prisma.customer.upsert({
    where: { tenantId_phone: { tenantId: tenant.id, phone: String(phone) } },
    update: { name: String(name), address: String(address) },
    create: {
      tenantId: tenant.id,
      name: String(name),
      phone: String(phone),
      address: String(address),
    },
  });

  const subtotal = Number(product.price) * qty;
  const shippingFee = SHIPPING_FEES[zone];
  const total = subtotal + shippingFee;

  // Sequential per-tenant order numbers via count() — simple, but two
  // checkouts landing in the same instant could in theory read the same
  // count before either commits. Fine for now; swap for a dedicated
  // counter/sequence before this sees real concurrent traffic.
  const existingOrders = await prisma.order.count({ where: { tenantId: tenant.id } });
  const orderNumber = String(1000 + existingOrders + 1);

  const order = await prisma.order.create({
    data: {
      tenantId: tenant.id,
      customerId: customer.id,
      orderNumber,
      subtotal,
      shippingFee,
      total,
      shippingAddress: String(address),
      shippingZone: zone,
      shippingPhone: String(phone),
      items: {
        create: {
          productId: product.id,
          quantity: qty,
          unitPrice: product.price,
          unitCost: product.costPrice,
        },
      },
    },
  });

  // Revenue isn't posted to the tenant's Account/Transaction ledger here on
  // purpose — an order can still be cancelled or returned. That posting
  // belongs as a side effect on the status transition to DELIVERED/COMPLETED
  // (natural next hook inside updateOrderStatus in Phase 3's actions.ts).

  return NextResponse.json({ orderNumber: order.orderNumber, total });
}
