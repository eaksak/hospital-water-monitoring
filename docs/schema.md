# 🗂️ Schema Reference

> Complete column-by-column definitions for all sheets in the **Hospital Water Monitoring System**.

---

## 📑 Table of Contents

1. [Raw_Water_Data](#-raw_water_data-main-fact-table)
2. [OPD_Data](#-opd_data)
3. [Master_Building](#-master_building)
4. [Meter_Data](#-meter_data)
5. [Lookup](#-lookup)
6. [Data Types & Conventions](#-data-types--conventions)

---

## 💧 Raw_Water_Data (Main Fact Table)

The core sheet — one row per month, 25 columns.

| Col | Field | Type | Source | Formula / Notes |
|---|---|---|---|---|
| **A** | ปี (พ.ศ.) | Integer | Manual | Buddhist Era year, e.g. `2569` |
| **B** | เดือน | String | Manual | Thai month: `ม.ค`, `ก.พ.`, `มี.ค.`, ... |
| **C** | เลขเดือน | Integer | Formula | `=XLOOKUP(B2, Lookup!$A$2:$A$14, Lookup!$B$2:$B$14)` |
| **D** | วันที่ | Date | Formula | `=DATE(A2-543, C2, 1)` (convert พ.ศ. → ค.ศ.) |
| **E** | น้ำประปาเทศบาล | Number (m³) | Manual / API | Municipal water usage |
| **F** | น้ำประปาโรงผลิต | Number (m³) | Manual / API | On-site plant water |
| **G** | ปริมาณใช้รวม | Number (m³) | Formula | `=E2+F2` |
| **H** | OPD Visit | Integer | Formula | `=SUMIFS(OPD_Data!$B:$B, OPD_Data!$A:$A, ">="&D2, OPD_Data!$A:$A, "<="&EOMONTH(D2,0))` |
| **I** | IPD Admit | Integer | Formula | `=SUMIFS(OPD_Data!$C:$C, OPD_Data!$A:$A, ">="&D2, OPD_Data!$A:$A, "<="&EOMONTH(D2,0))` |
| **J** | ลิตร/OPD | Decimal | Formula | `=IFERROR(G2*1000/H2, 0)` |
| **K** | ลิตร/IPD | Decimal | Formula | `=IFERROR(G2*1000/I2, 0)` |
| **L** | Patient Day | Decimal | Formula | `=SUMIFS(OPD_Data!$D:$D, OPD_Data!$A:$A, ">="&D2, OPD_Data!$A:$A, "<="&EOMONTH(D2,0))` |
| **M** | ลิตร/Patient Day | Decimal | Formula | `=IFERROR(G2*1000/L2, 0)` |
| **N** | ระดับน้ำสำรอง | Number (m³) | Manual / Meter_Data | Latest reserve reading of the month |
| **O** | ใช้เฉลี่ย/วัน | Decimal | Formula | `=IFERROR(G2/DAY(EOMONTH(D2,0)), 0)` |
| **P** | ใช้ได้อีก (วัน) | Decimal | Formula | `=IFERROR(N2/O2, 0)` ⚠️ **Critical safety KPI** |
| **Q** | อาคารผู้ป่วยใน (usage) | Number (m³) | Formula | SUMIFS from Meter_Data |
| **R** | อาคารผู้ป่วยนอก (usage) | Number (m³) | Formula | SUMIFS from Meter_Data |
| **S** | อาคารสนับสนุน (usage) | Number (m³) | Formula | SUMIFS from Meter_Data (support + doctor residence) |
| **T** | Target ผู้ป่วยใน | Number (m³) | Formula | `=XLOOKUP("อาคารผู้ป่วยใน", Master_Building!$B:$B, Master_Building!$C:$C)` |
| **U** | Target ผู้ป่วยนอก | Number (m³) | Formula | XLOOKUP from Master_Building |
| **V** | Target สนับสนุน | Number (m³) | Formula | SUMIF (support + doctor residence) |
| **W** | ผลต่าง ผู้ป่วยใน | Decimal | Formula | `=Q2-T2` |
| **X** | ผลต่าง ผู้ป่วยนอก | Decimal | Formula | `=R2-U2` |
| **Y** | ผลต่าง สนับสนุน | Decimal | Formula | `=S2-V2` |

### 🎨 Conditional Formatting

| Column | Rule | Color |
|---|---|---|
| **P** | Value < 3.5 | 🔴 `#f4c7c3` |
| **P** | 3.5 ≤ Value < 4.0 | 🟡 `#fce8b2` |
| **P** | Value ≥ 4.0 | 🟢 `#d9ead3` |
| **W/X/Y** | Value > 0 (over target) | 🔴 (optional) |
| **W/X/Y** | Value ≤ 0 (under target) | 🟢 (optional) |

---

## 🏥 OPD_Data

Hospital patient load — feeds columns H, I, L in Raw_Water_Data.

| Col | Field | Type | Notes |
|---|---|---|---|
| **A** | Date | Date | Month-end date (e.g. `2024-01-31`) or daily records |
| **B** | OPD Visit | Integer | Outpatient visits count |
| **C** | IPD Admit | Integer | Inpatient admissions count |
| **D** | Patient Day | Decimal | Total patient-days (bed occupancy × days) |

**Entry pattern**: One row per month (end-of-month date) is simplest; daily rows also work — SUMIFS aggregates automatically.

---

## 🏢 Master_Building

Building targets master — feeds columns T, U, V in Raw_Water_Data.

| Col | Field | Type | Example |
|---|---|---|---|
| **A** | BuildingID | String | `B01`, `B02`, ... |
| **B** | BuildingName | String | `อาคารผู้ป่วยใน`, `อาคารผู้ป่วยนอก`, `อาคารสนับสนุน`, `อาคารพักแพทย์` |
| **C** | Target (ลบ.ม./เดือน) | Number | `6360`, `1200`, `700`, `350` |
| **D** | Meter Code | String | `MTR-01`, `MTR-02`, ... |

**Note**: `อาคารสนับสนุน` (700) + `อาคารพักแพทย์` (350) sum to 1050 to match the combined Support target in the original design.

---

## 📟 Meter_Data

Per-building meter readings — feeds Q, R, S, N in Raw_Water_Data.

| Col | Field | Type | Notes |
|---|---|---|---|
| **A** | Date | Date | Reading date |
| **B** | Meter Code | String | FK → Master_Building.D |
| **C** | Building Name | String | For readability + SUMIFS filter |
| **D** | Usage (ลบ.ม.) | Number | Water consumed since last reading |
| **E** | Reserve Level (ลบ.ม.) | Number | Optional — reservoir level snapshot |

---

## 🔤 Lookup

Thai month name → month number mapping.

| Col | Field | Type | Values |
|---|---|---|---|
| **A** | เดือน | String | `ม.ค`, `ก.พ.`, `มี.ค.`, ..., `ธ.ค.` (+ `ม.ค.` fallback) |
| **B** | เลขเดือน | Integer | `1` through `12` |

⚠️ **Important**: Row 2 uses `ม.ค` (no dot) to match the original data; row 14 has `ม.ค.` (with dot) as a fallback variant.

---

## 📏 Data Types & Conventions

### 🗓️ Date Handling

- **User-facing years**: Buddhist Era (พ.ศ.) — e.g. `2569`
- **Internal date columns** (D, OPD_Data.A, Meter_Data.A): Gregorian (ค.ศ.) — e.g. `2026-03-01`
- **Conversion**: `ค.ศ. = พ.ศ. - 543`

### 📐 Units

| Metric | Unit | Notation |
|---|---|---|
| Water volume | Cubic meters | `ลบ.ม.` (m³) |
| Efficiency KPIs | Liters | `L` (1 m³ = 1,000 L) |
| Time (reserve) | Days | `วัน` |
| Patient Day | Person-days | Decimal (e.g. `5460.65`) |

### 🔢 Number Formatting

- **Thai locale**: `1,234.56` (comma thousands, dot decimal)
- **Precision**: 2 decimal places for KPIs; integers for counts
- **Zero handling**: Empty months show `0` (not blank) to keep formulas stable

### 🔑 Key Constraints

- `(Year, Month)` in Raw_Water_Data must be **unique** — enforced by manual pre-population
- `BuildingName` in Master_Building must **exactly match** values in Meter_Data.C
- `Meter Code` format: `MTR-XX` (2-digit suffix)

---

## 📚 Related Documents

- 📐 [Architecture](architecture.md) — System design & ERD
- 🛠️ [Setup Guide](setup-guide.md) — Installation walkthrough
- 🌐 [API Reference](api.md) — REST endpoint details
- 📄 [Main README](../README.md) — Project overview
