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

### 3. Expense Receipt OCR Scanning
- **Objective:** Automatically parse physical receipts or screenshots of expenses.
- **Details:**
  - Add an upload widget on the Finance screen for receipts.
  - Implement a lightweight server-side OCR utility to extract the total amount and item description from receipts.
  - Automatically pre-fill the expense entry form for admin validation, reducing manual entry errors.

---

## Version 3.0: Customer-Facing Portal (Long-term Vision)

- **Self-Service Ordering:** A lightweight, mobile-first web app where customers can place their own orders, completely bypassing WhatsApp chat.
- **Real-Time Tracking:** Customers can track the status of their orders (e.g., "In Kitchen", "Out for Delivery") via a unique order link.
- **Loyalty Program:** Automated tracking of returning customers to distribute digital discount codes and rewards.

