import { DurableObjectState } from '@cloudflare/workers-types';
import { handleErrorResponse, handleSuccessResponse } from '../../helper';

export class PaymentManager {
	state: DurableObjectState;
	env: Env;

	constructor(state: DurableObjectState, env: Env) {
		this.state = state;
		this.env = env;
	}

	// Fetch method to handle requests
	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		// Record a successful payment
		if (request.method === 'POST' && url.pathname === '/record-payment') {
			const { invoiceId, paymentAmount } = await request.json(); // Removed customerId
			return this.recordPayment(this.env, invoiceId, paymentAmount);
		}

		// Retry failed payments
		if (request.method === 'GET' && url.pathname === '/retry-failed-payments') {
			return this.retryFailedPayments(this.env);
		}

		return handleErrorResponse(new Error('Not found'));
	}

	// Record a successful payment and update the corresponding invoice
	async recordPayment(env: Env, invoiceId: string, paymentAmount: number): Promise<Response> {
		try {
			const invoiceObjectId = env.MY_INVOICE_DO.idFromName('invoice-instance');
			const invoiceStub = env.MY_INVOICE_DO.get(invoiceObjectId);

			const response = await invoiceStub.fetch('https://fake-url/invoices/all', { method: 'GET' });

			let invoices = [];
			if (response.ok) {
				try {
					const jsonResponse = await response.json();
					console.log('Response:', jsonResponse);

					if (jsonResponse && Array.isArray(jsonResponse.data)) {
						invoices = jsonResponse.data;
					} else {
						console.log('Invoices are not in the expected format:', jsonResponse);
					}
					console.log('Fetched invoices:', invoices);
				} catch (error) {
					console.error('Failed to parse invoices response:', error);
					return handleErrorResponse(new Error('Error parsing invoice data'));
				}
			} else {
				console.error('Failed to fetch invoices:', await response.text());
				return handleErrorResponse(new Error('Failed to fetch invoices'));
			}

			const invoice = invoices.find((inv: any) => inv.id === invoiceId);
			console.log('Looking for invoiceId:', invoiceId);
			console.log('Found invoice:', invoice);

			if (!invoice) {
				return handleErrorResponse(new Error(`Invoice with ID ${invoiceId} not found`));
			}

			if (paymentAmount >= invoice.amount_due) {
				invoice.status = 'paid';
				invoice.paid_at = new Date().toISOString();
				console.log('Updated invoice:', invoice);
			} else {
				return handleErrorResponse(new Error('Payment amount is insufficient'));
			}

			const updateResponse = await invoiceStub.fetch('https://fake-url/invoices/update', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ data: invoices }),
			});

			if (!updateResponse.ok) {
				const errorText = await updateResponse.text();
				console.error('Failed to update invoices:', errorText);
				return handleErrorResponse(new Error('Failed to update invoice status'));
			}

			return handleSuccessResponse(invoice, `Payment recorded for invoice ${invoiceId}`);
		} catch (error) {
			return handleErrorResponse(error);
		}
	}

	// Retry failed payments
	async retryFailedPayments(env: Env): Promise<Response> {
		try {
			const invoiceObjectId = env.MY_INVOICE_DO.idFromName('invoice-instance');
			const invoiceStub = env.MY_INVOICE_DO.get(invoiceObjectId);

			const response = await invoiceStub.fetch('https://fake-url/invoices/all', { method: 'GET' });

			let invoices = [];
			if (response.ok) {
				try {
					const jsonResponse = await response.json();

					if (jsonResponse && Array.isArray(jsonResponse.data)) {
						invoices = jsonResponse.data;
					} else {
						console.log('Invoices are not in the expected format:', jsonResponse);
					}
					console.log('Fetched invoices:', invoices); // Log all invoices fetched
				} catch (error) {
					console.error('Failed to parse invoices response:', error);
					return handleErrorResponse(new Error('Error parsing invoice data'));
				}
			} else {
				console.error('Failed to fetch invoices:', await response.text());
				return handleErrorResponse(new Error('Failed to fetch invoices'));
			}

			const failedInvoices = invoices.filter((inv: any) => inv.status === 'failed');

			// Retry logic (simple retry mechanism)
			for (const invoice of failedInvoices) {
				console.log(`Retrying payment for invoice ${invoice.id}`);
				// Simulate a successful retry for failed invoices
				invoice.status = 'paid';
				invoice.paid_at = new Date().toISOString();
			}

			await invoiceStub.fetch(
				new Request('https://fake-url/invoices/update', {
					method: 'PUT',
					body: JSON.stringify(invoices),
				})
			);

			return handleSuccessResponse(failedInvoices, `Retried payments for ${failedInvoices.length} invoices`);
		} catch (error) {
			return handleErrorResponse(error);
		}
	}
}
