export async function handleScheduledEvent(env: Env) {
	// Trigger invoice generation
	await handleInvoiceGeneration(env);

	// Trigger retry for failed payments
	await handleRetryFailedPayments(env);
}
