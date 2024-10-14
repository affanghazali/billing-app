import { DurableObjectState } from '@cloudflare/workers-types';
import { BillingCycle } from './billingTypes';

export class BillingManager {
	state: DurableObjectState;
	env: Env;

	constructor(state: DurableObjectState, env: Env) {
		this.state = state;
		this.env = env;
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === 'POST' && url.pathname === '/create-billing-cycle') {
			try {
				const billingCycleData = await request.json();

				const customerExists = await this.checkCustomerExists(billingCycleData.customer_id);
				if (!customerExists) {
					return new Response('Customer not found', { status: 404 });
				}

				return this.createBillingCycle(billingCycleData);
			} catch (err) {
				return new Response('Invalid request body', { status: 400 });
			}
		}

		// Fetch all billing cycles for a specific customer
		if (request.method === 'GET' && url.pathname.startsWith('/billing-cycles')) {
			const customerId = url.searchParams.get('customerId');
			if (customerId) {
				return this.getBillingCyclesForCustomer(customerId);
			}
			return new Response('Customer ID is required', { status: 400 });
		}

		return new Response('Not found', { status: 404 });
	}

	// Helper function to check if a customer exists in KV storage
	async checkCustomerExists(customerId: string): Promise<boolean> {
		const customers = (await this.env.CUSTOMER_KV.get('customers', 'json')) || [];
		return customers.some((customer: any) => customer.id === customerId);
	}

	// Create a new billing cycle for a customer
	async createBillingCycle(billingCycleData: BillingCycle): Promise<Response> {
		const billingCycles: BillingCycle[] = (await this.state.storage.get('billing_cycles')) || [];

		billingCycles.push(billingCycleData);
		await this.state.storage.put('billing_cycles', billingCycles);

		return new Response(`Billing cycle created for customer ${billingCycleData.customer_id}`, { status: 201 });
	}

	// Fetch all billing cycles for a customer
	async getBillingCyclesForCustomer(customerId: string): Promise<Response> {
		const billingCycles: BillingCycle[] = (await this.state.storage.get('billing_cycles')) || [];
		const customerCycles = billingCycles.filter((cycle) => cycle.customer_id === customerId);

		if (customerCycles.length === 0) {
			return new Response('No billing cycles found for this customer', { status: 404 });
		}

		return new Response(JSON.stringify(customerCycles), { status: 200 });
	}
}
