export interface Customer {
	id: string;
	name: string;
	email: string;
	subscription_plan_id: string | null;
	subscription_status: 'active' | 'cancelled';
}
