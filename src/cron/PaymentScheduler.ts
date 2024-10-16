export async function handleRetryFailedPayments(env: Env) {
	console.log('Running scheduled event to retry failed payments');

	const paymentObjectId = env.MY_PAYMENT_DO.idFromName('payment-instance');
	const paymentStub = env.MY_PAYMENT_DO.get(paymentObjectId);

	await paymentStub.fetch(new Request('https://fake-url/retry-failed-payments', { method: 'GET' }));

	console.log('Finished retrying failed payments');
}
