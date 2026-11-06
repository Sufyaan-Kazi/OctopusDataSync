# 🐙 Octopus Energy Smart Meter Telemetry Sync
![AI Assisted](https://img.shields.io/badge/🤖_AI-Assisted-blue.svg)

This Google Apps Script automatically fetches half-hourly electricity and gas consumption data from your Octopus Energy smart meters and logs it into a Google Sheet. It also automatically calculates the exact cost per interval based on your fixed tariff rates.

## 🔗 Integration with Tado Smart Heating (Optional)
This project can be used as the perfect companion to my [TadoDataSync](https://github.com/Sufyaan-Kazi/TadoDataSync) script or just used standalone. By running both pipelines into Google Sheets, you can align your 30-minute Octopus energy costs with your 15-minute Tado "Call for Heat" intervals. This allows you to build powerful BI dashboards (using Looker Studio) to track the exact financial cost of heating individual zones in your home.

## 🛠️ Setup

1. Create a new [Google Sheet](https://sheets.new).
2. Go to **Extensions > Apps Script**, rename `Code.gs` to `Main.gs`, and paste the script code.
3. In the Apps Script editor, click the **Gear icon** (Project Settings) > **Script properties**.
4. Add the following properties with your details from your [Octopus Developer Dashboard](https://octopus.energy/dashboard/developer/):
   - `OCTOPUS_API_KEY`
   - `OCTOPUS_MPAN` (Electricity)
   - `OCTOPUS_SERIAL` (Electricity)
   - `OCTOPUS_MPRN` (Gas)
   - `OCTOPUS_GAS_SERIAL` (Gas)

*Note: Update the `ELEC_UNIT_RATE_PENCE` and `GAS_UNIT_RATE_PENCE` variables at the top of the script to match your current tariff.*

## 📅 Automation
1. Run `syncYesterdayOctopus` manually from the editor once to grant Google permissions.
2. Click the **Alarm Clock icon** (Triggers), and add a new daily Time-driven trigger for `syncYesterdayOctopus` to run between **2 AM and 3 AM**.

## ⚠️ Important Notes
- **Standing Charges:** This script tracks *pure usage costs* based on your half-hourly unit consumption. It does not append your daily standing charge to these rows. When building your dashboard, simply calculate `(Count of Unique Days * Daily Standing Charge)` as a separate metric to balance your total monthly spend.
- **DCC Network Delays:** The script intentionally looks back 3 days to account for standard UK smart meter reporting delays over the DCC cellular network. 
- **Duplicate Prevention:** Built-in duplicate prevention ensures your sheet only appends new intervals, keeping your data clean regardless of the look-back window.

## 🤝 Acknowledgments
* **Code & Architecture:** Developed and refined in collaboration with Google Gemini.
