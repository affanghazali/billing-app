# billing-app

A Simple Billing App for a SaaS Platform Using Cloudflare Workers

This project is a billing system for a SaaS platform, built using Cloudflare Workers and Durable Objects. It supports billing cycle management, invoicing, and subscription handling, along with retrying failed payments, and sending email notifications via SendGrid.

```bash
cd billing-app
```

```bash
wrangler kv namespace create CUSTOMER_KV
```

```bash
wrangler kv:key put --namespace-id <your-namespace-id> plans '[
{ "id": "basic", "name": "Basic Plan", "billing_cycle": "monthly", "price": 10, "status": "active" },
{ "id": "premium", "name": "Premium Plan", "billing_cycle": "monthly", "price": 20, "status": "active" },
{ "id": "enterprise", "name": "Enterprise Plan", "billing_cycle": "yearly", "price": 50, "status": "active" }
]'
```

```bash
wrangler secret put SENDGRID_API_KEY# Billing App for SaaS Platform
```

## Features

- **Subscription Management**: Create subscription plans and assign them to customers.
- **Billing Cycle Management**: Manage billing cycles for each customer and generate invoices accordingly.
- **Payments**: Record payments, retry failed payments, and update the corresponding invoices.
- **Notifications**: Send notifications for successful or failed payments via email.
- **Cron Jobs**: Automatically handle recurring tasks like retrying failed payments and generating invoices.

## Prerequisites

- [Cloudflare Wrangler CLI](https://developers.cloudflare.com/workers/cli-wrangler/install-update) installed and configured.
- [SendGrid API Key](https://sendgrid.com/) for email notifications.
- Cloudflare Workers account and namespaces for key-value storage (KV) and Durable Objects.

## Setup Instructions

1. Clone the repository and navigate to the project directory:

   ```bash
   git clone <repository_url>
   cd billing-app
   ```

2. Create KV namespace for customer data:

   ```bash
   wrangler kv:namespace create CUSTOMER_KV
   ```

3. Ensure all Durable Objects are created in your wrangler.toml:

   ```bash
    [[durable_objects.bindings]]
    name = "MY_CUSTOMER_DO"
    class_name = "CustomerManager"

    [[durable_objects.bindings]]
    name = "MY_SUBSCRIPTION_DO"
    class_name = "SubscriptionManager"

    [[durable_objects.bindings]]
    name = "MY_INVOICE_DO"
    class_name = "InvoiceManager"

    [[durable_objects.bindings]]
    name = "MY_BILLING_DO"
    class_name = "BillingManager"

    [[durable_objects.bindings]]
    name = "MY_PAYMENT_DO"
    class_name = "PaymentManager"
   ```

4. Populate the KV namespace with subscription plans:

   ```bash
   wrangler kv:key put --namespace-id <your-namespace-id> plans '[
       { "id": "basic", "name": "Basic Plan", "billing_cycle": "monthly", "price": 10, "status": "active" },
       { "id": "premium", "name": "Premium Plan", "billing_cycle": "monthly", "price": 20, "status": "active" },
       { "id": "enterprise", "name": "Enterprise Plan", "billing_cycle": "yearly", "price": 50, "status": "active" }
   ]'
   ```

5. Add your SendGrid API key as a secret:
   ```bash
   wrangler secret put SENDGRID_API_KEY
   ```

## Running Locally

1. To run the app locally, use the following command:
   ```bash
   wrangler dev
   ```

## API Endpoints

### 1\. Customer Management

- POST /create-customer: Create a new customer.
- GET /customer: List all customers.
- GET /customer?customerId={id}: Get details of a specific customer.

### 2\. Subscription Management

- POST /create-subscription-plan: Create a new subscription plan.
- POST /assign-subscription: Assign a subscription plan to a customer.
- POST /change-subscription: Change a customer's subscription plan (handles proration).

### 3\. Billing Management

- POST /create-billing-cycle: Create a billing cycle for a customer.
- GET /billing-cycles?customerId={id}: Get billing cycles for a specific customer.

### 4\. Invoicing

- POST /create-invoice: Create an invoice.
- GET /invoices?customerId={id}: Fetch all invoices for a customer.
- POST /update-invoice: Update an existing invoice.

### 5\. Payments

- POST /record-payment: Record a payment against an invoice.
- GET /retry-failed-payments: Retry failed payments.

## Cron Jobs

### 1\. Invoice Generation

Automatically generates invoices for active subscriptions:

```bash
GET /generate-customer-invoices-cron
```

### 2\. Retry Failed Payments

Automatically retries failed payments:

```bash
GET /retry-failed-payments-cron
```
