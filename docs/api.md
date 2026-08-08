# 🌐 API Reference

> Complete REST API documentation for the **Hospital Water Monitoring System**. Enables IoT sensors, mobile apps, and external systems to submit water readings and query status.

---

## 📑 Table of Contents

1. [Overview](#-overview)
2. [Authentication](#-authentication)
3. [Base URL](#-base-url)
4. [Endpoints](#-endpoints)
5. [Request / Response Formats](#-request--response-formats)
6. [Error Handling](#-error-handling)
7. [Rate Limits & Quotas](#-rate-limits--quotas)
8. [Code Examples](#-code-examples)
9. [Testing](#-testing)

---

## 🌟 Overview

The Water Monitoring API is a lightweight REST interface built on **Google Apps Script Web App**. It exposes two endpoints:

- **`GET /`** — Health check & service status
- **`POST /`** — Submit a monthly water reading

**Base characteristics:**

- 📡 Protocol: HTTPS only (enforced by Google)
- 📦 Content type: `application/json`
- 🔓 Auth: Public by default (configurable during deployment)
- 🌍 Region: Runs on Google's global infrastructure

---

## 🔐 Authentication

### Default: No Authentication (Public)

When deployed with `Who has access: Anyone`, the API accepts requests from any client. This is suitable for **internal networks** or **IoT devices with static IPs**.

### Recommended: Shared Secret (Simple)

Add a shared secret to the request body:

```json
{
  "apiKey": "YOUR_SECRET_KEY",
  "year": 2569,
  "month": "มี.ค.",
  "municipal": 250,
  "plant": 8000
}
```

Then validate in `doPost()`:

```javascript
function doPost(e) {
  const b = JSON.parse(e.postData.contents);
  if (b.apiKey !== PropertiesService.getScriptProperties().getProperty('API_KEY')) {
    return ContentService.createTextOutput(JSON.stringify({error: 'Unauthorized'}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  // ... proceed with reading
}
```

### Advanced: OAuth 2.0

For enterprise integration, deploy with `Who has access: Only members of my organization` and use Google's OAuth flow.

---

## 🔗 Base URL

After deployment, your URL looks like:

```
https://script.google.com/macros/s/AKfycbxXXXXXXXXXXXXXXXXXXXXXXXXXXX/exec
```

⚠️ **Note**: The URL changes when you create a **new version** deployment. Use the **"Manage deployments"** dialog to keep a stable URL, or update clients when the URL changes.

---

## 📡 Endpoints

### `GET /` — Health Check

Returns the service status and current timestamp.

**Request:**

```http
GET https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec HTTP/1.1
```

**Response (200 OK):**

```json
{
  "service": "Hospital Water Monitoring",
  "status": "online",
  "timestamp": "2026-08-08T15:15:00.000Z"
}
```

**Use cases:**

- ✅ Uptime monitoring (e.g. UptimeRobot, Pingdom)
- ✅ Client connectivity test before submitting data
- ✅ Verify deployment is live after updates

---

### `POST /` — Submit Monthly Reading

Records water usage for a specific (Year, Month) row.

**Request:**

```http
POST https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec HTTP/1.1
Content-Type: application/json

{
  "year": 2569,
  "month": "มี.ค.",
  "municipal": 250,
  "plant": 8000,
  "reserve": 1100
}
```

**Request body fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `year` | Integer | ✅ | Buddhist Era year (e.g. `2569`) |
| `month` | String | ✅ | Thai month abbreviation (`ม.ค`, `ก.พ.`, ..., `ธ.ค.`) |
| `municipal` | Number | ✅ | Municipal water usage in m³ |
| `plant` | Number | ✅ | On-site plant water in m³ |
| `reserve` | Number | ⚪ | Reserve level in m³ (optional) |
| `apiKey` | String | ⚪ | Shared secret if auth enabled |

**Response (200 OK - Success):**

```json
{
  "status": "✅ บันทึก มี.ค. 2569 เรียบร้อย"
}
```

**Response (200 OK - Row not found):**

```json
{
  "status": "❌ ไม่พบเดือน มี.ค. 2569 ในตาราง"
}
```

**Response (200 OK - Error):**

```json
{
  "error": "SyntaxError: Unexpected token in JSON at position 5"
}
```

⚠️ **Note**: Apps Script Web Apps **always return HTTP 200** — check the response body for actual status.

---

## 📦 Request / Response Formats

### Content Types

| Direction | Content-Type |
|---|---|
| Request | `application/json` |
| Response | `application/json` |

### Date & Number Conventions

- **Year**: Integer, Buddhist Era (พ.ศ.), e.g. `2569`
- **Month**: String, Thai abbreviation with correct dot placement
- **Numbers**: Standard JSON numbers (no thousand separators, dot decimal)

### Character Encoding

All requests and responses use **UTF-8**. Ensure your HTTP client sends the correct `Content-Type: application/json; charset=utf-8` header if working with non-ASCII characters.

---

## ⚠️ Error Handling

Since Apps Script Web Apps return HTTP 200 for all responses, clients must parse the JSON body to determine success:

```javascript
async function submitReading(data) {
  const res = await fetch(WEB_APP_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  });
  const body = await res.json();

  if (body.error) {
    throw new Error('API Error: ' + body.error);
  }
  if (body.status && body.status.startsWith('❌')) {
    throw new Error('Data Error: ' + body.status);
  }
  return body.status;
}
```

### Common Errors

| Error Message | Cause | Fix |
|---|---|---|
| `SyntaxError: Unexpected token...` | Malformed JSON | Validate JSON with `JSON.stringify()` |
| `❌ ไม่พบเดือน X ใน...` | Row doesn't exist in sheet | Pre-populate rows with (Year, Month) |
| `TypeError: Cannot read property 'contents'` | Empty POST body | Include a request body |
| `Exception: Authorization is required` | Script permissions revoked | Re-authorize via Apps Script editor |

---

## 📊 Rate Limits & Quotas

### Google Apps Script Quotas

| Resource | Free Gmail | Google Workspace |
|---|---|---|
| **URL Fetch calls** | 20,000/day | 100,000/day |
| **Execution time** | 6 min/execution | 30 min/execution |
| **Simultaneous executions** | 30 | 30 |
| **Trigger executions** | 90 min/day | 6 hours/day |
| **Email recipients** | 100/day | 1,500/day |

Full quotas: [Google Apps Script Quotas](https://developers.google.com/apps-script/guides/services/quotas)

### Recommended Client-Side Limits

- Batch daily readings and submit **once per day** rather than per-minute
- If using IoT sensors, buffer locally and submit hourly (or on threshold crossings)
- Implement exponential backoff on retries: `1s → 2s → 4s → 8s → give up`

---

## 💻 Code Examples

### 🐍 Python

```python
import requests
import json

WEB_APP_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec'

def submit_reading(year, month, municipal, plant, reserve=None):
    payload = {
        'year': year,
        'month': month,
        'municipal': municipal,
        'plant': plant
    }
    if reserve is not None:
        payload['reserve'] = reserve

    response = requests.post(
        WEB_APP_URL,
        headers={'Content-Type': 'application/json'},
        data=json.dumps(payload),
        timeout=30
    )
    result = response.json()

    if 'error' in result:
        raise Exception(f"API Error: {result['error']}")

    print(result.get('status', 'Unknown response'))
    return result

# Usage
submit_reading(2569, 'มี.ค.', 250, 8000, 1100)
```

### 🌐 JavaScript (Node.js / Browser)

```javascript
const WEB_APP_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';

async function submitReading({year, month, municipal, plant, reserve}) {
  const response = await fetch(WEB_APP_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({year, month, municipal, plant, reserve})
  });

  const result = await response.json();

  if (result.error) {
    throw new Error(`API Error: ${result.error}`);
  }

  console.log(result.status);
  return result;
}

// Usage
submitReading({
  year: 2569,
  month: 'มี.ค.',
  municipal: 250,
  plant: 8000,
  reserve: 1100
});
```

### 📟 ESP32 / Arduino (IoT Sensor)

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* WEB_APP_URL = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";

void submitReading(int year, String month, float municipal, float plant, float reserve) {
  HTTPClient http;
  http.begin(WEB_APP_URL);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<200> doc;
  doc["year"] = year;
  doc["month"] = month;
  doc["municipal"] = municipal;
  doc["plant"] = plant;
  doc["reserve"] = reserve;

  String payload;
  serializeJson(doc, payload);

  int httpCode = http.POST(payload);
  String response = http.getString();

  Serial.println("Response: " + response);
  http.end();
}
```

### 🚀 curl (Command Line)

```bash
# Health check
curl 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec'

# Submit reading
curl -X POST 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec' \
  -H 'Content-Type: application/json' \
  -d '{
    "year": 2569,
    "month": "มี.ค.",
    "municipal": 250,
    "plant": 8000,
    "reserve": 1100
  }'
```

### 📱 Postman / Insomnia

1. Create a new **POST** request
2. URL: your Web App deployment URL
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):

```json
{
  "year": 2569,
  "month": "มี.ค.",
  "municipal": 250,
  "plant": 8000,
  "reserve": 1100
}
```

5. Click **Send** → inspect JSON response

---

## 🧪 Testing

### Local Testing Checklist

- [ ] GET health check returns `"status": "online"`
- [ ] POST with valid data returns `✅ บันทึก...`
- [ ] POST with non-existent month returns `❌ ไม่พบเดือน...`
- [ ] POST with malformed JSON returns error
- [ ] Row in Raw_Water_Data is actually updated
- [ ] Email alert fires when reserve < 3.5 days
- [ ] Formulas recalculate after POST

### Load Testing

For high-frequency IoT deployments, test throughput:

```bash
# 10 concurrent requests
for i in {1..10}; do
  curl -X POST 'YOUR_URL' \
    -H 'Content-Type: application/json' \
    -d "{\"year\":2569,\"month\":\"ส.ค.\",\"municipal\":$i,\"plant\":8000}" &
done
wait
```

⚠️ Apps Script allows up to **30 simultaneous executions** — plan accordingly.

---

## 🔄 Versioning

To create a stable API URL that doesn't change with each deployment:

1. In Apps Script → **Deploy → Manage deployments**
2. Click ✏️ **Edit** on your current deployment
3. Set **Version: New version** and add a description
4. Click **Deploy** — the URL stays the same, but the version updates

### API Versioning Strategy (Future)

For breaking changes, add a version parameter:

```json
{
  "apiVersion": "v2",
  "year": 2569,
  "month": "มี.ค.",
  ...
}
```

Then branch logic in `doPost()`:

```javascript
function doPost(e) {
  const b = JSON.parse(e.postData.contents);
  switch (b.apiVersion) {
    case 'v2': return handleV2(b);
    default:   return handleV1(b);
  }
}
```

---

## 📚 Related Documents

- 📐 [Architecture](architecture.md) — System design
- 🗂️ [Schema Reference](schema.md) — Column definitions
- 🛠️ [Setup Guide](setup-guide.md) — Deployment steps
- 📄 [Main README](../README.md) — Project overview

---

<div align="center">

**Questions?** Open an issue on [GitHub](https://github.com/your-username/hospital-water-monitoring/issues)

</div>
