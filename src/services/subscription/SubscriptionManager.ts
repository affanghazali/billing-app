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

		return handleErrorResponse(new Error('Not found'));
	}

	// Create a new subscription plan
	async createSubscriptionPlan(data: SubscriptionPlan): Promise<Response> {
		const plans: SubscriptionPlan[] = (await this.state.storage.get('plans')) || [];
		plans.push(data);
		await this.state.storage.put('plans', plans);

		return handleSuccessResponse(data, 'Subscription plan created successfully', 201);
	}

	// Assign a subscription plan to a customer
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

	// Get customer subscription details
	async getCustomerSubscription(customerId: string): Promise<Response> {
		const customers = (await this.env.CUSTOMER_KV.get('customers', 'json')) || [];
		const customer = customers.find((c) => c.id === customerId);

		if (!customer) {
			return handleErrorResponse(new Error('Customer not found'));
		}

		return handleSuccessResponse(customer, 'Customer subscription retrieved');
	}

	// Handle prorated billing for subscription change
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

			// Get old and new plan pricing
			const plans = await this.env.CUSTOMER_KV.get('plans', 'json');
			const oldPlan = plans.find((plan: any) => plan.id === oldPlanId);
			const newPlan = plans.find((plan: any) => plan.id === newPlanId);

			if (!oldPlan || !newPlan) {
				return handleErrorResponse(new Error('Plan not found'));
			}

			// Calculate prorated amounts
			const proratedOldPlan = (oldPlan.price / daysInCycle) * daysUsed;
			const proratedNewPlan = (newPlan.price / daysInCycle) * daysRemaining;

			// Total amount after prorating
			const totalAmountDue = proratedOldPlan + proratedNewPlan;

			// Generate a new invoice or update the existing one
			const invoiceData = {
				id: crypto.randomUUID(), // Generating unique ID
				customer_id: customerId,
				amount: totalAmountDue,
				due_date: new Date(), // Set appropriate due date
				payment_status: 'pending',
				payment_date: null,
			};

			const invoices = (await this.env.MY_BILLING_DO.get('invoices', 'json')) || [];
			invoices.push(invoiceData);
			await this.env.MY_BILLING_DO.put('invoices', JSON.stringify(invoices));

			return handleSuccessResponse(invoiceData, `Prorated invoice generated for customer ${customerId}`, 201);
		} catch (error) {
			return handleErrorResponse(error);
		}
	}
}
