"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { UserRole } from "@prisma/client";

async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/app/login");
  if (user.role !== UserRole.SUPER_ADMIN) throw new Error("Super Admin access required");
  return user;
}

export async function createGlobalProduct(formData: FormData) {
  await requireSuperAdmin();

  const supplierId = String(formData.get("supplierId") || "");
  const title = String(formData.get("title") || "").trim();
  const basePrice = Number(formData.get("basePrice"));
  const suggestedPriceRaw = formData.get("suggestedPrice");
  const sku = String(formData.get("sku") || "").trim();
  const category = String(formData.get("category") || "").trim();
  const imageUrl = String(formData.get("imageUrl") || "").trim();

  if (!supplierId || !title || !Number.isFinite(basePrice) || basePrice <= 0) {
    throw new Error("Supplier, title, and a valid base price are required");
  }

  await prisma.globalProduct.create({
    data: {
      supplierId,
      title,
      basePrice,
      suggestedPrice: suggestedPriceRaw ? Number(suggestedPriceRaw) : null,
      sku: sku || null,
      category: category || null,
      images: imageUrl ? [imageUrl] : [],
      isActive: false, // starts as a draft — push live separately once it's ready
    },
  });

  revalidatePath("/app/dropshipping");
}

export async function updateGlobalProductPricing(globalProductId: string, formData: FormData) {
  await requireSuperAdmin();

  const basePrice = Number(formData.get("basePrice"));
  const suggestedPriceRaw = formData.get("suggestedPrice");

  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    throw new Error("Invalid base price");
  }

  await prisma.globalProduct.update({
    where: { id: globalProductId },
    data: {
      basePrice,
      suggestedPrice: suggestedPriceRaw ? Number(suggestedPriceRaw) : null,
    },
  });

  revalidatePath("/app/dropshipping");
}

export async function setGlobalProductActive(globalProductId: string, isActive: boolean) {
  await requireSuperAdmin();

  await prisma.globalProduct.update({
    where: { id: globalProductId },
    data: { isActive },
  });

  revalidatePath("/app/dropshipping");
  revalidatePath("/app/products"); // merchants' "Global catalog" tab reads this
}
