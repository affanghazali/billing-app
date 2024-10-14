import { CustomerManager } from './services/customer/CustomerManager';
import { SubscriptionManager } from './services/subscription/SubscriptionManager';
import { InvoiceManager } from './services/billing/InvoiceManager';
import { BillingManager } from './services/billing/BillingManager';

export { CustomerManager, SubscriptionManager, InvoiceManager, BillingManager };

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Routing for customer-related requests
		if (url.pathname.startsWith('/customer')) {
			const customerObjectId = env.MY_CUSTOMER_DO.idFromName('customer-instance');
			const customerStub = env.MY_CUSTOMER_DO.get(customerObjectId);
			return customerStub.fetch(request);
		}

		// Routing for subscription-related requests
		if (
			url.pathname === '/create-subscription-plan' ||
			url.pathname === '/assign-subscription' ||
			url.pathname.startsWith('/subscription')
		) {
			const subscriptionObjectId = env.MY_SUBSCRIPTION_DO.idFromName('subscription-instance');
			const subscriptionStub = env.MY_SUBSCRIPTION_DO.get(subscriptionObjectId);
			return subscriptionStub.fetch(request);
		}

		// Routing for invoice-related requests
		if (url.pathname === '/create-invoice' || url.pathname.startsWith('/invoices')) {
			const invoiceObjectId = env.MY_INVOICE_DO.idFromName('invoice-instance');
			const invoiceStub = env.MY_INVOICE_DO.get(invoiceObjectId);
			return invoiceStub.fetch(request); // Correctly routed to InvoiceManager
		}

		// Routing for billing cycle-related requests
		if (url.pathname === '/create-billing-cycle' || url.pathname.startsWith('/billing-cycles')) {
			const billingObjectId = env.MY_BILLING_DO.idFromName('billing-instance');
			const billingStub = env.MY_BILLING_DO.get(billingObjectId);
			return billingStub.fetch(request); // Correctly routed to BillingManager
		}

		return new Response('Not found', { status: 404 });
	},
};
