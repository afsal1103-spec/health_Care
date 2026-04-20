# Setup Guide for Telemedicine

Hey! If you already have the previous version of the project set up, follow the **"UPDATING"** section below. Otherwise, follow the **"NEW SETUP"** section.

---

## 🔄 UPDATING (If you already have the project)
If you already have the database and project set up, just do these 3 steps to fix the Appointment & Consultation errors:

1. **Extract the new zip** into your project folder (Replace all files).
2. **Install any new updates**:
   ```bash
   npm install
   ```
3. **Update your Database (CRITICAL)**: Run this script to add the missing columns for appointments and consultations:
   ```bash
   node scripts/migrate.js
   ```
4. **Refresh Test Data (Optional)**: To get the new Super Admin and fixed test accounts:
   ```bash
   node scripts/seed.js
   ```

---

## 🆕 NEW SETUP (First time setup)

---

### Important Notes
- **Video Calls**: To test the video consultation feature between a Doctor and Patient, open two different browsers (e.g., Chrome and Firefox) or use an Incognito window for one session.
- **Camera Access**: Ensure you allow camera/mic permissions in your browser when prompted.
