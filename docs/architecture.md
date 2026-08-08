# 🏗️ System Architecture

> Technical design documentation for the **Hospital Water Monitoring System** — a Google Sheets + Apps Script platform for tracking hospital water consumption, efficiency KPIs, and reserve safety.

---

## 📑 Table of Contents

1. [Overview](#-overview)
2. [Design Principles](#-design-principles)
3. [High-Level Architecture](#-high-level-architecture)
4. [Component Breakdown](#-component-breakdown)
5. [Data Model (ERD)](#-data-model-erd)
6. [Data Flow](#-data-flow)
7. [Key Design Decisions](#-key-design-decisions)
8. [Security Model](#-security-model)
9. [Scalability Considerations](#-scalability-considerations)
10. [Technology Stack](#-technology-stack)

---

## 🌟 Overview

The Hospital Water Monitoring System is a **serverless, spreadsheet-native application** that transforms Google Sheets into a fully functional operational database. It eliminates the need for dedicated database servers, backend infrastructure, or specialized IT support — making it ideal for hospital facility teams with limited technical resources.

### 🎯 Design Goals

- ✅ **Zero infrastructure cost** — runs entirely on Google Workspace
- ✅ **Familiar UI** — spreadsheet interface non-technical staff already know
- ✅ **Self-contained** — no external dependencies or broken workbook links
- ✅ **Extensible** — REST API + Apps Script hooks for future integrations
- ✅ **Auditable** — every value visible in cells, no black-box logic
- ✅ **Multi-user** — Google Sheets handles concurrent editing natively

---

## 🧭 Design Principles

### 1. **Spreadsheet-First, Code-Assisted**

The **spreadsheet is the source of truth**, not a database behind a UI. Apps Script augments the sheet with automation, validation, and integrations — but users can always fall back to direct cell editing.

### 2. **One Workbook, Multiple Sheets**

Instead of scattered files (like the original Excel with `[1]OPD_Data!` external links), all data lives in **one Google Sheets workbook** with logically separated tabs. This eliminates broken references and simplifies backups.

### 3. **Formulas Over Scripts (When Possible)**

Calculations like `ลิตร/OPD`, `ใช้ได้อีก (วัน)`, and variance-vs-target use **native spreadsheet formulas**, not Apps Script. This keeps logic transparent and instantly recalculating.

### 4. **Scripts for Side Effects Only**

Apps Script handles what formulas cannot: sending emails, showing sidebars, exposing REST endpoints, and applying conditional formatting.

### 5. **Progressive Enhancement**

The system works at three levels of engagement:
- 🥉 **Basic**: Type numbers into cells → formulas calculate KPIs
- 🥈 **Intermediate**: Use the sidebar form → automatic validation & alerts
- 🥇 **Advanced**: POST to REST API from IoT sensors → fully automated pipeline

---

## 🏛️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          DATA INPUT LAYER                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ Manual Entry │  │ Sidebar Form │  │ Google Form  │  │ IoT / API  │  │
│  │ (direct cell)│  │ (Apps Script)│  │ (optional)   │  │ (doPost)   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘  │
│         └─────────────────┴──────────────────┴────────────────┘         │
└───────────────────────────────────┬──────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                         STORAGE LAYER (Google Sheets)                    │
│  ┌────────────────┐  ┌────────────┐  ┌──────────────────┐  ┌─────────┐ │
│  │Raw_Water_Data  │  │ OPD_Data   │  │ Master_Building  │  │ Lookup  │ │
│  │ (fact table)   │  │(hospital   │  │ (targets)        │  │(month   │ │
│  │  36 months × 25│  │ load)      │  │                  │  │ mapping)│ │
│  │  columns       │  │            │  │                  │  │         │ │
│  └────────────────┘  └────────────┘  └──────────────────┘  └─────────┘ │
│                              ┌──────────────┐                            │
│                              │ Meter_Data   │                            │
│                              │ (per-building│                            │
│                              │  usage log)  │                            │
│                              └──────────────┘                            │
└───────────────────────────────────┬──────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                      PROCESSING LAYER (Apps Script)                      │
│  ┌────────────────┐  ┌───────────────┐  ┌────────────────┐              │
│  │ Validation     │  │ KPI Calc      │  │ Alert Engine   │              │
│  │ (onEdit)       │  │ (formulas)    │  │ (thresholds)   │              │
│  └────────────────┘  └───────────────┘  └────────────────┘              │
│  ┌────────────────┐  ┌───────────────┐  ┌────────────────┐              │
│  │ Setup Wizard   │  │ Report Builder│  │ REST API       │              │
│  │(setupSheets)   │  │ (variance)    │  │ (doPost/doGet) │              │
│  └────────────────┘  └───────────────┘  └────────────────┘              │
└───────────────────────────────────┬──────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                       OUTPUT / NOTIFICATION LAYER                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ Email Alerts │  │ Sidebar UI   │  │ Menu Actions │  │ JSON API   │  │
│  │ (MailApp)    │  │ (HtmlService)│  │ (Ui.alert)   │  │ (Content   │  │
│  │              │  │              │  │              │  │  Service)  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🧩 Component Breakdown

### 📊 Storage Layer — 5 Sheets

| Sheet | Type | Rows | Purpose |
|---|---|---|---|
| **Raw_Water_Data** | Fact table | ~36/year | Main monthly readings + calculated KPIs |
| **OPD_Data** | Dimension | Daily or monthly | Patient load data (OPD/IPD/Patient Day) |
| **Master_Building** | Dimension | 4-10 | Building master with monthly targets |
| **Meter_Data** | Fact table | Per reading | Per-building water meter readings |
| **Lookup** | Reference | 12-13 | Thai month name → number mapping |

### ⚙️ Processing Layer — Apps Script Modules

| Module | Functions | Trigger |
|---|---|---|
| **Menu Builder** | `onOpen()` | Auto on sheet open |
| **Setup Wizard** | `setupSupportSheets()`, `setupFormatting()` | Manual (one-time) |
| **Data Entry** | `addMonthlyReading()`, `showEntryForm()` | Menu / Sidebar |
| **Safety Engine** | `checkReserveDays()`, `scanAllReserves()` | `onEdit` + manual |
| **Reporting** | `showVarianceReport()`, `sendMonthlySummary()` | Menu / Time trigger |
| **REST API** | `doPost()`, `doGet()` | HTTP request |
| **Utilities** | `getDataSheet()`, `num()`, `fmtVar()` | Internal helpers |

### 📡 Notification Layer

| Channel | Service | Use Case |
|---|---|---|
| Email | `MailApp.sendEmail()` | Critical alerts + monthly reports |
| UI Alert | `SpreadsheetApp.getUi().alert()` | On-demand reports |
| Sidebar | `HtmlService.createHtmlOutput()` | Data entry form |
| JSON | `ContentService` | REST API responses |

---

## 🗂️ Data Model (ERD)

```
┌──────────────────────────┐                    ┌──────────────────────────┐
│     Master_Building       │                    │        Lookup             │
├──────────────────────────┤                    ├──────────────────────────┤
│ 🔑 BuildingID (PK)        │                    │ 🔑 เดือน (PK)              │
│    BuildingName           │                    │    เลขเดือน                │
│    Target (m³/month)      │                    └──────────────────────────┘
│    MeterCode              │                              │
└─────────┬────────────────┘                              │ (referenced by
          │                                        │  Raw_Water_Data.C)
          │ 1:N                                        │
          ↓                                        ↓
┌──────────────────────────┐         ┌────────────────────────────────────┐
│      Meter_Data           │         │        Raw_Water_Data               │
├──────────────────────────┤         ├────────────────────────────────────┤
│ 🔑 (Date + MeterCode)     │         │ 🔑 (Year + Month)                    │
│    Date                   │         │    Year (พ.ศ.)                       │
│    MeterCode (FK)         │───────→ │    Month (ไทย)                       │
│    BuildingName           │  SUMIFS │    MonthNum (from Lookup)            │
│    Usage (m³)             │────────>│    Date                              │
│    ReserveLevel (m³)      │         │    Municipal (E)                     │
└──────────────────────────┘         │    Plant (F)                         │
                                      │    Total = E+F (G)                   │
┌──────────────────────────┐         │    OPD Visit (H) ←─SUMIFS──┐         │
│       OPD_Data            │         │    IPD Admit (I) ←─SUMIFS──┤         │
├──────────────────────────┤         │    Liter/OPD = G*1000/H (J)│         │
│ 🔑 Date (PK)              │         │    Liter/IPD (K)           │         │
│    OPD Visit              │─────────│    Patient Day (L)←SUMIFS──┘         │
│    IPD Admit              │  SUMIFS │    Liter/PatientDay (M)              │
│    Patient Day            │────────>│    ReserveLevel (N) ←─Meter_Data.E   │
└──────────────────────────┘         │    AvgPerDay = G/DaysInMonth (O)     │
                                      │    DaysLeft = N/O (P)                │
                                      │    Building usage (Q/R/S) ←─Meter    │
                                      │    Targets (T/U/V) ←─Master_Building │
                                      │    Variance (W/X/Y) = actual-target  │
                                      └────────────────────────────────────┘
```

### 🔑 Key Relationships

- **Raw_Water_Data ← Lookup** — via Thai month name (XLOOKUP)
- **Raw_Water_Data ← OPD_Data** — via date range (SUMIFS with EOMONTH)
- **Raw_Water_Data ← Meter_Data** — via building name + date range
- **Raw_Water_Data ← Master_Building** — via building name (XLOOKUP)
- **Meter_Data → Master_Building** — via MeterCode

### 🧮 Calculated Fields (Formulas)

| Column | Formula | Description |
|---|---|---|
| G | `=E+F` | Total water usage |
| J | `=G*1000/H` | Liters per OPD visit |
| K | `=G*1000/I` | Liters per IPD admission |
| M | `=G*1000/L` | Liters per patient day |
| O | `=G/DAY(EOMONTH(D,0))` | Average daily usage |
| P | `=N/O` | Days of reserve remaining |
| W | `=Q-T` | Variance: IPD building |
| X | `=R-U` | Variance: OPD building |
| Y | `=S-V` | Variance: Support building |

---

## 🔄 Data Flow

### Scenario 1: Monthly Data Entry (Manual)

```
Facility staff
    │
    ├─→ Opens sheet → clicks 💧 Water DB → ➕ บันทึกข้อมูลรายเดือน
    │
    ↓
Sidebar form (HtmlService)
    │
    ├─→ User fills Year, Month, Municipal, Plant, Reserve
    ├─→ Clicks "💾 บันทึกข้อมูล"
    │
    ↓
addMonthlyReading()
    │
    ├─→ Finds matching row by (Year + Month)
    ├─→ Writes to columns E, F, N
    ├─→ SpreadsheetApp.flush() forces formula recalc
    │
    ↓
Formulas cascade
    │
    ├─→ G = E+F recalculates
    ├─→ J/K/M recalculate (efficiency KPIs)
    ├─→ O recalculates (daily average)
    ├─→ P recalculates (days of reserve)
    │
    ↓
checkReserveDays(row)
    │
    ├─→ Reads column P
    ├─→ If P < 3.5 → MailApp.sendEmail() 🚨
    │
    ↓
Result returned to sidebar → user sees "✅ บันทึกเรียบร้อย"
```

### Scenario 2: IoT Sensor Push (REST API)

```
IoT sensor (or mobile app)
    │
    ├─→ POST https://script.google.com/.../exec
    │   Body: {"year":2569,"month":"มี.ค.","municipal":250,"plant":8000}
    │
    ↓
doPost(e)
    │
    ├─→ JSON.parse(e.postData.contents)
    ├─→ Calls addMonthlyReading() with parsed values
    │
    ↓
Same flow as Scenario 1 → formulas → alerts
    │
    ↓
ContentService.createTextOutput(JSON.stringify({status: "✅..."}))
    │
    ↓
IoT sensor receives 200 OK with status message
```

### Scenario 3: Monthly Summary Email (Scheduled)

```
Time-driven trigger (day 1 of month, 7 AM)
    │
    ↓
sendMonthlySummary()
    │
    ├─→ Scans Raw_Water_Data from bottom up
    ├─→ Finds latest row where Total (G) > 0
    │
    ↓
Builds multi-section email body
    │
    ├─→ 💧 Water usage (Municipal / Plant / Total)
    ├─→ 📈 Efficiency (L/OPD, L/IPD, L/PD)
    ├─→ 🛡️ Reserve status (level + days left)
    ├─→ 🏢 Variance vs target (3 buildings)
    │
    ↓
MailApp.sendEmail() → facility manager inbox 📧
```

---

## 🎯 Key Design Decisions

### 🔹 Decision 1: Google Sheets over Traditional Database

**Chosen**: Google Sheets + Apps Script
**Alternatives considered**: PostgreSQL, MongoDB, Airtable, Microsoft Access

**Rationale**:
- Hospital IT resources are limited; no DBA available
- Existing team already uses Excel/Sheets daily
- Multi-user editing works out of the box
- Free tier covers projected data volume (< 10,000 rows/year)
- Built-in versioning & audit trail (Sheets revision history)

**Trade-off**: Sacrifices query performance and complex reporting for **operational simplicity** and **zero infrastructure**.

---

### 🔹 Decision 2: Formulas over Apps Script for KPI Calculations

**Chosen**: Native formulas (SUMIFS, XLOOKUP, EOMONTH)
**Alternative**: Compute all KPIs in Apps Script and write values

**Rationale**:
- Formulas recalculate instantly on any input change
- Transparent — auditors can inspect any cell
- No Apps Script quota consumed
- Works even if a user disables scripts

**Trade-off**: Complex formulas can be harder to maintain than JavaScript functions.

---

### 🔹 Decision 3: Sheet-Based Storage Instead of PropertiesService

**Chosen**: Store all data in visible sheets
**Alternative**: Use `PropertiesService` for hidden config/state

**Rationale**:
- Data must remain human-readable and directly editable
- Non-technical staff can verify values without opening the script editor
- Backup = simple Sheets export (no separate JSON dump needed)

---

### 🔹 Decision 4: Thai Month Names as Primary Keys

**Chosen**: `("2569", "มี.ค.")` composite key
**Alternative**: `Date` object as key

**Rationale**:
- Matches Thai fiscal reporting conventions
- Aligns with existing hospital reports (already in Thai)
- Users type Thai months naturally

**Trade-off**: Requires a `Lookup` sheet to convert to numeric months for date arithmetic. Handled by column C (`MonthNum`).

---

### 🔹 Decision 5: Email as Primary Alert Channel

**Chosen**: `MailApp.sendEmail()`
**Alternatives**: SMS (Twilio), LINE Notify, Slack webhooks

**Rationale**:
- No external API keys needed
- Facility managers check email regularly
- Free (100/day free Gmail, 1500/day Workspace)

**Future enhancement**: Add LINE Notify for Thailand-specific real-time push (see [Roadmap](../README.md#-roadmap)).

---

## 🔐 Security Model

### 🛡️ Access Control

| Layer | Mechanism | Notes |
|---|---|---|
| **Sheet access** | Google Sheets sharing | Owner controls view/edit permissions |
| **Script execution** | OAuth scopes | User authorizes on first run |
| **REST API** | Deployment settings | Can restrict to domain or specific users |
| **Email sending** | User's Gmail identity | Emails sent AS the script deployer |

### 🔒 Data Protection

- ✅ **Encryption in transit**: HTTPS enforced by Google
- ✅ **Encryption at rest**: Google Drive default encryption
- ✅ **Audit log**: Google Sheets revision history (unlimited for Workspace)
- ⚠️ **PII considerations**: This system tracks water usage, not patient data — minimal PII exposure
- ⚠️ **Public API**: If deployed with "Anyone" access, use a shared secret in request body

### 🚨 Threat Model

| Threat | Mitigation |
|---|---|
| Accidental data deletion | Sheets revision history (Ctrl+Z / File → Version history) |
| Unauthorized script modification | Restrict script editor access to owners only |
| API abuse (spam) | Add rate limiting via `PropertiesService` |
| Email quota exhaustion | Batch alerts + prioritize critical over informational |
| Credential leakage on GitHub | `.gitignore` for `.clasp.json`; sanitize configs |

---

## 📈 Scalability Considerations

### 📊 Current Capacity

| Dimension | Current | Google Sheets Limit |
|---|---|---|
| Rows in Raw_Water_Data | ~36/year | 10 million cells/sheet |
| Total cells | ~900/year | 10 million/sheet |
| Concurrent editors | 5-10 | ~100 recommended |
| API requests | ~100/day | 20,000/day free tier |
| Email alerts | ~30/month | 100/day free, 1,500/day Workspace |

### 🚀 Growth Path

**Stage 1 (Current)**: ≤ 100 months of data (~10 years) → Google Sheets alone ✅

**Stage 2 (Growth)**: Multi-hospital deployment (10-50 sheets) → Central master sheet aggregating via IMPORTRANGE

**Stage 3 (Enterprise)**: > 100,000 rows or sub-second query needs → Migrate to:
- **BigQuery** for analytics (Sheets → BigQuery connector)
- **Cloud SQL** for transactional workload
- Keep Sheets as the **UI layer** on top of the database

### ⚡ Performance Optimizations

- Batch reads: `sheet.getDataRange().getValues()` instead of cell-by-cell
- Use `SpreadsheetApp.flush()` sparingly (forces sync)
- Cache lookups with `CacheService` for high-frequency API calls
- Limit conditional formatting to used ranges (P2:P100, not P:P)

---

## 🛠️ Technology Stack

### Core Platform

- **Google Sheets** — Storage + spreadsheet formulas
- **Google Apps Script** (V8 runtime) — JavaScript ES6+ execution
- **Google Workspace APIs** — Sheets, Gmail, Drive

### Apps Script Services Used

| Service | Purpose |
|---|---|
| `SpreadsheetApp` | Read/write cells, create sheets, conditional formatting |
| `MailApp` | Send alert & report emails |
| `HtmlService` | Sidebar UI (data entry form) |
| `ContentService` | REST API JSON responses |
| `UrlFetchApp` | (Future) external webhooks (LINE Notify, Slack) |
| `PropertiesService` | (Future) config storage, rate limiting |
| `CacheService` | (Future) lookup caching |

### Development Tools (Optional)

- **Node.js + npm** — For `clasp` CLI
- **@google/clasp** — Sync Apps Script ↔ local files ↔ Git
- **Visual Studio Code** — Local editing with autocomplete
- **Git + GitHub** — Version control & collaboration

### Standards Compliance

- ✅ **Thai date conventions** — Buddhist Era (พ.ศ.) years, Thai month abbreviations
- ✅ **ISO 8601 dates** in internal Date columns (OPD_Data, Meter_Data)
- ✅ **SI units** — cubic meters (ลบ.ม.) primary, liters for efficiency KPIs
- ✅ **UTF-8 encoding** — Full Thai character support

---

## 📚 Related Documents

- 🗂️ [Schema Reference](schema.md) — Column-by-column definitions
- 🛠️ [Setup Guide](setup-guide.md) — Installation walkthrough
- 🌐 [API Reference](api.md) — REST endpoint details
- 📄 [Main README](../README.md) — Project overview

---

## 📝 Changelog

| Version | Date | Changes |
|---|---|---|
| 1.0.0 | 2026-08 | Initial architecture documentation |

---

<div align="center">

**Questions or suggestions?** Open an issue on [GitHub](https://github.com/your-username/hospital-water-monitoring/issues)

</div>
