import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/db/stripe';
import { supabaseAdmin } from '@/lib/db/supabase';

export async function POST(request: NextRequest) {
  try {
    // Verify this is a webhook
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 401 });
    }

    const body = await request.text();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
    let event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const userId = session.metadata?.supabase_user_id;
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        if (userId) {
          // Get subscription details
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = subscription.items.data[0].price.id;

          // Determine plan from price
          const priceIds = getPriceIds();
          let plan = 'FREE';
          if (priceId === priceIds.proMonthly || priceId === priceIds.proYearly) {
            plan = 'PRO';
          }

          await supabaseAdmin
            .from('subscription_state')
            .upsert({
              user_id: userId,
              plan,
              status: 'active',
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const customerId = subscription.customer as string;

        // Get user from Stripe customer
        const customer = await stripe.customers.retrieve(customerId);
        const userId = (customer as any).metadata?.supabase_user_id;

        if (userId) {
          await supabaseAdmin
            .from('subscription_state')
            .update({
              status: subscription.status,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq('user_id', userId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const customerId = subscription.customer as string;

        // Get user from Stripe customer
        const customer = await stripe.customers.retrieve(customerId);
        const userId = (customer as any).metadata?.supabase_user_id;

        if (userId) {
          await supabaseAdmin
            .from('subscription_state')
            .update({
              plan: 'FREE',
              status: 'canceled',
              stripe_subscription_id: null,
            })
            .eq('user_id', userId);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

function getPriceIds() {
  return {
    proMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
    proYearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID!,
  };
}
