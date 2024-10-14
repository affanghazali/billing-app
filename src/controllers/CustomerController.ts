import { CustomerManager } from '../services/customer/CustomerManager';

export async function handleCustomerRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
	const customerManager = new CustomerManager(env.MY_CUSTOMER_DO);

	switch (request.method) {
		case 'POST':
			return customerManager.createCustomer(await request.json());
		case 'GET':
			const url = new URL(request.url);
			const customerId = url.searchParams.get('customerId');
			return customerId ? customerManager.getCustomer(customerId) : customerManager.listCustomers();
		default:
			return new Response('Method not allowed', { status: 405 });
	}
}
