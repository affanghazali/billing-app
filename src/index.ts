import { handleCustomerRequest } from './controllers/CustomerController';
import { handleSubscriptionRequest } from './controllers/SubscriptionController';
import { handleBillingRequest } from './controllers/BillingController';
import { handlePaymentRequest } from './controllers/PaymentController';
import { handleInvoiceRequest } from './controllers/InvoiceController';
import { handleInvoiceGeneration } from './cron/BillingScheduler';
import { handleRetryFailedPayments } from './cron/PaymentScheduler';
import { handleScheduledEvent } from './cron/MainScheduler';
import { CustomerManager } from './services/customer/CustomerManager';
import { SubscriptionManager } from './services/subscription/SubscriptionManager';
import { InvoiceManager } from './services/billing/InvoiceManager';
import { BillingManager } from './services/billing/BillingManager';
import { PaymentManager } from './services/payment/PaymentManager';

export { CustomerManager, SubscriptionManager, InvoiceManager, BillingManager, PaymentManager };

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Delegate customer-related requests to CustomerController
		if (url.pathname === '/create-customer' || url.pathname.startsWith('/customer')) {
			return handleCustomerRequest(request, env, ctx);
		}

		// Delegate subscription-related requests to SubscriptionController
		if (
			url.pathname === '/create-subscription-plan' ||
			url.pathname === '/assign-subscription' ||
			url.pathname === '/change-subscription' ||
			url.pathname === '/get-plans' ||
			url.pathname === '/set-plans' ||
			url.pathname.startsWith('/subscription')
		) {
			return handleSubscriptionRequest(request, env, ctx);
		}

		// Delegate billing-related requests to BillingController
		if (url.pathname === '/create-billing-cycle' || url.pathname.startsWith('/billing-cycles')) {
			return handleBillingRequest(request, env, ctx);
		}

		// Delegate invoice-related requests to InvoiceController
		if (url.pathname === '/create-invoice' || url.pathname.startsWith('/invoices') || url.pathname === '/update-invoice') {
			return handleInvoiceRequest(request, env, ctx);
		}

		// Delegate payment-related requests to PaymentController
		if (url.pathname === '/record-payment' || url.pathname === '/retry-failed-payments') {
			return handlePaymentRequest(request, env, ctx);
		}

		// Manually trigger cron jobs for testing in local environment

		if (url.pathname === '/generate-customer-invoices-cron') {
			await handleInvoiceGeneration(env);
			return new Response('Cron job for generating invoices executed successfully', { status: 200 });
		}

		if (url.pathname === '/retry-failed-payments-cron') {
			await handleRetryFailedPayments(env);
			return new Response('Cron job for retrying failed payments executed successfully', { status: 200 });
		}

		return new Response('Not found', { status: 404 });
	},
};

// Handling scheduled events (cron jobs)
addEventListener('scheduled', (event) => {
	event.waitUntil(handleScheduledEvent(event.scheduledTime));
});
