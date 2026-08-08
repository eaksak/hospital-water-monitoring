# 🛠️ Setup Guide

> Step-by-step installation guide for the **Hospital Water Monitoring System** — from empty Google Sheet to fully operational system in **under 15 minutes**. ⏱️

---

## 📑 Table of Contents

1. [Prerequisites](#-prerequisites)
2. [Installation](#-installation)
3. [Configuration](#-configuration)
4. [Verification](#-verification)
5. [Optional: Automated Triggers](#-optional-automated-triggers)
6. [Optional: REST API Deployment](#-optional-rest-api-deployment)
7. [Troubleshooting](#-troubleshooting)
8. [FAQ](#-faq)

---

## ✅ Prerequisites

| Requirement | Details |
|---|---|
| **Google Account** | Personal Gmail or Google Workspace |
| **Browser** | Chrome, Firefox, Edge, or Safari (latest) |
| **Permissions** | Ability to create Google Sheets & authorize Apps Script |
| **Time** | ~15 minutes for full setup |

**No installation required on your computer** — everything runs in the browser. ☁️

---

## 🚀 Installation

### Step 1️⃣: Create a New Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com)
2. Click **➕ Blank** to create a new spreadsheet
3. Rename it to `Hospital Water Monitoring` (top-left)

### Step 2️⃣: Prepare the Main Sheet

1. Rename the default `Sheet1` to **`Raw_Water_Data`** (right-click tab → Rename)
2. Add the 25 column headers in row 1:

```
A: ปี (พ.ศ.)          B: เดือน              C: เลขเดือน          D: วันที่
E: น้ำประปาเทศบาล      F: น้ำประปาโรงผลิต    G: ปริมาณใช้รวม
H: OPD Visit          I: IPD Admit          J: ลิตร/OPD
K: ลิตร/IPD           L: Patient Day        M: ลิตร/Patient Day
N: ระดับน้ำสำรอง       O: ใช้เฉลี่ย/วัน       P: ใช้ได้อีก (วัน)
Q: อาคารผู้ป่วยใน      R: อาคารผู้ป่วยนอก    S: อาคารสนับสนุน
T: Target ผู้ป่วยใน    U: Target ผู้ป่วยนอก  V: Target สนับสนุน
W: ผลต่าง ผู้ป่วยใน    X: ผลต่าง ผู้ป่วยนอก  Y: ผลต่าง สนับสนุน
```

3. Pre-populate columns A & B with (Year, Month) pairs for the periods you want to track (e.g. 12 months × 3 years = 36 rows)

### Step 3️⃣: Install the Apps Script

1. Click **Extensions → Apps Script** in the menu bar
2. A new tab opens with the script editor
3. **Delete** any existing code in `Code.gs`
4. **Paste** the complete contents of [`src/Code.gs`](../src/Code.gs) from this repo
5. Save with **Ctrl+S** (or Cmd+S on Mac)
6. Name the project: `Hospital Water Monitoring`

### Step 4️⃣: Reload the Spreadsheet

Go back to your Google Sheet browser tab and **refresh the page** (F5).

You should now see a new **💧 Water DB** menu in the toolbar. 🎉

---

## ⚙️ Configuration

### Update Your Email

In the Apps Script editor, find this section near the top of `Code.gs`:

```javascript
const CONFIG = {
  SHEET_NAME: 'Raw_Water_Data',
  ALERT_EMAIL: 'YOUR_EMAIL@example.com',   // 👈 CHANGE THIS
  RESERVE_WARNING_DAYS: 4.0,
  RESERVE_CRITICAL_DAYS: 3.5,
  // ...
};
```

Replace `'YOUR_EMAIL@example.com'` with your real email address, then **save** (Ctrl+S).

### Adjust Thresholds (Optional)

| Setting | Default | When to Change |
|---|---|---|
| `RESERVE_WARNING_DAYS` | `4.0` | Increase if you want earlier warnings |
| `RESERVE_CRITICAL_DAYS` | `3.5` | Match your hospital's emergency policy |

---

## ✅ Verification

### Run the Setup Wizard

1. In your Google Sheet, click **💧 Water DB → 🏗️ สร้างชีตประกอบ (Setup)**
2. On first run, Google will show an **authorization dialog**:
   - Click **Continue**
   - Choose your Google account
   - You may see a "Google hasn't verified this app" warning → click **Advanced → Go to Hospital Water Monitoring (unsafe)** ⚠️
   - Click **Allow** to grant permissions (Sheets + Gmail)
3. The wizard creates 4 sheets: **Lookup**, **OPD_Data**, **Master_Building**, **Meter_Data**
4. You'll see a success dialog: `✅ สร้างชีตประกอบเรียบร้อย!`

### Install Conditional Formatting

Click **💧 Water DB → 🎨 ติดตั้ง Conditional Formatting**

Column **P** (ใช้ได้อีก) will now show red/yellow/green colors based on days of reserve remaining.

### Test Data Entry

1. Click **💧 Water DB → ➕ บันทึกข้อมูลรายเดือน**
2. A sidebar opens on the right
3. Fill in test values:
   - Year: `2569`
   - Month: `ส.ค.`
   - Municipal: `250`
   - Plant: `8000`
   - Reserve: `1100`
4. Click **💾 บันทึกข้อมูล**
5. You should see: `✅ บันทึก ส.ค. 2569 เรียบร้อย`
6. Check the corresponding row in **Raw_Water_Data** — values should appear in columns E, F, N

### Test Report Generation

Click **💧 Water DB → 🚨 ตรวจสอบน้ำสำรองทุกเดือน**

A dialog should show reserve status for all months with data.

---

## ⏰ Optional: Automated Triggers

Set up scheduled tasks so reports run automatically.

### Monthly Summary Email

1. In Apps Script editor → click the **⏰ Triggers** icon (left sidebar)
2. Click **+ Add Trigger** (bottom-right)
3. Configure:
   - Function: `sendMonthlySummary`
   - Deployment: `Head`
   - Event source: `Time-driven`
   - Type: `Month timer`
   - Day: `1st`
   - Time: `7am to 8am`
4. Click **Save**
5. Authorize when prompted

### On-Edit Safety Check

Already works automatically! ✅ No trigger setup needed — Apps Script's `onEdit` simple trigger runs whenever anyone edits the sheet.

---

## 🌐 Optional: REST API Deployment

Enable IoT sensors or mobile apps to POST readings directly.

### Deploy as Web App

1. In Apps Script editor → click **Deploy → New deployment**
2. Click the **⚙️ gear icon** next to "Select type" → **Web app**
3. Configure:
   - Description: `Water Monitoring API v1.0`
   - Execute as: **Me** (your account)
   - Who has access: **Anyone** (or restrict to your domain)
4. Click **Deploy**
5. Copy the **Web app URL** — save it somewhere safe 📋

### Test with curl

```bash
# Health check
curl 'YOUR_WEB_APP_URL'

# Submit a reading
curl -X POST 'YOUR_WEB_APP_URL' \
  -H 'Content-Type: application/json' \
  -d '{"year":2569,"month":"ก.ย.","municipal":260,"plant":8100,"reserve":1150}'
```

See [`docs/api.md`](api.md) for full API reference.

---

## 🔧 Troubleshooting

### ❌ "💧 Water DB" menu doesn't appear

**Cause**: `onOpen()` didn't fire, or script wasn't saved
**Fix**:
1. Verify the script was saved (Ctrl+S)
2. Refresh the spreadsheet (F5)
3. If still missing, manually run `onOpen()` from the script editor once

### ❌ "Authorization required" error

**Cause**: First-time authorization not completed
**Fix**:
1. Run any menu item → follow the authorization dialog
2. Click **Advanced → Go to project (unsafe)** if warning appears
3. Grant all requested permissions

### ❌ Formulas show `#REF!` or `#N/A`

**Cause**: Support sheets missing or misnamed
**Fix**:
1. Run **💧 Water DB → 🏗️ สร้างชีตประกอบ (Setup)** to (re)create them
2. Verify sheet names: `Lookup`, `OPD_Data`, `Master_Building`, `Meter_Data` (exact spelling)

### ❌ Email alerts not sending

**Cause**: `ALERT_EMAIL` not configured, or Gmail quota exceeded
**Fix**:
1. Check `CONFIG.ALERT_EMAIL` in `Code.gs`
2. Manually run `sendMonthlySummary()` to see error messages
3. Check daily quota: free Gmail = 100 emails/day; Workspace = 1,500/day

### ❌ Column C (เลขเดือน) shows `#N/A`

**Cause**: Month value in column B doesn't match any row in Lookup sheet
**Fix**:
1. Check for extra spaces: `ม.ค.` vs `ม.ค. ` (trailing space)
2. Verify dot vs no-dot variant: January uses `ม.ค` (no dot) in original data
3. Add missing variant to Lookup sheet

### ❌ "Exception: Service invoked too many times: MailApp"

**Cause**: Daily email quota exhausted
**Fix**:
1. Wait 24 hours for quota reset
2. Upgrade to Google Workspace for higher quota
3. Batch multiple alerts into a single email

### ❌ Sidebar form doesn't submit

**Cause**: JavaScript error in browser
**Fix**:
1. Open browser DevTools (F12) → Console tab
2. Look for errors when clicking Save
3. Verify `addMonthlyReading` function exists in `Code.gs`

---

## ❓ FAQ

### **Q: Can multiple people edit the sheet simultaneously?**
**A**: Yes ✅ — Google Sheets natively supports multi-user editing. Apps Script functions run per-user but write to the same sheet.

### **Q: What happens if I edit a cell that has a formula?**
**A**: The formula is **overwritten** with your static value. To restore, copy the formula from a neighboring row.

### **Q: How do I add a new building?**
**A**:
1. Add a row in **Master_Building** with the new building's info
2. Add corresponding Meter_Data entries with the new building name
3. If it's a 4th tracked building, add new columns Q4/R4/T4/W4 in Raw_Water_Data with matching SUMIFS/XLOOKUP formulas

### **Q: Can I use this without Thai language?**
**A**: Yes — replace Thai month names in the `Lookup` sheet and `THAI_MONTHS` constant with English equivalents. All column headers can be renamed too.

### **Q: How do I export data for external analysis?**
**A**: **File → Download → CSV / Excel / PDF**, or use Google Sheets' native BigQuery / Data Studio connectors.

### **Q: What's the maximum data volume?**
**A**: Google Sheets supports **10 million cells per sheet**. With 25 columns, that's ~400,000 rows — more than 30,000 years of monthly data. 😄

### **Q: Can I restore accidentally deleted data?**
**A**: Yes — **File → Version history → See version history** shows every edit with timestamps. Restore any prior version.

### **Q: Is my data secure?**
**A**: Data is stored in your Google Drive with Google's default encryption (in transit + at rest). Sharing permissions are controlled by you. See [Architecture → Security Model](architecture.md#-security-model).

---

## 📚 Next Steps

Once setup is complete, explore:

- 📖 [Usage Guide (README)](../README.md#-usage-guide) — Daily operations
- 🌐 [API Reference](api.md) — Integrate IoT sensors
- 📐 [Architecture](architecture.md) — Understand system design
- 🗂️ [Schema Reference](schema.md) — Column-by-column details

---

<div align="center">

**Need help?** Open an issue on [GitHub](https://github.com/your-username/hospital-water-monitoring/issues)

</div>
