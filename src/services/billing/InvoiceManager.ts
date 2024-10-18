import { DurableObjectState } from '@cloudflare/workers-types';
import { Invoice } from './billingTypes';
import { handleErrorResponse, handleSuccessResponse } from '../../helper';

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
			const invoiceData = await request.json();
			return this.createInvoice(this.env, invoiceData);
		}

		if (request.method === 'GET' && url.pathname.startsWith('/invoices')) {
			const customerId = url.searchParams.get('customerId');
			return customerId ? this.getInvoicesForCustomer(this.env, customerId) : this.getAllInvoices(this.env);
		}

		if (request.method === 'PUT' && url.pathname === '/invoices/update') {
			const updatedInvoice = await request.json();
			return this.updateInvoice(this.env, updatedInvoice);
		}

		return new Response('Not found', { status: 404 });
	}

	async createInvoice(env: Env, invoiceData: Invoice): Promise<Response> {
		try {
			const invoices: Invoice[] = (await this.state.storage.get('invoices')) || [];
			invoices.push(invoiceData);
			await this.state.storage.put('invoices', invoices);
			return handleSuccessResponse(invoiceData, 'Invoice created successfully', 201);
		} catch (error) {
			return handleErrorResponse(error);
		}
	}

	async getInvoicesForCustomer(env: Env, customerId: string): Promise<Response> {
		try {
			const invoices: Invoice[] = (await this.state.storage.get('invoices')) || [];
			const customerInvoices = invoices.filter((invoice) => invoice.customer_id === customerId);

			if (customerInvoices.length === 0) {
				return handleErrorResponse(new Error('No invoices found for this customer'));
			}

			return handleSuccessResponse(customerInvoices, 'Invoices retrieved');
		} catch (error) {
			return handleErrorResponse(error);
		}
	}

	async getAllInvoices(env: Env): Promise<Response> {
		try {
			const invoices: Invoice[] = (await this.state.storage.get('invoices')) || [];
			if (invoices.length === 0) {
				return handleErrorResponse(new Error('No invoices found'));
			}
			return handleSuccessResponse(invoices, 'All invoices retrieved');
		} catch (error) {
			return handleErrorResponse(error);
		}
	}

	async updateInvoice(env: Env, updatedInvoice: Invoice): Promise<Response> {
		try {
			const invoices: Invoice[] = (await this.state.storage.get('invoices')) || [];
			const index = invoices.findIndex((invoice) => invoice.id === updatedInvoice.id);

			if (index === -1) {
				return handleErrorResponse(new Error('Invoice not found'));
			}

			invoices[index] = updatedInvoice;
			await this.state.storage.put('invoices', invoices);
			return handleSuccessResponse(updatedInvoice, 'Invoice updated successfully');
		} catch (error) {
			return handleErrorResponse(error);
		}
	}
}
