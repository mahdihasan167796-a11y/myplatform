import { PrismaClient, UserRole, TenantStatus, ProductSource } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Dev-only passwords — never seed real credentials like this outside local/dev environments.
const DEV_PASSWORD = "ChangeMe123!";

async function main() {
  // ---- Super Admin ----------------------------------------------------------
  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@myplatform.com" },
    update: {},
    create: {
      email: "admin@myplatform.com",
      passwordHash: await bcrypt.hash(DEV_PASSWORD, 10),
      name: "Platform Super Admin",
      role: UserRole.SUPER_ADMIN,
      tenantId: null,
    },
  });

  // ---- Supplier (platform-level, owned by Super Admin) ------------------------
  const supplier = await prisma.supplier.create({
    data: {
      name: "Shenzhen Gadget Co.",
      contactEmail: "sourcing@shenzhengadget.example",
      contactPhone: "+86 138 0000 0000",
      country: "China",
    },
  });

  // ---- Global catalog — the shared products tenants can import from -----------
  const [watchGP, earbudsGP, lampGP] = await Promise.all([
    prisma.globalProduct.create({
      data: {
        supplierId: supplier.id,
        title: "Smart Watch Pro X",
        description: "Fitness-tracking smartwatch with heart-rate monitor.",
        images: ["https://picsum.photos/seed/watch/600/600"],
        basePrice: 1200,
        suggestedPrice: 2500,
        sku: "GLB-WATCH-001",
        category: "Electronics",
      },
    }),
    prisma.globalProduct.create({
      data: {
        supplierId: supplier.id,
        title: "Wireless Earbuds S2",
        description: "Noise-cancelling wireless earbuds with charging case.",
        images: ["https://picsum.photos/seed/earbuds/600/600"],
        basePrice: 650,
        suggestedPrice: 1400,
        sku: "GLB-EARBUDS-002",
        category: "Electronics",
      },
    }),
    prisma.globalProduct.create({
      data: {
        supplierId: supplier.id,
        title: "LED Desk Lamp",
        description: "Dimmable LED desk lamp with USB charging port.",
        images: ["https://picsum.photos/seed/lamp/600/600"],
        basePrice: 450,
        suggestedPrice: 950,
        sku: "GLB-LAMP-003",
        category: "Home",
      },
    }),
  ]);

  // ---- Tenant 1 — mixes an imported product with one of its own ---------------
  const tenant1 = await prisma.tenant.create({
    data: {
      name: "Ihda Mart",
      subdomain: "ihdamart",
      status: TenantStatus.ACTIVE,
      account: { create: { balance: 0, currency: "BDT" } },
      settings: { create: { storeName: "Ihda Mart", primaryColor: "#1B2A4A" } },
      users: {
        create: {
          email: "owner@ihdamart.example",
          passwordHash: await bcrypt.hash(DEV_PASSWORD, 10),
          name: "Ihda Mart Owner",
          role: UserRole.MERCHANT_OWNER,
        },
      },
      products: {
        create: [
          {
            source: ProductSource.GLOBAL_CATALOG,
            globalProductId: watchGP.id,
            title: watchGP.title,
            images: watchGP.images,
            price: 2600,
            costPrice: watchGP.basePrice,
            sku: "IM-WATCH-001",
            stock: 25,
          },
          {
            source: ProductSource.OWN_PRODUCT,
            title: "Handmade Tote Bag",
            description: "Locally sourced canvas tote, made in-house.",
            images: ["https://picsum.photos/seed/tote/600/600"],
            price: 850,
            costPrice: 300,
            sku: "IM-OWN-001",
            stock: 15,
          },
        ],
      },
    },
  });

  // ---- Tenant 2 — a different slice of the same global catalog ----------------
  const tenant2 = await prisma.tenant.create({
    data: {
      name: "Daily Deals BD",
      subdomain: "dailydeals",
      status: TenantStatus.TRIAL,
      account: { create: { balance: 0, currency: "BDT" } },
      settings: { create: { storeName: "Daily Deals BD", primaryColor: "#D85A30" } },
      users: {
        create: {
          email: "owner@dailydeals.example",
          passwordHash: await bcrypt.hash(DEV_PASSWORD, 10),
          name: "Daily Deals Owner",
          role: UserRole.MERCHANT_OWNER,
        },
      },
      products: {
        create: [
          {
            source: ProductSource.GLOBAL_CATALOG,
            globalProductId: earbudsGP.id,
            title: earbudsGP.title,
            images: earbudsGP.images,
            price: 1500,
            costPrice: earbudsGP.basePrice,
            sku: "DD-EARBUDS-001",
            stock: 40,
          },
          {
            source: ProductSource.GLOBAL_CATALOG,
            globalProductId: lampGP.id,
            title: lampGP.title,
            images: lampGP.images,
            price: 999,
            costPrice: lampGP.basePrice,
            sku: "DD-LAMP-002",
            stock: 20,
          },
        ],
      },
    },
  });

  console.log("Seeded:", {
    superAdmin: superAdmin.email,
    supplier: supplier.name,
    globalProducts: [watchGP.sku, earbudsGP.sku, lampGP.sku],
    tenants: [tenant1.subdomain, tenant2.subdomain],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
