import { PaymentManager } from '../services/payment/PaymentManager';

export async function handlePaymentRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
	const paymentObjectId = env.MY_PAYMENT_DO.idFromName('payment-instance');
	const paymentStub = env.MY_PAYMENT_DO.get(paymentObjectId);

	const url = new URL(request.url);
	const clonedRequest = request.clone();

	if (request.method === 'POST' && url.pathname === '/record-payment') {
		const { invoiceId, paymentAmount } = await clonedRequest.json();
		return paymentStub.fetch(
			new Request('https://fake-url/record-payment', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ invoiceId, paymentAmount }),
			})
		);
	}

	if (request.method === 'GET' && url.pathname === '/retry-failed-payments') {
		return paymentStub.fetch(new Request('https://fake-url/retry-failed-payments', { method: 'GET' }));
	}

	return new Response('Method not allowed', { status: 405 });
}
