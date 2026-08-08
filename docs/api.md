# API reference

The web app exposes a public health check, a token-protected dashboard, and an authenticated monthly-write endpoint.

## Security

`setupSystem()` generates two independent random values in Apps Script Properties:

- `API_KEY` authorizes write requests.
- `DASHBOARD_TOKEN` authorizes the web dashboard.

View them from **💧 Water DB → ดู API และ Dashboard Key**. Do not put them in GitHub, screenshots, browser bookmarks shared publicly, or client-side firmware repositories.

For hospital use, prefer an organization-restricted Apps Script deployment. Do not submit patient-identifiable information to this API.

## Health check

```http
GET WEB_APP_URL?action=health
```

Example response:

```json
{
  "ok": true,
  "service": "Hospital Water Monitoring",
  "version": "1.0.0",
  "status": "online",
  "timestamp": "2026-08-08T09:00:00.000Z"
}
```

## Submit or update a monthly reading

```http
POST WEB_APP_URL
Content-Type: application/json
```

```json
{
  "apiKey": "GENERATED_API_KEY",
  "requestId": "meter-gateway-2026-08-001",
  "year": 2569,
  "month": "ส.ค.",
  "municipal": 250.5,
  "plant": 8000,
  "reserve": 1100
}
```

| Field | Required | Rules |
|---|---|---|
| `apiKey` | Yes | Must match Apps Script Properties |
| `requestId` | Recommended | Unique identifier; repeated IDs are not processed twice |
| `year` | Yes | Integer, 2500–2700 B.E. |
| `month` | Yes | Thai abbreviation or full Thai month name |
| `municipal` | Yes | Number ≥ 0 |
| `plant` | Yes | Number ≥ 0 |
| `reserve` | No | Number ≥ 0; zero is accepted |

Success:

```json
{
  "ok": true,
  "code": "UPDATED",
  "row": 20,
  "message": "บันทึก ส.ค. 2569 เรียบร้อย"
}
```

Authentication failure:

```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Invalid API key"
}
```

Validation failure:

```json
{
  "ok": false,
  "code": "VALIDATION_ERROR",
  "message": "ระดับน้ำสำรอง ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป"
}
```

Apps Script `ContentService` responses should be evaluated by the JSON `ok` and `code` fields rather than relying only on the HTTP status.

## Concurrency and retries

Writes use a document lock so two clients cannot update the workbook simultaneously. Send a stable, unique `requestId` for every logical reading. A retry with the same ID returns `DUPLICATE` and does not perform the update again.

Use exponential backoff for transient transport failures. Do not send high-frequency raw sensor telemetry to Google Sheets; aggregate readings at the gateway and submit operational monthly values.
