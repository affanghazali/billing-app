import { DurableObjectState } from '@cloudflare/workers-types';
import { handleErrorResponse, handleSuccessResponse, sendEmail } from '../../helper';

export class PaymentManager {
	state: DurableObjectState;
	env: Env;

	constructor(state: DurableObjectState, env: Env) {
		this.state = state;
		this.env = env;
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === 'POST' && url.pathname === '/record-payment') {
			const { invoiceId, paymentAmount } = await request.json(); // Removed customerId
			return this.recordPayment(this.env, invoiceId, paymentAmount);
		}

		if (request.method === 'GET' && url.pathname === '/retry-failed-payments') {
			return this.retryFailedPayments(this.env);
		}

		return handleErrorResponse(new Error('Not found'));
	}

	async recordPayment(env: Env, invoiceId: string, paymentAmount: number): Promise<Response> {
		try {
			const invoiceObjectId = env.MY_INVOICE_DO.idFromName('invoice-instance');
			const invoiceStub = env.MY_INVOICE_DO.get(invoiceObjectId);

			const response = await invoiceStub.fetch('https://fake-url/invoices/all', { method: 'GET' });
			let invoices = [];

			if (response.ok) {
				const jsonResponse = await response.json();
				invoices = Array.isArray(jsonResponse.data) ? jsonResponse.data : [];
			}

			const invoice = invoices.find((inv: any) => inv.id === invoiceId);

			if (!invoice) {
				return handleErrorResponse(new Error(`Invoice with ID ${invoiceId} not found`));
			}

			if (paymentAmount >= invoice.amount_due) {
				invoice.status = 'paid';
				invoice.paid_at = new Date().toISOString();
				await this.notifyPaymentSuccess(invoice.customer_id, invoice);
			} else {
				await this.notifyPaymentFailure(invoice.customer_id, invoice);
				return handleErrorResponse(new Error('Payment amount is insufficient'));
			}

			const updateResponse = await invoiceStub.fetch('https://fake-url/invoices/update', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ data: invoices }),
			});

			if (!updateResponse.ok) {
				return handleErrorResponse(new Error('Failed to update invoice status'));
			}

			return handleSuccessResponse(invoice, `Payment recorded for invoice ${invoiceId}`);
		} catch (error) {
			return handleErrorResponse(error);
		}
	}

	async retryFailedPayments(env: Env): Promise<Response> {
		try {
			const invoiceObjectId = env.MY_INVOICE_DO.idFromName('invoice-instance');
			const invoiceStub = env.MY_INVOICE_DO.get(invoiceObjectId);

			const response = await invoiceStub.fetch('https://fake-url/invoices/all', { method: 'GET' });
			let invoices = [];

			if (response.ok) {
				const jsonResponse = await response.json();
				invoices = Array.isArray(jsonResponse.data) ? jsonResponse.data : [];
			}

			const failedInvoices = invoices.filter((inv: any) => inv.status === 'failed');

			for (const invoice of failedInvoices) {
				invoice.status = 'paid';
				invoice.paid_at = new Date().toISOString();
				await this.notifyPaymentSuccess(invoice.customer_id, invoice);
			}

			await invoiceStub.fetch('https://fake-url/invoices/update', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ data: invoices }),
			});

			return handleSuccessResponse(failedInvoices, `Retried payments for ${failedInvoices.length} invoices`);
		} catch (error) {
			return handleErrorResponse(error);
		}
	}

	async notifyPaymentSuccess(customerId: string, invoice: any): Promise<void> {
		const customerEmail = await this.getCustomerEmail(customerId);
		if (!customerEmail) {
			console.error(`Failed to send payment success notification: Customer ${customerId} does not have a valid email.`);
			return;
		}

		const subject = `Payment Success for Invoice #${invoice.id}`;
		const content = `Your payment of ${invoice.amount_due} has been successfully processed for invoice #${invoice.id}.`;
		await sendEmail(this.env, customerEmail, subject, content);
	}

	async notifyPaymentFailure(customerId: string, invoice: any): Promise<void> {
		const customerEmail = await this.getCustomerEmail(customerId);
		if (!customerEmail) {
			console.error(`Failed to send payment failure notification: Customer ${customerId} does not have a valid email.`);
			return;
		}

		const subject = `Payment Failed for Invoice #${invoice.id}`;
		const content = `Your payment for invoice #${invoice.id} has failed. Please try again.`;
		await sendEmail(this.env, customerEmail, subject, content);
	}

	async getCustomerEmail(customerId: string): Promise<string | null> {
		const customers = (await this.env.CUSTOMER_KV.get('customers', 'json')) || [];
		const customer = customers.find((c: any) => c.id === customerId);
		return customer ? customer.email : null;
	}
}
