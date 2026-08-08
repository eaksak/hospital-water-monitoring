# 💧 Hospital Water Monitoring System

> A lightweight, spreadsheet-based water usage tracking system built on **Google Sheets + Google Apps Script** — designed for hospitals to monitor water consumption, hospital load metrics (OPD/IPD/Patient Day), reserve safety, and building-level targets.

![Platform](https://img.shields.io/badge/platform-Google%20Sheets-34a853?logo=google-sheets&logoColor=white)
![Apps Script](https://img.shields.io/badge/Apps%20Script-JavaScript-4285f4?logo=google&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)
![Language](https://img.shields.io/badge/language-Thai%20%2B%20English-orange.svg)

---

## 🌟 Overview

This project transforms an ordinary Google Sheets workbook into a **complete water monitoring platform** for hospital facility management. It replaces external Excel dependencies with self-contained sheets, adds automated safety alerts, and provides a REST API endpoint for IoT sensor integration — all without leaving the Google Workspace ecosystem.

**Perfect for**: hospital facility managers, water utility engineers, or any organization tracking multi-source water consumption against operational KPIs.

---

## ✨ Key Features

- 📊 **Multi-source tracking** — municipal water + on-site production plant, auto-summed
- 🏥 **Hospital load integration** — OPD Visits, IPD Admissions, Patient Days
- 📈 **Efficiency KPIs** — auto-calculated liters per OPD / IPD / Patient Day
- 🛡️ **Reserve safety monitoring** — days of backup water remaining
- 🚨 **Automatic email alerts** when water reserve drops below 3.5 days
- 🏢 **Building-level variance** — actual usage vs monthly targets (3+ buildings)
- 📧 **Monthly summary emails** with all KPIs in one report
- 🌐 **REST API endpoint** for IoT sensors and mobile apps
- 🎨 **Conditional formatting** — red/yellow/green visual alerts on reserve days
- 🖥️ **Sidebar entry form** in Thai — non-technical staff friendly
- ⚡ **Auto-recheck on edit** — validates data as you type

---

## 🏗️ System Architecture

```
┌──────────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│   Data Sources        │ →  │  Google Sheets        │ →  │  Notification Layer   │
│   • Manual entry      │     │  (5 sheets)           │     │  • Email alerts       │
│   • IoT sensors       │     │  • Raw_Water_Data     │     │  • Monthly reports    │
│   • Google Forms      │     │  • OPD_Data           │     │  • Sidebar UI         │
│   • REST API (doPost) │     │  • Master_Building    │     └──────────────────────┘
└──────────────────────┘     │  • Meter_Data         │
                              │  • Lookup             │
                              └──────────────────────┘                                        ↓
                              ┌──────────────────────┐
                              │  Apps Script Engine   │
                              │  • Validation         │
                              │  • KPI calculation    │
                              │  • Alert triggers     │
                              │  • REST endpoints     │
                              └──────────────────────┘
```

### 📂 Sheet Structure

| Sheet | Purpose | Key Columns |
|---|---|---|
| **Raw_Water_Data** | Main fact table (monthly) | Year, Month, Municipal, Plant, Total, KPIs, Reserve, Targets |
| **OPD_Data** | Hospital patient load | Date, OPD Visit, IPD Admit, Patient Day |
| **Master_Building** | Building targets master | BuildingID, Name, Target (m³/month), Meter Code |
| **Meter_Data** | Per-building meter log | Date, Meter Code, Building, Usage, Reserve Level |
| **Lookup** | Thai month → number | เดือน, เลขเดือน |

---

## 🚀 Quick Start

### Prerequisites

- A Google account (personal Gmail or Google Workspace)
- Basic familiarity with Google Sheets

### Installation (5 minutes)

1. **Create a new Google Sheet** or copy the [template link](#-google-sheets-template)
2. Rename the first sheet to `Raw_Water_Data` and set up columns A-Y (see [docs/schema.md](docs/schema.md))
3. Go to **Extensions → Apps Script**
4. Delete any existing code and **paste the contents of** [`src/Code.gs`](src/Code.gs)
5. Update the config at the top of the file:
   ```javascript
   const CONFIG = {
     ALERT_EMAIL: 'your-email@example.com',  // 👈 CHANGE THIS
     RESERVE_WARNING_DAYS: 4.0,
     RESERVE_CRITICAL_DAYS: 3.5,
     // ...
   };
   ```
6. **Save** (Ctrl+S) and **reload** the spreadsheet
7. A new **💧 Water DB** menu will appear in the toolbar
8. Click **💧 Water DB → 🏗️ สร้างชีตประกอบ (Setup)** to auto-create all support sheets
9. Click **💧 Water DB → 🎨 ติดตั้ง Conditional Formatting** to enable color-coded alerts
10. Authorize the requested permissions (Sheets + Gmail) on first run ✅

---

## 📖 Usage Guide

### ➕ Recording Monthly Data

**Option A — Sidebar Form (Recommended for staff)**

1. Click **💧 Water DB → ➕ บันทึกข้อมูลรายเดือน**
2. Fill in: Year (พ.ศ.), Month, Municipal Water, Plant Water, Reserve Level
3. Click **💾 บันทึกข้อมูล**

**Option B — Direct Cell Entry**

Type values directly into columns E (Municipal) and F (Plant). The `onEdit` trigger will automatically recheck reserve status.

**Option C — REST API (for IoT sensors)**

Deploy the script as a web app (see [API Reference](#-api-reference)) and POST JSON:

```bash
curl -X POST 'YOUR_WEB_APP_URL' \
  -H 'Content-Type: application/json' \
  -d '{"year":2569,"month":"มี.ค.","municipal":250,"plant":8000,"reserve":1100}'
```

### 📊 Running Reports

| Menu Item | What It Does |
|---|---|
| 🚨 ตรวจสอบน้ำสำรองทุกเดือน | Scans all months and shows reserve status with 🔴🟡🟢 icons |
| 📊 รายงานเทียบ Target อาคาร | Shows variance between actual and target for each building |
| 📧 ส่งรายงานสรุปทางอีเมล | Emails the latest month's full KPI summary |

### ⏰ Automated Triggers (Optional)

In Apps Script → **Triggers** (⏰ icon):

- **Monthly summary**: `sendMonthlySummary` → Time-driven → Month timer → Day 1, 7-8 AM
- **On-edit safety check**: works automatically (simple trigger, no setup needed)

---

## 🌐 API Reference

### Deploy as Web App

1. In Apps Script → **Deploy → New deployment**
2. Type: **Web app**
3. Execute as: **Me**
4. Access: **Anyone** (or restrict as needed)
5. Copy the deployment URL

### Endpoints

#### `GET /` — Health Check

```json
{
  "service": "Hospital Water Monitoring",
  "status": "online",
  "timestamp": "2026-08-08T15:05:00.000Z"
}
```

#### `POST /` — Submit Monthly Reading

**Request body:**

```json
{
  "year": 2569,
  "month": "มี.ค.",
  "municipal": 250,
  "plant": 8000,
  "reserve": 1100
}
```

**Response:**

```json
{
  "status": "✅ บันทึก มี.ค. 2569 เรียบร้อย"
}
```

---

## ⚙️ Configuration

All settings live in the `CONFIG` object at the top of `Code.gs`:

| Setting | Default | Description |
|---|---|---|
| `SHEET_NAME` | `'Raw_Water_Data'` | Main data sheet name |
| `ALERT_EMAIL` | `'YOUR_EMAIL@example.com'` | Recipient for alerts & reports |
| `RESERVE_WARNING_DAYS` | `4.0` | 🟡 Yellow threshold (days of water left) |
| `RESERVE_CRITICAL_DAYS` | `3.5` | 🔴 Red threshold + triggers email |

---

## 📊 Sample Data

The [`sample-data/`](sample-data/) folder contains:

- `example-raw-water-data.xlsx` — 26 months of anonymized hospital data (2567–2569 พ.ศ. / 2024–2026)
- `example-opd-data.xlsx` — Corresponding OPD/IPD/Patient Day records

**Insights you can explore:**

- 📉 Municipal water dropped from ~900 m³ to ~250 m³/month as the plant took over
- 📈 Efficiency improved: liters/OPD dropped from ~380 to ~280 (~26% reduction)
- ⚠️ Water reserve buffer averages 3.15–4.2 days — the tightest safety metric
- 🏢 Support building consistently under target; OPD building normalized after 2567

---

## 🗂️ Project Structure

```
hospital-water-monitoring/
├── README.md                    ← You are here
├── LICENSE                      ← MIT
├── .gitignore
├── src/
│   ├── Code.gs                  ← Main Apps Script file
│   └── appsscript.json          ← Manifest (from clasp)
├── docs/
│   ├── architecture.md          ← System design details
│   ├── schema.md                ← Column-by-column schema
│   ├── setup-guide.md           ← Detailed installation
│   └── screenshots/
│       ├── dashboard.png
│       ├── entry-form.png
│       └── alert-email.png
├── sample-data/
│   ├── example-raw-water-data.xlsx
│   └── example-opd-data.xlsx
└── sheets-template/
    └── template-link.md         ← Public Google Sheets template URL
```

---

## 🛠️ Development

### Local Development with clasp

```bash
# Install Google's official CLI
npm install -g @google/clasp

# Login
clasp login

# Clone your Apps Script project
clasp clone <YOUR_SCRIPT_ID>

# Edit in VS Code, then push
clasp push

# Or pull remote changes
clasp pull
```

### Contributing

Contributions are welcome! Please:

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 🗺️ Roadmap

- [x] Multi-source water tracking
- [x] Automated email alerts
- [x] REST API endpoint
- [x] Building-level variance reports
- [ ] 📊 HTML dashboard with Chart.js
- [ ] 📱 Google Forms integration for field data collection
- [ ] 🧮 WQI (Water Quality Index) calculation module
- [ ] 📉 Predictive analytics (usage forecasting)
- [ ] 🌍 Multi-language support (English/Thai toggle)
- [ ] 📲 Progressive Web App (PWA) frontend

---

## ⚠️ Known Limitations

- **Email quota**: Free Gmail = 100 emails/day; Google Workspace = 1,500/day via Apps Script
- **External file links**: The original Excel referenced external workbooks — these must be recreated as local sheets (handled by `setupSupportSheets()`)
- **Thai month "ม.ค"**: Original data uses "ม.ค" (no trailing dot) for January while other months have dots — the Lookup sheet handles both variants
- **Days-per-month rounding**: The formula `=G/30` in the original file is approximate; recommended replacement: `=G/DAY(EOMONTH(D,0))`

---

## 🔐 Security Notes

Before pushing to a **public** repository:

- ✅ Replace real emails with `YOUR_EMAIL@example.com`
- ✅ Remove any internal hospital identifiers, meter codes, or facility names
- ✅ Anonymize sample data (use fictional building names)
- ✅ Never commit `.clasp.json` (contains your Script ID) — see `.gitignore`

---

## 📸 Screenshots

> _Add your screenshots to `docs/screenshots/` and reference them here._

**Sidebar Entry Form**
![Entry Form](docs/screenshots/entry-form.png)

**Reserve Status Dashboard**
![Dashboard](docs/screenshots/dashboard.png)

**Automated Alert Email**
![Alert Email](docs/screenshots/alert-email.png)

---

## 📚 Documentation

- 📐 [System Architecture](docs/architecture.md) — ERD, data flow, design decisions
- 🗂️ [Schema Reference](docs/schema.md) — Column definitions for all 5 sheets
- 🛠️ [Setup Guide](docs/setup-guide.md) — Step-by-step installation
- 🌐 [API Reference](docs/api.md) — REST endpoints & example requests

---

## 🙏 Acknowledgments

- Inspired by hospital facility management needs in Thailand 🇹🇭
- Built with [Google Apps Script](https://developers.google.com/apps-script)
- Icons from [Emojipedia](https://emojipedia.org)

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 📬 Contact

**Eaksak Tepaya**
- GitHub: [@eaksak](https://github.com/eaksak)
- Email: eaksaktepaya@gmail.com
---

## ⭐ Star History

If you find this project useful, please consider giving it a star! ⭐ It helps others discover the project.

```
⭐ Star this repo → https://github.com/eaksak/hospital-water-monitoring
```

---

<div align="center">

**Built with 💧 for hospital facility teams**

Made with ❤️ using Google Apps Script

</div>
