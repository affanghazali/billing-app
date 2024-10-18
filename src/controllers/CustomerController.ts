import { CustomerManager } from '../services/customer/CustomerManager';

export async function handleCustomerRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
	const customerManager = new CustomerManager(env.MY_CUSTOMER_DO);

	switch (request.method) {
		case 'POST':
			const data = await request.json();
			return customerManager.createCustomer(env, data);
		case 'GET':
			const url = new URL(request.url);
			const customerId = url.searchParams.get('customerId');
			return customerId ? customerManager.getCustomer(env, customerId) : customerManager.listCustomers(env);
		default:
			return new Response('Method not allowed', { status: 405 });
	}
}
