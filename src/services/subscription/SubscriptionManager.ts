import { DurableObjectState } from '@cloudflare/workers-types';
import { SubscriptionPlan } from './subscriptionTypes';
import { handleErrorResponse, handleSuccessResponse, checkCustomerExists } from '../../helper';

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

		if (request.method === 'POST' && url.pathname === '/change-subscription') {
			const { customerId, oldPlanId, newPlanId, cycleStartDate, cycleEndDate } = await request.json();
			return this.handleSubscriptionChange(customerId, oldPlanId, newPlanId, new Date(cycleStartDate), new Date(cycleEndDate));
		}

		if (request.method === 'GET' && url.pathname.startsWith('/subscription')) {
			const customerId = url.searchParams.get('customerId');
			if (customerId) {
				return this.getCustomerSubscription(customerId);
			}
		}

		if (url.pathname === '/get-plans') {
			return this.getPlans();
		}

		if (url.pathname === '/set-plans') {
			return this.setPlans();
		}

		return handleErrorResponse(new Error('Not found'));
	}

	async createSubscriptionPlan(data: SubscriptionPlan): Promise<Response> {
		const plans: SubscriptionPlan[] = (await this.state.storage.get('plans')) || [];
		plans.push(data);
		await this.state.storage.put('plans', plans);

		return handleSuccessResponse(data, 'Subscription plan created successfully', 201);
	}

	async assignSubscription(customerId: string, planId: string): Promise<Response> {
		const customers = (await this.env.CUSTOMER_KV.get('customers', 'json')) || [];

		const customer = customers.find((c) => c.id === customerId);
		if (!customer) {
			return handleErrorResponse(new Error('Customer not found'));
		}

		customer.subscription_plan_id = planId;
		customer.subscription_status = 'active';

		await this.env.CUSTOMER_KV.put('customers', JSON.stringify(customers));

		return handleSuccessResponse(customer, `Subscription assigned to customer ${customer.name}`);
	}

	async getCustomerSubscription(customerId: string): Promise<Response> {
		const customers = (await this.env.CUSTOMER_KV.get('customers', 'json')) || [];
		const customer = customers.find((c) => c.id === customerId);

		if (!customer) {
			return handleErrorResponse(new Error('Customer not found'));
		}

		return handleSuccessResponse(customer, 'Customer subscription retrieved');
	}

	async handleSubscriptionChange(
		customerId: string,
		oldPlanId: string,
		newPlanId: string,
		cycleStartDate: Date,
		cycleEndDate: Date
	): Promise<Response> {
		try {
			const daysInCycle = (cycleEndDate.getTime() - cycleStartDate.getTime()) / (1000 * 60 * 60 * 24);
			const today = new Date();
			const daysUsed = (today.getTime() - cycleStartDate.getTime()) / (1000 * 60 * 60 * 24);
			const daysRemaining = daysInCycle - daysUsed;

			const plans = await this.env.CUSTOMER_KV.get('plans', 'json');
			const oldPlan = plans.find((plan: any) => plan.id === oldPlanId);
			const newPlan = plans.find((plan: any) => plan.id === newPlanId);

			if (!oldPlan || !newPlan) {
				return handleErrorResponse(new Error('Plan not found'));
			}

			const proratedOldPlan = (oldPlan.price / daysInCycle) * daysUsed;
			const proratedNewPlan = (newPlan.price / daysInCycle) * daysRemaining;

			const totalAmountDue = proratedOldPlan + proratedNewPlan;

			const invoiceData = {
				id: crypto.randomUUID(),
				customer_id: customerId,
				amount: totalAmountDue,
				due_date: new Date(),
				payment_status: 'pending',
				payment_date: null,
			};

			const billingObjectId = this.env.MY_BILLING_DO.idFromName('billing-instance');
			const billingStub = this.env.MY_BILLING_DO.get(billingObjectId);

			const response = await billingStub.fetch(new Request('https://fake-url/invoices', { method: 'GET' }));
			let invoices = [];

			if (response.ok) {
				invoices = await response.json();
				if (!Array.isArray(invoices)) {
					invoices = [];
				}
			}

			invoices.push(invoiceData);

			await billingStub.fetch(
				new Request('https://fake-url/invoices', {
					method: 'POST',
					body: JSON.stringify(invoices),
				})
			);

			return handleSuccessResponse(invoiceData, `Prorated invoice generated for customer ${customerId}`, 201);
		} catch (error) {
			return handleErrorResponse(error);
		}
	}

	async setPlans(): Promise<Response> {
		const plans = [
			{ id: '1', name: 'Basic Plan', billing_cycle: 'monthly', price: 10, status: 'active' },
			{ id: '2', name: 'Premium Plan', billing_cycle: 'monthly', price: 20, status: 'active' },
			{ id: '3', name: 'Enterprise Plan', billing_cycle: 'yearly', price: 50, status: 'active' },
		];

		await this.env.CUSTOMER_KV.put('plans', JSON.stringify(plans));

		return new Response('Plans stored in KV', { status: 201 });
	}

	async getPlans(): Promise<Response> {
		let plans = plansRaw ? JSON.parse(plansRaw) : null;

		if (!plans || plans.length === 0) {
			return new Response(JSON.stringify({ error: 'No plans found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		return new Response(JSON.stringify(plans), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
