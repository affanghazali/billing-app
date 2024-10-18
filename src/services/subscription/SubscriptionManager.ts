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

	async createSubscriptionPlan(env: Env, data: SubscriptionPlan): Promise<Response> {
		try {
			const plans: SubscriptionPlan[] = (await env.CUSTOMER_KV.get('plans', 'json')) || [];

			plans.push(data);

			await env.CUSTOMER_KV.put('plans', JSON.stringify(plans));

			return handleSuccessResponse(data, 'Subscription plan created successfully', 201);
		} catch (error) {
			return handleErrorResponse(error);
		}
	}

	async assignSubscription(env: Env, customerId: string, planId: string): Promise<Response> {
		const customers = (await env.CUSTOMER_KV.get('customers', 'json')) || [];

		const customer = customers.find((c) => c.id === customerId);
		if (!customer) {
			return handleErrorResponse(new Error('Customer not found'));
		}

		customer.subscription_plan_id = planId;
		customer.subscription_status = 'active';

		await env.CUSTOMER_KV.put('customers', JSON.stringify(customers));

		return handleSuccessResponse(customer, `Subscription assigned to customer ${customer.name}`);
	}

	async getCustomerSubscription(env: Env, customerId: string): Promise<Response> {
		const customers = (await env.CUSTOMER_KV.get('customers', 'json')) || [];
		const customer = customers.find((c) => c.id === customerId);

		if (!customer) {
			return handleErrorResponse(new Error('Customer not found'));
		}

		return handleSuccessResponse(customer, 'Customer subscription retrieved');
	}

	async handleSubscriptionChange(
		env: Env,
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

			const plans = await env.CUSTOMER_KV.get('plans', 'json');
			const oldPlan = plans.find((plan: any) => plan.id === oldPlanId);
			const newPlan = plans.find((plan: any) => plan.id === newPlanId);

			if (!oldPlan || !newPlan) {
				console.error('Plan not found:', { oldPlan, newPlan });
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

			const invoiceObjectId = env.MY_INVOICE_DO.idFromName('invoice-instance');
			const invoiceStub = env.MY_INVOICE_DO.get(invoiceObjectId);

			const response = await invoiceStub.fetch(new Request('https://fake-url/invoices/all', { method: 'GET' }));

			if (!response.ok) {
				console.error('Failed to fetch invoices from billing DO:', response.status, response.statusText);
				return handleErrorResponse(new Error('Failed to fetch invoices from billing DO'));
			}

			let invoices = [];

			try {
				invoices = await response.json();
				if (!Array.isArray(invoices)) {
					invoices = [];
				}
			} catch (error) {
				console.error('Failed to parse invoices:', error);
				return handleErrorResponse(new Error('Error parsing invoices'));
			}

			invoices.push(invoiceData);

			const saveResponse = await invoiceStub.fetch(
				new Request('https://fake-url/invoices/update', {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ data: invoices }),
				})
			);

			if (!saveResponse.ok) {
				console.error('Failed to save updated invoices:', saveResponse.status, saveResponse.statusText);
				return handleErrorResponse(new Error('Failed to save updated invoices'));
			}

			console.log('Prorated invoice generated for customer:', customerId);
			return handleSuccessResponse(invoiceData, `Prorated invoice generated for customer ${customerId}`, 201);
		} catch (error) {
			console.error('Error handling subscription change:', error);
			return handleErrorResponse(new Error('internal error'));
		}
	}

	async setPlans(env: Env): Promise<Response> {
		const plans = [
			{ id: '1', name: 'Basic Plan', billing_cycle: 'monthly', price: 10, status: 'active' },
			{ id: '2', name: 'Premium Plan', billing_cycle: 'monthly', price: 20, status: 'active' },
			{ id: '3', name: 'Enterprise Plan', billing_cycle: 'yearly', price: 50, status: 'active' },
		];

		await env.CUSTOMER_KV.put('plans', JSON.stringify(plans));

		return new Response('Plans stored in KV', { status: 201 });
	}

	async getPlans(env: Env): Promise<Response> {
		const plansRaw = await env.CUSTOMER_KV.get('plans', 'json');
		const plans = plansRaw ? JSON.parse(plansRaw) : null;

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
