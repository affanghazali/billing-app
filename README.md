# billing-app

A Simple Billing App for a SaaS Platform Using Cloudflare Workers

cd billing-app

wrangler kv namespace create CUSTOMER_KV

wrangler kv:key put --namespace-id <your-namespace-id> plans '[
{ "id": "basic", "name": "Basic Plan", "billing_cycle": "monthly", "price": 10, "status": "active" },
{ "id": "premium", "name": "Premium Plan", "billing_cycle": "monthly", "price": 20, "status": "active" },
{ "id": "enterprise", "name": "Enterprise Plan", "billing_cycle": "yearly", "price": 50, "status": "active" }
]'
