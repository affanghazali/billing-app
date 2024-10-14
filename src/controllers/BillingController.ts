import { InvoiceManager } from '../services/billing/InvoiceManager';
import { BillingManager } from '../services/billing/BillingManager';

export async function handleBillingRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
	const url = new URL(request.url);

	const invoiceManager = new InvoiceManager(env.MY_BILLING_DO, env);
	const billingManager = new BillingManager(env.MY_BILLING_DO, env);

	// Routes for invoices
	if (url.pathname === '/create-invoice' && request.method === 'POST') {
		const invoiceData = await request.json();
		return invoiceManager.createInvoice(invoiceData);
	}

	if (url.pathname.startsWith('/invoices') && request.method === 'GET') {
		const customerId = url.searchParams.get('customerId');
		return invoiceManager.getInvoicesForCustomer(customerId!);
	}

	// Routes for billing cycle
	if (url.pathname === '/create-billing-cycle' && request.method === 'POST') {
		const billingCycleData = await request.json();
		return billingManager.createBillingCycle(billingCycleData);
	}

	if (url.pathname.startsWith('/billing-cycles') && request.method === 'GET') {
		const customerId = url.searchParams.get('customerId');
		return billingManager.getBillingCyclesForCustomer(customerId!);
	}

	return new Response('Not found', { status: 404 });
}
