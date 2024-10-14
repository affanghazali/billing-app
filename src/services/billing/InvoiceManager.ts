import { DurableObjectState } from '@cloudflare/workers-types';
import { Invoice } from './billingTypes';
import { handleErrorResponse, handleSuccessResponse, checkCustomerExists } from '../../helper';

export class InvoiceManager {
	state: DurableObjectState;
	env: Env;

	constructor(state: DurableObjectState, env: Env) {
		this.state = state;
		this.env = env;
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === 'POST' && url.pathname === '/create-invoice') {
			try {
				const invoiceData = await request.json();
				const customerExists = await checkCustomerExists(this.env, invoiceData.customer_id);

				if (!customerExists) {
					return handleErrorResponse(new Error('Customer not found'));
				}

				return this.createInvoice(invoiceData);
			} catch (error) {
				return handleErrorResponse(error);
			}
		}

		if (request.method === 'GET' && url.pathname.startsWith('/invoices')) {
			const customerId = url.searchParams.get('customerId');
			if (customerId) {
				return this.getInvoicesForCustomer(customerId);
			}
			return handleErrorResponse(new Error('Customer ID is required'));
		}

		return handleErrorResponse(new Error('Not found'));
	}

	// Create a new invoice for a customer
	async createInvoice(invoiceData: Invoice): Promise<Response> {
		const invoices: Invoice[] = (await this.state.storage.get('invoices')) || [];
		invoices.push(invoiceData);
		await this.state.storage.put('invoices', invoices);

		return handleSuccessResponse(invoiceData, `Invoice created for customer ${invoiceData.customer_id}`, 201);
	}

	// Fetch all invoices for a customer
	async getInvoicesForCustomer(customerId: string): Promise<Response> {
		const invoices: Invoice[] = (await this.state.storage.get('invoices')) || [];
		const customerInvoices = invoices.filter((invoice) => invoice.customer_id === customerId);

		if (customerInvoices.length === 0) {
			return handleErrorResponse(new Error('No invoices found for this customer'));
		}

		return handleSuccessResponse(customerInvoices, 'Invoices retrieved');
	}
}
