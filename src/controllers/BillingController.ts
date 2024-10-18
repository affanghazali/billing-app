import { BillingManager } from '../services/billing/BillingManager';

export async function handleBillingRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
	const billingObjectId = env.MY_BILLING_DO.idFromName('billing-instance');
	const billingStub = env.MY_BILLING_DO.get(billingObjectId);

	const url = new URL(request.url);
	const clonedRequest = request.clone();

	if (request.method === 'POST' && url.pathname === '/create-billing-cycle') {
		const billingCycleData = await clonedRequest.json();
		return billingStub.fetch(
			new Request('https://fake-url/create-billing-cycle', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ data: billingCycleData }),
			})
		);
	}

	if (request.method === 'GET' && url.pathname.startsWith('/billing-cycles')) {
		const customerId = url.searchParams.get('customerId');
		return billingStub.fetch(new Request(`https://fake-url/billing-cycles?customerId=${customerId}`, { method: 'GET' }));
	}

	return new Response('Method not allowed', { status: 405 });
}
