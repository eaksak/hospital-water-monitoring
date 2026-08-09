# System architecture

## Purpose

The system is a lightweight facilities-management application built as a bound Google Apps Script project. Google Sheets is the operational datastore and audit surface. The solution must not store patient-identifiable or clinical data.

## Components

| Layer | Components | Responsibility |
|---|---|---|
| Input | Sidebar, direct approved cells, authenticated API | Collect monthly readings |
| Storage | Nine Google Sheets tabs | Store facts, master data, and logs |
| Calculation | Native formulas | Calculate totals, hospital-load KPIs, reserve days, and variance |
| Automation | Apps Script | Validate, lock writes, send alerts, maintain dashboards and triggers |
| Output | Dashboard sheet, period web dashboard, PDF print report, email, JSON | Present information and notify managers |

## Data flow

1. A reading enters through the sidebar, approved input cells, or the API.
2. Server-side validation normalizes Thai months and rejects invalid or negative values.
3. A document lock serializes writes.
4. The application upserts the `(B.E. year, month)` record and restores controlled formulas.
5. Formulas aggregate OPD/IPD/Patient Day and building meter data.
6. The reserve engine sends at most one critical alert per month and records it.
7. The audit log and dashboard are refreshed.

## Period-report calculation flow

1. The dashboard sends authenticated `fromKey` and `toKey` month keys to Apps Script.
2. The server clamps the request to populated months, normalizes a reversed range, and returns only the selected records.
3. The immediately preceding equal number of populated months becomes the comparison period when available.
4. Pure calculation functions aggregate water sources, service-load efficiency, reserve thresholds, and building variances.
5. Rule-based analysis returns separate observed findings and recommended actions. It does not call an external AI service.
6. The browser draws dependency-free SVG charts and prints the current report as an A4 landscape PDF.

## Security model

- Google Drive sharing controls access to the workbook and bound script.
- API writes require a generated `API_KEY` stored only in Script Properties.
- The web dashboard requires a different generated `DASHBOARD_TOKEN`.
- Secrets and Apps Script IDs are excluded from Git.
- Installable triggers, rather than simple edit triggers, perform authorized email operations.
- The narrowest possible Web App access setting should be selected during deployment.
- Only aggregate facility information is allowed; no patient-identifiable data.
- Period analysis is calculated on the server after dashboard-token validation; the token is never printed in the report.

## Reliability controls

- `setupSystem()` is repeatable and preserves existing operational rows.
- Document locking prevents concurrent write collisions.
- Optional request IDs make API retries idempotent.
- `Alert_Log` prevents repeated emails for the same critical month.
- `Audit_Log` records application writes and source.
- Google Sheets version history remains the recovery mechanism.

## Scale boundary

This design suits monthly totals and modest daily building/activity records. It is not intended for per-second telemetry. Sensor gateways should aggregate raw readings before submission. Move to a managed database and time-series pipeline if volume, retention, availability, or access-control requirements exceed Google Sheets limits.
