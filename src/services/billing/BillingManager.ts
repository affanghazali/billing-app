import { DurableObjectState } from '@cloudflare/workers-types';
import { BillingCycle } from './billingTypes';
import { handleErrorResponse, handleSuccessResponse, checkCustomerExists } from '../../helper';

export class BillingManager {
	state: DurableObjectState;
	env: Env;

	constructor(state: DurableObjectState, env: Env) {
		this.state = state;
		this.env = env;
	}

	// Handle all incoming requests
	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === 'POST' && url.pathname === '/create-billing-cycle') {
			try {
				const billingCycleData = await request.json();

				// Check if the customer exists
				const customerExists = await checkCustomerExists(this.env, billingCycleData.customer_id);
				if (!customerExists) {
					return handleErrorResponse(new Error('Customer not found'));
				}

				// Create a new billing cycle
				return await this.createBillingCycle(billingCycleData);
			} catch (error) {
				return handleErrorResponse(error);
			}
		}

		if (request.method === 'GET' && url.pathname.startsWith('/billing-cycles')) {
			const customerId = url.searchParams.get('customerId');
			if (customerId) {
				return await this.getBillingCyclesForCustomer(customerId);
			}
			return handleErrorResponse(new Error('Customer ID is required'));
		}

		return handleErrorResponse(new Error('Not found'));
	}

	// Create a new billing cycle for a customer
	async createBillingCycle(billingCycleData: BillingCycle): Promise<Response> {
		const billingCycles: BillingCycle[] = (await this.state.storage.get('billing_cycles')) || [];
		billingCycles.push(billingCycleData);
		await this.state.storage.put('billing_cycles', billingCycles);

		return handleSuccessResponse(billingCycleData, `Billing cycle created for customer ${billingCycleData.customer_id}`, 201);
	}

	// Fetch all billing cycles for a customer
	async getBillingCyclesForCustomer(customerId: string): Promise<Response> {
		const billingCycles: BillingCycle[] = (await this.state.storage.get('billing_cycles')) || [];
		const customerCycles = billingCycles.filter((cycle) => cycle.customer_id === customerId);

		if (customerCycles.length === 0) {
			return handleErrorResponse(new Error('No billing cycles found for this customer'));
		}

		return handleSuccessResponse(customerCycles, 'Billing cycles retrieved');
	}
}
