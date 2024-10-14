import { DurableObjectState } from '@cloudflare/workers-types';
import { Invoice } from './billingTypes';

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

				const customerExists = await this.checkCustomerExists(invoiceData.customer_id);
				if (!customerExists) {
					return new Response('Customer not found', { status: 404 });
				}

				return this.createInvoice(invoiceData);
			} catch (err) {
				return new Response('Invalid request body', { status: 400 });
			}
		}

		if (request.method === 'GET' && url.pathname.startsWith('/invoices')) {
			const customerId = url.searchParams.get('customerId');
			if (customerId) {
				return this.getInvoicesForCustomer(customerId);
			}
			return new Response('Customer ID is required', { status: 400 });
		}

		return new Response('Not found', { status: 404 });
	}

	// Helper function to check if a customer exists in KV storage
	async checkCustomerExists(customerId: string): Promise<boolean> {
		const customers = (await this.env.CUSTOMER_KV.get('customers', 'json')) || [];

		// Add logging to check customer data
		console.log('Retrieved customers from KV:', customers);
		console.log('Looking for customerId:', customerId);

		return customers.some((customer: any) => customer.id === customerId);
	}

	// Create a new invoice for a customer
	async createInvoice(invoiceData: Invoice): Promise<Response> {
		const invoices: Invoice[] = (await this.state.storage.get('invoices')) || [];

		invoices.push(invoiceData);
		await this.state.storage.put('invoices', invoices);

		return new Response(`Invoice created for customer ${invoiceData.customer_id}`, { status: 201 });
	}

	// Fetch all invoices for a customer
	async getInvoicesForCustomer(customerId: string): Promise<Response> {
		const invoices: Invoice[] = (await this.state.storage.get('invoices')) || [];
		const customerInvoices = invoices.filter((invoice) => invoice.customer_id === customerId);

		if (customerInvoices.length === 0) {
			return new Response('No invoices found for this customer', { status: 404 });
		}

		return new Response(JSON.stringify(customerInvoices), { status: 200 });
	}
}
