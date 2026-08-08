# Setup guide

This guide starts from a blank Google Sheet. No previous Apps Script project is required.

## What changed from the former manual design

The original design remains the business baseline, but repetitive setup steps are now automated:

| Former step | Current release |
|---|---|
| Rename `Sheet1`, type 25 headers, and freeze row 1 | `setupSystem()` creates and formats the main sheet |
| Type three years and drag formulas down | The installer creates three complete B.E. calendar years and all formulas |
| Put a real email address inside `Code.gs` | Email and thresholds are stored through the menu, outside source control |
| Run separate support-sheet and formatting commands | One installer completes both; compatibility commands remain available |
| Add the monthly trigger manually | The installer creates the authorized edit and monthly triggers |
| Deploy a completely public write API | Writes require a generated API key; the dashboard uses a separate token |

January is stored as `ม.ค` to match the former workbook. The alternative `ม.ค.` and the full Thai month name are also accepted and normalized automatically.

## 1. Create the spreadsheet

1. Open Google Drive and create a blank Google Sheet.
2. Name it `Hospital Water Monitoring`.
3. Set **File → Settings → Locale** to Thailand and **Time zone** to Bangkok.

Do not manually create tabs or formulas. The installer will do that.

## 2. Create the bound Apps Script project

1. In the new spreadsheet, open **Extensions → Apps Script**.
2. Rename the Apps Script project to `Hospital Water Monitoring`.
3. Replace the default `Code.gs` with the contents of `src/Code.gs`.
4. Create an HTML file named `Sidebar` and paste `src/Sidebar.html`.
5. Create an HTML file named `Dashboard` and paste `src/Dashboard.html`.
6. Open **Project Settings** and enable **Show “appsscript.json” manifest file in editor**.
7. Replace the manifest with `src/appsscript.json`.
8. Save all files.

File names are case-sensitive. Use exactly `Code.gs`, `Sidebar.html`, and `Dashboard.html`.

## 3. Run the installer

1. Select `setupSystem` from the function list.
2. Click **Run**.
3. Complete Google’s authorization flow. Review the requested permissions and confirm that the project name and Google account are yours. If Google shows an unverified-app warning for this private script, open **Advanced** only after confirming those details, then continue to your own project and click **Allow**.
4. Return to the spreadsheet and reload the page.

The **💧 Water DB** menu should appear. The installer creates nine sheets, 36 monthly rows covering the current Buddhist calendar year and the two preceding years, formulas, validations, conditional formatting, generated secrets, and two installable triggers.

Running `setupSystem` again is safe: it preserves existing operational rows and only completes missing setup.

## 4. Configure alerts

1. Choose **💧 Water DB → ตั้งค่าอีเมลและเกณฑ์เตือน**.
2. Enter the notification email.
3. Enter critical and warning days separated by a comma, for example `3.5,4`.

The warning value must be greater than the critical value. Critical emails are logged in `Alert_Log`, so editing the same month repeatedly does not send duplicate alerts.

## 5. Enter supporting data

### OPD_Data

Enter one row per day:

| Date | OPD Visit | IPD Admit | Patient Day |
|---|---:|---:|---:|

### Master_Building

Review the four starter buildings and replace their target values and meter codes with actual approved values.

### Meter_Data

Enter meter-derived consumption by date and building. Building names must match `Master_Building`.

Sample CSV files are in `sample-data/`.

## 6. Enter monthly water readings

Use **💧 Water DB → บันทึกข้อมูลรายเดือน**. The form accepts zero as a valid reading, validates all numbers, creates a missing month automatically, recalculates formulas, checks reserve safety, records an audit entry, and refreshes the dashboard.

Direct entry is supported only in these `Raw_Water_Data` columns:

- E: municipal water
- F: on-site production
- N: reserve level

The installed edit trigger recalculates and checks these edits.

## 7. Deploy the web dashboard and API

1. In Apps Script choose **Deploy → New deployment**.
2. Select **Web app**.
3. Execute as: **Me**.
4. Choose the narrowest access setting that works for the hospital. Prefer organization-only access when available.
5. Deploy and copy the Web App URL.
6. Return to the sheet and choose **💧 Water DB → ดู API และ Dashboard Key**.

The menu shows a tokenized dashboard URL and the API key. Treat both as passwords. Never place them in source code or GitHub.

## 8. Verify the installation

- Open the sidebar and save a test month.
- Confirm `Raw_Water_Data` was updated and formulas calculated.
- Confirm `Audit_Log` received an entry.
- Open the `Dashboard` sheet.
- Open `WEB_APP_URL?action=health` and confirm JSON reports `online`.
- Open the tokenized dashboard URL shown by the menu.
- Test the authenticated API with a unique `requestId`.

## Troubleshooting

| Symptom | Resolution |
|---|---|
| Menu missing | Save the project, reload the spreadsheet, then run `onOpen` once if needed. |
| Authorization error | Run `setupSystem` manually in Apps Script and complete authorization. |
| Sidebar file not found | Confirm the HTML file is named exactly `Sidebar`. |
| Dashboard denied | Use the complete URL shown by the menu after deployment. |
| Email not sent | Configure a valid email and verify the installed `handleSheetEdit` trigger exists. |
| Formula errors | Confirm all nine sheet names were created exactly; rerun `setupSystem`. |
| API unauthorized | Use the generated key in the JSON body, not a placeholder. |

## Backup and change control

Before a major update, use **File → Make a copy** in Google Sheets. Repository updates should be reviewed through a pull request before being copied or pushed into the production Apps Script project.
