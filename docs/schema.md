# Data dictionary

## Raw_Water_Data

The composite business key is `(ปี พ.ศ., เดือน)`. Columns E, F, and N are inputs; calculated columns are maintained by the application.

| Col | Field | Type | Source |
|---:|---|---|---|
| A | ปี (พ.ศ.) | Integer | Input |
| B | เดือน | Thai month | Input |
| C | เลขเดือน | 1–12 | Formula |
| D | วันที่ | First day of month | Formula |
| E | น้ำประปาเทศบาล | m³ | Input |
| F | น้ำประปาโรงผลิต | m³ | Input |
| G | ปริมาณใช้รวม | m³ | Formula E+F |
| H–I | OPD Visit, IPD Admit | Count | Monthly sum from OPD_Data |
| J–K | ลิตร/OPD, ลิตร/IPD | Liter per activity | Formula |
| L | Patient Day | Count | Monthly sum from OPD_Data |
| M | ลิตร/Patient Day | Liter per patient day | Formula |
| N | ระดับน้ำสำรอง | m³ | Input |
| O | ใช้เฉลี่ย/วัน | m³/day | Formula using actual days in month |
| P | ใช้ได้อีก | Days | N/O |
| Q–S | การใช้น้ำ 3 อาคาร | m³ | Monthly sum from Meter_Data |
| T–V | Target 3 อาคาร | m³/month | Lookup from Master_Building |
| W–Y | ผลต่าง 3 อาคาร | m³ | Actual − target |

## OPD_Data

| Field | Type | Rule |
|---|---|---|
| Date | Date | One row per reporting day |
| OPD Visit | Non-negative integer | Daily total |
| IPD Admit | Non-negative integer | Daily admissions |
| Patient Day | Non-negative integer | Daily patient-day total |

## Master_Building

| Field | Type | Rule |
|---|---|---|
| BuildingID | Text | Unique, stable key |
| BuildingName | Text | Must match Meter_Data |
| Target | m³/month | Non-negative |
| Meter Code | Text | Approved meter identifier |
| Active | Boolean | Whether the mapping is active |

## Meter_Data

| Field | Type | Rule |
|---|---|---|
| Date | Date | Reading/aggregation date |
| Meter Code | Text | References Master_Building |
| Building Name | Text | References Master_Building |
| Usage | m³ | Non-negative aggregated usage |
| Reserve Level | m³ | Optional |
| Source | Text | manual, import, gateway, etc. |
| Note | Text | Optional operational note |

## Control sheets

- `Lookup`: Thai abbreviation to month number.
- `Dashboard`: generated management summary; do not use as input.
- `Alert_Log`: unique alert key, timestamp, period, days left, recipient, result.
- `Audit_Log`: timestamp, action, period, source, user, and details.
- `API_Log`: timestamp, request ID, action, status, and message.
