import { DurableObjectState } from '@cloudflare/workers-types';
import { Customer } from './customerTypes';

export class CustomerManager {
	state: DurableObjectState;
	env: Env;

	constructor(state: DurableObjectState, env: Env) {
		this.state = state;
		this.env = env;
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === 'POST' && url.pathname === '/customer') {
			const data = await request.json();
			return this.createCustomer(data);
		}

		if (request.method === 'GET' && url.pathname.startsWith('/customer')) {
			const customerId = url.searchParams.get('customerId');
			if (customerId) {
				return this.getCustomer(customerId);
			}
			return this.listCustomers();
		}

		return new Response('Not found', { status: 404 });
	}

	// Create a new customer and store it in KV
	async createCustomer(data: { id: string; name: string; email: string }): Promise<Response> {
		const customers: Customer[] = (await this.env.CUSTOMER_KV.get('customers', 'json')) || [];

		const existingCustomer = customers.find((c) => c.email === data.email);
		if (existingCustomer) {
			return new Response('Customer with this email already exists', { status: 400 });
		}

		const newCustomer: Customer = {
			id: data.id,
			name: data.name,
			email: data.email,
			subscription_plan_id: null,
			subscription_status: 'cancelled',
		};

		customers.push(newCustomer);
		await this.env.CUSTOMER_KV.put('customers', JSON.stringify(customers));

		return new Response(`Customer ${data.name} created successfully`, { status: 201 });
	}

	// Fetch a specific customer from KV
	async getCustomer(customerId: string): Promise<Response> {
		const customers: Customer[] = (await this.env.CUSTOMER_KV.get('customers', 'json')) || [];

		const customer = customers.find((c) => c.id === customerId);
		if (!customer) {
			return new Response('Customer not found', { status: 404 });
		}
		return new Response(JSON.stringify(customer), { status: 200 });
	}

	// List all customers from KV
	async listCustomers(): Promise<Response> {
		const customers: Customer[] = (await this.env.CUSTOMER_KV.get('customers', 'json')) || [];
		return new Response(JSON.stringify(customers), { status: 200 });
	}
}
