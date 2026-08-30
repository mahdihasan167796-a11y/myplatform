"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

async function requireMerchant() {
  const user = await getCurrentUser();
  if (!user) redirect("/app/login");
  if (!user.tenantId) throw new Error("Store preferences are only available to merchant accounts");
  return user;
}

export async function updateStoreBranding(formData: FormData) {
  const user = await requireMerchant();
  const tenantId = user.tenantId!;

  const storeName = String(formData.get("storeName") || "").trim();
  const logoUrl = String(formData.get("logoUrl") || "").trim();
  const primaryColor = String(formData.get("primaryColor") || "").trim();

  await prisma.$transaction([
    prisma.tenant.update({
      where: { id: tenantId },
      data: { logoUrl: logoUrl || null },
    }),
    prisma.storeSetting.upsert({
      where: { tenantId },
      update: { storeName: storeName || null, primaryColor: primaryColor || null },
      create: { tenantId, storeName: storeName || null, primaryColor: primaryColor || null },
    }),
  ]);

  revalidatePath("/app/preferences");
  revalidatePath("/site");
}

export async function updateStoreAddons(formData: FormData) {
  const user = await requireMerchant();
  const tenantId = user.tenantId!;

  const facebookPixelId = String(formData.get("facebookPixelId") || "").trim();
  const googleTagManagerId = String(formData.get("googleTagManagerId") || "").trim();

  // Merge into existing metadata rather than overwrite it outright, so this
  // stays safe once other keys start living in the same JSON blob.
  const existing = await prisma.storeSetting.findUnique({ where: { tenantId } });
  const existingMetadata = (existing?.metadata as Record<string, unknown>) ?? {};

  await prisma.storeSetting.upsert({
    where: { tenantId },
    update: {
      metadata: {
        ...existingMetadata,
        facebookPixelId: facebookPixelId || null,
        googleTagManagerId: googleTagManagerId || null,
      },
    },
    create: {
      tenantId,
      metadata: { facebookPixelId: facebookPixelId || null, googleTagManagerId: googleTagManagerId || null },
    },
  });

  revalidatePath("/app/preferences");
}
