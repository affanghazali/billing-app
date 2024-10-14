import { DurableObjectState } from '@cloudflare/workers-types';
import { SubscriptionPlan } from './subscriptionTypes';

export class SubscriptionManager {
	state: DurableObjectState;
	env: Env;

	constructor(state: DurableObjectState, env: Env) {
		this.state = state;
		this.env = env;
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === 'POST' && url.pathname === '/create-subscription-plan') {
			const data = await request.json();
			return this.createSubscriptionPlan(data);
		}

		if (request.method === 'POST' && url.pathname === '/assign-subscription') {
			const { customerId, planId } = await request.json();
			return this.assignSubscription(customerId, planId);
		}

		if (request.method === 'GET' && url.pathname.startsWith('/subscription')) {
			const customerId = url.searchParams.get('customerId');
			if (customerId) {
				return this.getCustomerSubscription(customerId);
			}
		}

		return new Response('Not found', { status: 404 });
	}

	// Create a new subscription plan
	async createSubscriptionPlan(data: SubscriptionPlan): Promise<Response> {
		const plans: SubscriptionPlan[] = (await this.state.storage.get('plans')) || [];
		plans.push(data);
		await this.state.storage.put('plans', plans);
		return new Response('Subscription plan created successfully', { status: 201 });
	}

	// Assign a subscription plan to a customer
	async assignSubscription(customerId: string, planId: string): Promise<Response> {
		const customers: Customer[] = (await this.env.CUSTOMER_KV.get('customers', 'json')) || [];

		const customer = customers.find((c) => c.id === customerId);
		if (!customer) {
			return new Response('Customer not found', { status: 404 });
		}

		customer.subscription_plan_id = planId;
		customer.subscription_status = 'active';

		await this.env.CUSTOMER_KV.put('customers', JSON.stringify(customers));

		return new Response(`Subscription assigned to customer ${customer.name}`, { status: 200 });
	}

	// Get customer subscription details
	async getCustomerSubscription(customerId: string): Promise<Response> {
		const customers: Customer[] = (await this.env.CUSTOMER_KV.get('customers', 'json')) || [];
		const customer = customers.find((c) => c.id === customerId);
		if (!customer) {
			return new Response('Customer not found', { status: 404 });
		}
		return new Response(JSON.stringify(customer), { status: 200 });
	}
}
