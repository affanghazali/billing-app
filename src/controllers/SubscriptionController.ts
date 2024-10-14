import { SubscriptionManager } from '../services/subscription/SubscriptionManager';

export async function handleSubscriptionRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
	const subscriptionManager = new SubscriptionManager(env.MY_SUBSCRIPTION_DO);

	const url = new URL(request.url);
	const path = url.pathname;

	if (request.method === 'POST' && path === '/create-subscription-plan') {
		return subscriptionManager.createSubscriptionPlan(await request.json());
	}

	if (request.method === 'POST' && path === '/assign-subscription') {
		const { customerId, planId } = await request.json();
		return subscriptionManager.assignSubscription(customerId, planId);
	}

	if (request.method === 'GET' && path === '/subscription') {
		const customerId = url.searchParams.get('customerId');
		return subscriptionManager.getCustomerSubscription(customerId!);
	}

	return new Response('Method not allowed', { status: 405 });
}
