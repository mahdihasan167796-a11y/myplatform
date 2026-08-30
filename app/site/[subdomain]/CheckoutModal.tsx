"use client";

import { useState, type FormEvent } from "react";

const ZONES = [
  { value: "inside_dhaka", label: "Inside Dhaka" },
  { value: "outside_dhaka", label: "Outside Dhaka" },
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(amount);
}

type Props = {
  productId: string;
  productTitle: string;
  productPrice: number;
  brandColor: string;
};

export function CheckoutModal({ productId, productTitle, productPrice, brandColor }: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmedOrderNumber, setConfirmedOrderNumber] = useState("");
  const [quantity, setQuantity] = useState(1);

  function closeAndReset() {
    setOpen(false);
    setStatus("idle");
    setErrorMessage("");
    setQuantity(1);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    const formData = new FormData(e.currentTarget);

    try {
      // Relative URL — this hits the SAME host the shopper is on
      // (store1.myplatform.com/api/checkout), so middleware tags it with
      // x-tenant-subdomain automatically. No need to send the store here.
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          quantity,
          name: formData.get("name"),
          phone: formData.get("phone"),
          address: formData.get("address"),
          zone: formData.get("zone"),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error || "Something went wrong. Please try again.");
        return;
      }

      setConfirmedOrderNumber(data.orderNumber);
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMessage("Couldn't reach the store. Check your connection and try again.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 w-full rounded-md px-3 py-2 text-sm font-medium text-white"
        style={{ backgroundColor: brandColor }}
      >
        Order now
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6">
            {status === "success" ? (
              <div className="py-6 text-center">
                <p className="text-lg font-semibold text-slate-900">Order placed</p>
                <p className="mt-2 text-sm text-slate-600">
                  Order #{confirmedOrderNumber} is confirmed. We&rsquo;ll call to verify before it ships.
                </p>
                <button
                  type="button"
                  onClick={closeAndReset}
                  className="mt-5 rounded-md px-4 py-2 text-sm font-medium text-white"
                  style={{ backgroundColor: brandColor }}
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{productTitle}</p>
                    <p className="text-sm text-slate-500">Cash on delivery</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeAndReset}
                    aria-label="Close"
                    className="text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>

                {status === "error" && (
                  <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
                )}

                <div className="space-y-3">
                  <div>
                    <label htmlFor="name" className="block text-xs font-medium text-slate-600">
                      Full name
                    </label>
                    <input
                      id="name"
                      name="name"
                      required
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-xs font-medium text-slate-600">
                      Phone number
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="address" className="block text-xs font-medium text-slate-600">
                      Full address
                    </label>
                    <textarea
                      id="address"
                      name="address"
                      required
                      rows={2}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="zone" className="block text-xs font-medium text-slate-600">
                      Delivery zone
                    </label>
                    <select
                      id="zone"
                      name="zone"
                      required
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      {ZONES.map((z) => (
                        <option key={z.value} value={z.value}>
                          {z.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="quantity" className="block text-xs font-medium text-slate-600">
                      Quantity
                    </label>
                    <input
                      id="quantity"
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(productPrice * quantity)}</span>
                </div>

                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="mt-4 w-full rounded-md px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                  style={{ backgroundColor: brandColor }}
                >
                  {status === "submitting" ? "Placing order…" : "Place order"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
