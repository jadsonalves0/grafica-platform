"use client";

export type OrderBillingMode = "PENDING" | "PAID";

export type OrderBillingResponse<TOrder> = {
  success: boolean;
  message?: string;
  data?: TOrder;
};

export async function billOrder<TOrder>(
  orderId: string,
  paymentStatus: OrderBillingMode,
) {
  const response = await fetch(`/api/orders/${orderId}/bill`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      paymentStatus,
    }),
  });

  const result = (await response.json()) as OrderBillingResponse<TOrder>;

  return {
    response,
    result,
  };
}
