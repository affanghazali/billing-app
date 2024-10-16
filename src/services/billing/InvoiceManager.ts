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

		// Endpoint to fetch all invoices for a customer
		if (request.method === 'GET' && url.pathname.startsWith('/invoices')) {
			const customerId = url.searchParams.get('customerId');
			if (customerId) {
				return this.getInvoicesForCustomer(customerId);
			}

			// New route to get all invoices
			if (url.pathname === '/invoices/all') {
				return this.getAllInvoices(); // Fetch all invoices without filtering by customerId
			}
			return handleErrorResponse(new Error('Customer ID is required'));
		}

		// New route to update invoices
		if (request.method === 'PUT' && url.pathname === '/invoices/update') {
			try {
				const updatedInvoices = await request.json();
				return this.updateInvoices(updatedInvoices.data); // Expecting invoices in 'data' field
			} catch (error) {
				return handleErrorResponse(new Error('Invalid request body'));
			}
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

	// Fetch all invoices (new method)
	async getAllInvoices(): Promise<Response> {
		const invoices: Invoice[] = (await this.state.storage.get('invoices')) || [];

		if (invoices.length === 0) {
			return handleErrorResponse(new Error('No invoices found'));
		}

		return handleSuccessResponse(invoices, 'All invoices retrieved');
	}

	async updateInvoices(updatedInvoices: Invoice[]): Promise<Response> {
		if (!updatedInvoices || updatedInvoices.length === 0) {
			return handleErrorResponse(new Error('No invoices to update'));
		}

		const invoices: Invoice[] = (await this.state.storage.get('invoices')) || [];

		for (const updatedInvoice of updatedInvoices) {
			const index = invoices.findIndex((inv) => inv.id === updatedInvoice.id);
			if (index !== -1) {
				invoices[index] = updatedInvoice;
			}
		}

		await this.state.storage.put('invoices', invoices);

		return handleSuccessResponse(invoices, 'Invoices updated successfully');
	}
}
