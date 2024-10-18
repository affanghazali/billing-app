import { handleErrorResponse, handleSuccessResponse } from '../../helper';

export class CustomerManager {
	state: DurableObjectState;
	env: Env;

	constructor(state: DurableObjectState, env: Env) {
		this.state = state;
		this.env = env;
	}

	async createCustomer(env, data: { id: string; name: string; email: string }): Promise<Response> {
		const customers: Customer[] = (await env.CUSTOMER_KV.get('customers', 'json')) || [];

		const existingCustomer = customers.find((c) => c.email === data.email);
		if (existingCustomer) {
			return handleErrorResponse(new Error('Customer with this email already exists'));
		}

		const newCustomer: Customer = {
			id: data.id,
			name: data.name,
			email: data.email,
			subscription_plan_id: null,
			subscription_status: 'cancelled',
		};

		customers.push(newCustomer);
		await env.CUSTOMER_KV.put('customers', JSON.stringify(customers));

		return handleSuccessResponse(newCustomer, `Customer ${data.name} created successfully`, 201);
	}

	async getCustomer(env, customerId: string): Promise<Response> {
		const customers: Customer[] = (await env.CUSTOMER_KV.get('customers', 'json')) || [];
		const customer = customers.find((c) => c.id === customerId);

		if (!customer) {
			return handleErrorResponse(new Error('Customer not found'));
		}

		return handleSuccessResponse(customer, 'Customer retrieved');
	}

	async listCustomers(env): Promise<Response> {
		const customers: Customer[] = (await env.CUSTOMER_KV.get('customers', 'json')) || [];
		return handleSuccessResponse(customers, 'Customers retrieved');
	}
}
