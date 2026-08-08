# Hospital Water Monitoring System

A production-ready Google Sheets + Google Apps Script starter for hospital water-use monitoring. The installer creates the workbook structure, formulas, validations, alerts, dashboards, logs, API keys, and scheduled triggers automatically.

## Included in version 1.0

- Monthly municipal and on-site production water tracking
- OPD, IPD, Patient Day, and efficiency KPI calculations
- Water-reserve safety calculation with warning/critical thresholds
- Duplicate-safe email alerts using an alert log
- Per-building use, target, and variance calculations
- Thai sidebar entry form with server-side validation
- In-sheet management dashboard and responsive web dashboard
- Authenticated JSON write API, document locking, and request idempotency
- Audit, API-request, and alert logs
- Safe repeatable installer that preserves existing rows
- Installable on-edit and monthly email triggers

## Project structure

```text
src/
  Code.gs             Main application and installer
  Sidebar.html        Monthly entry form
  Dashboard.html      Responsive web dashboard
  appsscript.json     Apps Script manifest
docs/
  setup-guide.md      Manual setup and deployment
  api.md              API usage and security
  architecture.md     Design reference
  schema.md           Data dictionary
sample-data/
  opd-data.csv
  meter-data.csv
scripts/
  validate.mjs        Dependency-free static validation
```

## Quick start—no Google Sheet exists yet

1. Create a blank Google Sheet.
2. Open **Extensions → Apps Script**.
3. Copy the four files under `src/` into the Apps Script project.
4. In Apps Script, enable **Show “appsscript.json” manifest file in editor settings**, then replace it with `src/appsscript.json`.
5. Select `setupSystem` and click **Run**.
6. Approve the requested permissions and return to the spreadsheet.
7. Reload the spreadsheet. Use **💧 Water DB → ตั้งค่าอีเมลและเกณฑ์เตือน**.

The installer creates:

| Sheet | Purpose |
|---|---|
| `Raw_Water_Data` | Monthly readings and calculated KPIs |
| `OPD_Data` | Daily hospital activity |
| `Master_Building` | Building targets and meter mapping |
| `Meter_Data` | Building meter readings |
| `Lookup` | Thai month mapping |
| `Dashboard` | Management summary and trend chart |
| `Alert_Log` | Prevents duplicate critical alerts |
| `Audit_Log` | Tracks application writes |
| `API_Log` | Tracks API request IDs and results |

Full instructions: [docs/setup-guide.md](docs/setup-guide.md).

## Web dashboard and API

Deploy the Apps Script project as a Web App. After deployment, return to the spreadsheet and choose **💧 Water DB → ดู API และ Dashboard Key**. Do not commit either key to GitHub.

- Health check: `GET WEB_APP_URL?action=health`
- Dashboard: use the tokenized URL shown by the menu
- Monthly write: `POST WEB_APP_URL` with an `apiKey`

See [docs/api.md](docs/api.md) for payloads and security guidance.

## Validation

Requires Node.js 18 or later and no third-party packages:

```bash
npm test
```

## Important operating notes

- The API is secure-by-default for writes. The key is generated inside Apps Script Properties.
- The dashboard requires its generated access token.
- `setupSystem()` may be run again after an interrupted installation; existing data rows are preserved.
- Formulas are controlled by the application. Enter operational values only through the sidebar or the intended input columns.
- Google Sheets is appropriate for this expected small operational dataset. It is not a clinical system and must not store patient-identifiable information.

## License

MIT — see [LICENSE](LICENSE).
