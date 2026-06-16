# Dimsavor Roadmap

This document outlines the strategic future iterations and long-term vision for the Dimsavor application. As the business scales, Dimsavor will evolve from a manual data-entry dashboard into a highly automated, AI-augmented mini-ERP.

## Version 2.0: Automation & Advanced Analytics (Upcoming)

The next major release focuses on eliminating remaining manual bottlenecks and providing predictive insights for production planning.

### 1. WhatsApp Business API & Webhook Integration
- **Objective:** Fully automate the parsing pipeline.
- **Details:** 
  - Replace the current manual copy-paste workflow in the Order Parser screen.
  - Implement webhooks to listen to incoming messages from a verified WhatsApp Business account.
  - Automatically parse incoming text using the existing NLP pipeline and prompt the admin for review/confirmation via an inbox queue.
  - Send automated confirmation receipts and payment links back to the customer upon order approval.

### 2. Demand Forecasting (Time-Series Modeling)
- **Objective:** Predict upcoming production needs to minimize food waste and optimize raw material purchasing.
- **Details:**
  - Utilize historical batch data to train a lightweight time-series forecasting model (e.g., ARIMA or Prophet).
  - Provide a dashboard widget that estimates the necessary quantity of Dimsum and ingredients for the next open session.
  - Adjust predictions based on calendar events, holidays, and previous growth trends.

### 3. Automated Financial Reconciliation
- **Objective:** Track and balance cash held by different business partners accurately.
- **Details:**
  - Implement a ledger system to track precisely which partner received payment for which order.
  - Automate the calculation of "Who owes whom" at the end of each batch based on the defined 50/50 profit-sharing logic and operational expenses.
  - Generate settlement reports to facilitate one-click inter-partner fund transfers.

---

## Version 3.0: Customer-Facing Portal (Long-term Vision)

- **Self-Service Ordering:** A lightweight, mobile-first web app where customers can place their own orders, completely bypassing WhatsApp chat.
- **Real-Time Tracking:** Customers can track the status of their orders (e.g., "In Kitchen", "Out for Delivery") via a unique order link.
- **Loyalty Program:** Automated tracking of returning customers to distribute digital discount codes and rewards.
