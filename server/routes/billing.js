import express from 'express';
import Stripe from 'stripe';
import { dbUtils } from '../lib/mongodb.js';
import { ObjectId } from 'mongodb';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

// Create subscription
router.post('/create-subscription', async (req, res) => {
  try {
    const { tenantId, planId, paymentMethodId } = req.body;

    const tenant = await dbUtils.getCollection('tenants').findOne({ 
      _id: new ObjectId(tenantId) 
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Create or get Stripe customer
    let customer;
    if (tenant.stripe_customer_id) {
      customer = await stripe.customers.retrieve(tenant.stripe_customer_id);
    } else {
      customer = await stripe.customers.create({
        email: tenant.email,
        name: tenant.name,
        metadata: {
          tenant_id: tenantId
        }
      });

      // Update tenant with Stripe customer ID
      await dbUtils.getCollection('tenants').updateOne(
        { _id: new ObjectId(tenantId) },
        { $set: { stripe_customer_id: customer.id } }
      );
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customer.id,
    });

    // Set as default payment method
    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: planId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    // Update tenant with subscription info
    await dbUtils.getCollection('tenants').updateOne(
      { _id: new ObjectId(tenantId) },
      { 
        $set: { 
          stripe_subscription_id: subscription.id,
          plan: subscription.items.data[0].price.id,
          subscription_status: subscription.status
        } 
      }
    );

    res.json({
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
    });

  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// Get subscription status
router.get('/subscription/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;

    const tenant = await dbUtils.getCollection('tenants').findOne({ 
      _id: new ObjectId(tenantId) 
    });

    if (!tenant || !tenant.stripe_subscription_id) {
      return res.json({ subscription: null });
    }

    const subscription = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id);

    res.json({ subscription });

  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// Cancel subscription
router.post('/cancel-subscription/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;

    const tenant = await dbUtils.getCollection('tenants').findOne({ 
      _id: new ObjectId(tenantId) 
    });

    if (!tenant || !tenant.stripe_subscription_id) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const subscription = await stripe.subscriptions.update(tenant.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    // Update tenant status
    await dbUtils.getCollection('tenants').updateOne(
      { _id: new ObjectId(tenantId) },
      { $set: { subscription_status: 'canceled' } }
    );

    res.json({ subscription });

  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Get billing portal URL
router.post('/billing-portal/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;

    const tenant = await dbUtils.getCollection('tenants').findOne({ 
      _id: new ObjectId(tenantId) 
    });

    if (!tenant || !tenant.stripe_customer_id) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: tenant.stripe_customer_id,
      return_url: `https://${tenant.subdomain}.vetvault.in/settings/billing`,
    });

    res.json({ url: session.url });

  } catch (error) {
    console.error('Error creating billing portal session:', error);
    res.status(500).json({ error: 'Failed to create billing portal session' });
  }
});

export default router; 