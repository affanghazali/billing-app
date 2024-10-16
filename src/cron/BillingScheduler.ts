import { fetchCustomers, isCustomerActive, fetchBillingCycles, isBillingCycleEnding, generateInvoiceForCustomer } from '../helper';

export async function handleInvoiceGeneration(env: Env) {
	console.log('Running scheduled event to generate customer invoices');
	const customers = await fetchCustomers(env);

	if (!customers) return;

	for (const customer of customers) {
		if (isCustomerActive(customer)) {
			const billingCycles = await fetchBillingCycles(env, customer.id);
			if (billingCycles && Array.isArray(billingCycles.data)) {
				const currentCycle = billingCycles.data.find((cycle: any) => cycle.customer_id === customer.id);
				if (isBillingCycleEnding(currentCycle)) {
					await generateInvoiceForCustomer(env, customer.id, customer.subscription_plan_id);
				}
			}
		}
	}
}
