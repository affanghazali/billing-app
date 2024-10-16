export interface Invoice {
	id: string;
	customer_id: string;
	plan_id: string;
	amount_due: number;
	due_date: string;
	status: 'paid' | 'pending' | 'failed';
	created_at: string;
	paid_at?: string;
}

export interface BillingCycle {
	id: string;
	plan_id: string;
	customer_id: string;
	start_date: string;
	end_date: string;
	cycle_type: 'monthly' | 'yearly';
	status: 'active' | 'completed';
}
