import { CustomerManager } from './services/customer/CustomerManager';
import { SubscriptionManager } from './services/subscription/SubscriptionManager';
import { InvoiceManager } from './services/billing/InvoiceManager';
import { BillingManager } from './services/billing/BillingManager';
import { PaymentManager } from './services/payment/PaymentManager';
import { handleInvoiceGeneration } from './cron/BillingScheduler';
import { handleRetryFailedPayments } from './cron/PaymentScheduler';
import { handleScheduledEvent } from './cron/MainScheduler';

export { CustomerManager, SubscriptionManager, InvoiceManager, BillingManager, PaymentManager };

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
			url.pathname === '/change-subscription' ||
			url.pathname === '/get-plans' ||
			url.pathname === '/set-plans' ||
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

		if (url.pathname === '/record-payment' || url.pathname === '/retry-failed-payments') {
			const paymentObjectId = env.MY_PAYMENT_DO.idFromName('payment-instance');
			const paymentStub = env.MY_PAYMENT_DO.get(paymentObjectId);
			return paymentStub.fetch(request);
		}

		// Manually trigger the cron logic for testing in local env
		if (url.pathname === '/generate-customer-invoices-cron') {
			await handleInvoiceGeneration(env);
			return new Response('generate-customer-invoices-cron job executed successfully', { status: 200 });
		}

		if (url.pathname === 'retry-failed-payments-cron') {
			await handleRetryFailedPayments(env);
			return new Response('retry-failed-payments-cron job executed successfully', { status: 200 });
		}

		return new Response('Not found', { status: 404 });
	},
};

// Handling scheduled events (cron jobs)
addEventListener('scheduled', (event) => {
	event.waitUntil(handleScheduledEvent(event.scheduledTime));
});
