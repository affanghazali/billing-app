export interface SubscriptionPlan {
	id: string;
	name: string;
	billing_cycle: 'monthly' | 'yearly';
	price: number;
	status: 'active' | 'inactive';
}
