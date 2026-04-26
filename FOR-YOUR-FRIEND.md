# Setup Guide for Telemedicine

Hey! I've just implemented the **Full Pharmacy & Stock Management Flow**. Here is how you can update your local setup to see the new features.

---

## 🔄 UPDATING (If you already have the project)
If you already have the database and project set up, follow these steps:

1. **Pull the latest code** (or extract the new zip into your project folder and replace all files).
2. **Install updates**:
   ```bash
   npm install
   ```
3. **Update your Database (CRITICAL)**: Run the migration script to add the new Pharmacy tables and columns:
   ```bash
   node scripts/migrate.js
   ```
4. **Refresh Test Data (Recommended)**: To test the new pharmacy flow, you'll need updated medicalist and inventory data:
   ```bash
   node scripts/seed.js
   ```

---

## 🚀 What's New? (Pharmacy Flow)
I've added a complete flow for Medicalists (Pharmacists):
- **Patient Search**: Search by Patient ID to see their consultations and prescriptions.
- **Stock Management**:
  - Add medicines to stock with price, quantity, and low-stock alerts.
  - Automatic calculation of bill based on dispensed quantity.
- **Billing & QR**:
  - Generate a dynamic QR code for patients to pay via UPI.
  - On completion: Stock is reduced, and a medical transaction is recorded.
- **Medicalist Dashboard**:
  - View "Pending Scan" queue for patients who need to pay.
  - Track "Paid" vs "Pending Verification" counts.
- **Dynamic Hotspots**: Disease hotspots are now calculated based on actual patient disease patterns in the database (AI-driven).

---

## 🆕 NEW SETUP (First time setup)

---

### Important Notes
- **Video Calls**: To test the video consultation feature between a Doctor and Patient, open two different browsers (e.g., Chrome and Firefox) or use an Incognito window for one session.
- **Camera Access**: Ensure you allow camera/mic permissions in your browser when prompted.
