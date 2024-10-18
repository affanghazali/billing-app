import { InvoiceManager } from '../services/billing/InvoiceManager';

export async function handleInvoiceRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
	const invoiceObjectId = env.MY_INVOICE_DO.idFromName('invoice-instance');
	const invoiceStub = env.MY_INVOICE_DO.get(invoiceObjectId);

	const url = new URL(request.url);
	const clonedRequest = request.clone();

	if (request.method === 'POST' && url.pathname === '/create-invoice') {
		console.log('here');
		const invoiceData = await clonedRequest.json();
		return invoiceStub.fetch(
			new Request('https://fake-url/create-invoice', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ data: invoiceData }),
			})
		);
	}

	if (request.method === 'GET' && url.pathname.startsWith('/invoices')) {
		const customerId = url.searchParams.get('customerId');
		return invoiceStub.fetch(new Request(`https://fake-url/invoices?customerId=${customerId}`, { method: 'GET' }));
	}

	if (request.method === 'POST' && url.pathname === '/update-invoice') {
		const updatedInvoice = await clonedRequest.json();
		return invoiceStub.fetch(
			new Request('https://fake-url/invoices/update', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ data: updatedInvoice }),
			})
		);
	}

	return new Response('Method not allowed', { status: 405 });
}
