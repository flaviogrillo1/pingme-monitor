import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!;

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-04-10',
  typescript: true,
});

export { publishableKey };

export const getPriceIds = () => ({
  proMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
  proYearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID!,
});
