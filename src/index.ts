import { handleCustomerRequest } from './controllers/CustomerController';
import { handleSubscriptionRequest } from './controllers/SubscriptionController';
import { CustomerManager } from './services/customer/CustomerManager';
import { SubscriptionManager } from './services/subscription/SubscriptionManager';

// Export the Durable Objects
export { CustomerManager, SubscriptionManager };

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Routing for customer-related requests
		if (url.pathname.startsWith('/customer')) {
			const customerObjectId = env.MY_CUSTOMER_DO.idFromName('customer-instance');
			const customerStub = env.MY_CUSTOMER_DO.get(customerObjectId);
			return customerStub.fetch(request);
		}

		// Routing for subscription-related requests
		if (
			url.pathname === '/create-subscription-plan' ||
			url.pathname === '/assign-subscription' ||
			url.pathname.startsWith('/subscription')
		) {
			const subscriptionObjectId = env.MY_SUBSCRIPTION_DO.idFromName('subscription-instance');
			const subscriptionStub = env.MY_SUBSCRIPTION_DO.get(subscriptionObjectId);
			return subscriptionStub.fetch(request);
		}

		return new Response('Not found', { status: 404 });
	},
};
