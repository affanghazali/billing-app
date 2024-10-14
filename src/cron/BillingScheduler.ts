import { fetchCustomers, isCustomerActive, fetchBillingCycles, isBillingCycleEnding, generateInvoiceForCustomer } from '../helper';

export async function handleScheduledEvent(env: Env) {
	const customers = await fetchCustomers(env);

	if (!customers) return;

	for (const customer of customers) {
		if (isCustomerActive(customer)) {
			const billingCycles = await fetchBillingCycles(env, customer.id);

			if (billingCycles && Array.isArray(billingCycles)) {
				const currentCycle = billingCycles.find((cycle: any) => cycle.customer_id === customer.id);

				if (isBillingCycleEnding(currentCycle)) {
					await generateInvoiceForCustomer(env, customer.id, customer.subscription_plan_id);
				}
			}
		}
	}
}
