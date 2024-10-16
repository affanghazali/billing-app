// helper for sending email notification
export async function sendEmail(env: Env, to: string, subject: string, content: string): Promise<Response> {
	try {
		const sendGridApiKey = env.SENDGRID_API_KEY;
		const emailData = {
			personalizations: [{ to: [{ email: to }] }],
			from: { email: 'ghazaliaffan@gmail.com' },
			subject,
			content: [{ type: 'text/plain', value: content }],
		};

		const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${sendGridApiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(emailData),
		});

		if (!response.ok) {
			console.error('Failed to send email', await response.text());
			return new Response('Failed to send email', { status: 500 });
		}

		return new Response('Email sent successfully', { status: 200 });
	} catch (error) {
		console.error('Error sending email:', error);
		return new Response('Error sending email', { status: 500 });
	}
}

// Reusable error response handler
export function handleErrorResponse(error: any): Response {
	const responseBody = { error: error.message || 'An error occurred' };
	return new Response(JSON.stringify(responseBody), {
		status: 500,
		headers: { 'Content-Type': 'application/json' },
	});
}

// Reusable success response handler
export function handleSuccessResponse(data: any, message: string = 'Success', status: number = 200): Response {
	const responseBody = { message, data };
	return new Response(JSON.stringify(responseBody), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

// Reusable function to check if customer exists in KV storage
export async function checkCustomerExists(env: Env, customerId: string): Promise<boolean> {
	const customers = (await env.CUSTOMER_KV.get('customers', 'json')) || [];
	return customers.some((customer: any) => customer.id === customerId);
}

// Fetch customers from KV storage
export async function fetchCustomers(env: Env) {
	const customers = await env.CUSTOMER_KV.get('customers', 'json');
	if (!customers) {
		console.error('No customers found in KV storage');
	}
	return customers;
}

// Check if the customer has an active subscription
export function isCustomerActive(customer: any): boolean {
	return customer.subscription_status === 'active';
}

// Fetch billing cycles for a specific customer
export async function fetchBillingCycles(env: Env, customerId: string) {
	try {
		const billingObjectId = env.MY_BILLING_DO.idFromName('billing-instance');
		const billingStub = env.MY_BILLING_DO.get(billingObjectId);

		const response = await billingStub.fetch(
			new Request(`https://fake-url/billing-cycles?customerId=${customerId}`, {
				method: 'GET',
			})
		);

		return await handleResponse(response);
	} catch (error) {
		console.error(`Error fetching billing cycles for customer ${customerId}:`, error);
		return null;
	}
}

// Handle response from the Durable Object
export async function handleResponse(response: Response) {
	const contentType = response.headers.get('Content-Type') || '';

	if (!contentType.includes('application/json')) {
		console.error(`Non-JSON response received: ${await response.text()}`);
		return null;
	}

	return await response.json();
}

// Check if the billing cycle is ending
export function isBillingCycleEnding(currentCycle: any): boolean {
	if (!currentCycle) {
		console.error('No current billing cycle found');
		return false;
	}

	const now = new Date();
	const cycleEndDate = new Date(currentCycle.end_date);

	return now >= cycleEndDate;
}

// Generate customer invoices
export async function generateInvoiceForCustomer(env: Env, customerId: string, planId: string): Promise<void> {
	const plans = await env.CUSTOMER_KV.get('plans', 'json');
	const customerPlan = plans.find((plan: any) => plan.id === planId);

	if (!customerPlan) {
		console.error(`Plan with id ${planId} not found for customer ${customerId}`);
		return;
	}

	const randomDays = Math.floor(Math.random() * 30) + 1;
	const randomDueDate = new Date();
	randomDueDate.setDate(randomDueDate.getDate() + randomDays);

	const invoiceData = {
		id: crypto.randomUUID(),
		customer_id: customerId,
		amount: customerPlan.price,
		due_date: randomDueDate,
		payment_status: 'pending',
		payment_date: null,
	};

	const invoiceObjectId = env.MY_INVOICE_DO.idFromName('invoice-instance');
	console.log('invoiceObjectId: ', invoiceObjectId);
	const invoiceStub = env.MY_INVOICE_DO.get(invoiceObjectId);
	console.log('invoiceStub: ', invoiceStub);

	const response = await invoiceStub.fetch(new Request('https://fake-url/invoices', { method: 'GET' }));
	console.log('response: ', response);

	let invoices = [];
	if (response.ok) {
		try {
			invoices = await response.json();
			if (!Array.isArray(invoices)) {
				invoices = [];
			}
		} catch (error) {
			console.error('Failed to parse invoices response:', error);
			invoices = [];
		}
	}

	invoices.push(invoiceData);

	await invoiceStub.fetch(
		new Request('https://fake-url/invoices', {
			method: 'POST',
			body: JSON.stringify(invoices),
		})
	);

	console.log(`Invoice generated for customer ${customerId}`);
	console.log('Invoice: ', invoiceData);
}
