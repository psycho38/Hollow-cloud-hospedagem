import { ReplitConnectors } from "@replit/connectors-sdk";

const PRO_PRICE_ID = "price_1UI8dlBokf6qe1DetqKO1ngd";
const connectors = new ReplitConnectors();

type StripeCheckoutSession = {
  id?: string;
  url?: string | null;
  error?: { message?: string };
};

export async function createProCheckoutSession({
  email,
  origin,
}: {
  email: string;
  origin: string;
}) {
  const params = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": PRO_PRICE_ID,
    "line_items[0][quantity]": "1",
    customer_email: email,
    success_url: `${origin}/plans?checkout=success`,
    cancel_url: `${origin}/plans?checkout=cancelled`,
    locale: "pt-BR",
    "tax_id_collection[enabled]": "true",
    allow_promotion_codes: "true",
  });

  const response = await connectors.proxy("stripe", "/v1/checkout/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const data = (await response.json()) as StripeCheckoutSession;

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Stripe checkout could not be created");
  }

  if (!data.id || !data.url) {
    throw new Error("Stripe returned an incomplete checkout session");
  }

  return { id: data.id, url: data.url };
}