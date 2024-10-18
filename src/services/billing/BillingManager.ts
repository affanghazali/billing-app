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

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === 'POST' && url.pathname === '/create-billing-cycle') {
			const billingCycleData = await request.json();
			return this.createBillingCycle(this.env, billingCycleData);
		}

		if (request.method === 'GET' && url.pathname.startsWith('/billing-cycles')) {
			const customerId = url.searchParams.get('customerId');
			return this.getBillingCyclesForCustomer(this.env, customerId!);
		}

		return new Response('Method not allowed', { status: 405 });
	}

	async createBillingCycle(env: Env, billingCycleData: BillingCycle): Promise<Response> {
		try {
			const customerExists = await checkCustomerExists(env, billingCycleData.data.customer_id);
			if (!customerExists) {
				return handleErrorResponse(new Error('Customer not found'));
			}

			const billingCycles: BillingCycle[] = (await this.state.storage.get('billing_cycles')) || [];
			billingCycles.push(billingCycleData.data);
			await this.state.storage.put('billing_cycles', billingCycles);

			return handleSuccessResponse(billingCycleData, `Billing cycle created for customer ${billingCycleData.data.customer_id}`, 201);
		} catch (error) {
			return handleErrorResponse(error);
		}
	}

	async getBillingCyclesForCustomer(env: Env, customerId: string): Promise<Response> {
		try {
			const billingCycles: BillingCycle[] = (await this.state.storage.get('billing_cycles')) || [];
			const customerCycles = billingCycles.filter((cycle) => cycle.customer_id === customerId);

			if (customerCycles.length === 0) {
				return handleErrorResponse(new Error('No billing cycles found for this customer'));
			}

			return handleSuccessResponse(customerCycles, 'Billing cycles retrieved');
		} catch (error) {
			return handleErrorResponse(error);
		}
	}
}
