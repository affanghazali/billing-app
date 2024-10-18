import { SubscriptionManager } from '../services/subscription/SubscriptionManager';

export async function handleSubscriptionRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
	const subscriptionManager = new SubscriptionManager(env.MY_SUBSCRIPTION_DO);
	const url = new URL(request.url);

	if (request.method === 'POST') {
		if (url.pathname === '/create-subscription-plan') {
			const data = await request.json();
			return subscriptionManager.createSubscriptionPlan(env, data);
		} else if (url.pathname === '/assign-subscription') {
			const { customerId, planId } = await request.json();
			return subscriptionManager.assignSubscription(env, customerId, planId);
		} else if (url.pathname === '/change-subscription') {
			const { customerId, oldPlanId, newPlanId, cycleStartDate, cycleEndDate } = await request.json();
			return subscriptionManager.handleSubscriptionChange(
				env,
				customerId,
				oldPlanId,
				newPlanId,
				new Date(cycleStartDate),
				new Date(cycleEndDate)
			);
		} else if (url.pathname === '/set-plans') {
			return subscriptionManager.setPlans(env);
		}
	}

	if (request.method === 'GET') {
		const customerId = url.searchParams.get('customerId');
		return subscriptionManager.getCustomerSubscription(env, customerId!);
	}

	if (url.pathname === '/get-plans') {
		return subscriptionManager.getPlans(env);
	}

	return new Response('Method not allowed', { status: 405 });
}
