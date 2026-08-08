/*
 * 💧 HOSPITAL WATER MONITORING SYSTEM
 * ------------------------------------------------
 * Google Sheets + Apps Script
 * Main sheet: Raw_Water_Data
 * Support sheets: Lookup | OPD_Data | Master_Building | Meter_Data
 *
 * Raw_Water_Data columns:
 *  A: ปี (พ.ศ.)          B: เดือน (ไทย)      C: เลขเดือน       D: วันที่
 *  E: น้ำประปาเทศบาล      F: น้ำประปาโรงผลิต   G: ปริมาณใช้รวม
 *  H: OPD Visit          I: IPD Admit        J: ลิตร/OPD
 *  K: ลิตร/IPD           L: Patient Day      M: ลิตร/Patient Day
 *  N: ระดับน้ำสำรอง       O: ใช้เฉลี่ย/วัน     P: ใช้ได้อีก (วัน)
 *  Q: อาคารผู้ป่วยใน      R: อาคารผู้ป่วยนอก   S: อาคารสนับสนุน
 *  T-V: Target 3 อาคาร   W-Y: ผลต่าง 3 อาคาร
 */

// ========= ⚙️ CONFIGURATION =========
const CONFIG = {
  SHEET_NAME: 'Raw_Water_Data',
  ALERT_EMAIL: 'YOUR_EMAIL@example.com',   // 👈 CHANGE THIS
  RESERVE_WARNING_DAYS: 4.0,               // 🟡 yellow alert
  RESERVE_CRITICAL_DAYS: 3.5,              // 🔴 red alert + email
  COL: {                                   // 1-based column numbers
    YEAR: 1, MONTH: 2, MONTH_NUM: 3, DATE: 4,
    MUNICIPAL: 5, PLANT: 6, TOTAL: 7,
    OPD: 8, IPD: 9, L_PER_OPD: 10,
    L_PER_IPD: 11, PATIENT_DAY: 12, L_PER_PD: 13,
    RESERVE_LEVEL: 14, AVG_PER_DAY: 15, DAYS_LEFT: 16,
    BLD_IPD: 17, BLD_OPD: 18, BLD_SUPPORT: 19,
    TGT_IPD: 20, TGT_OPD: 21, TGT_SUPPORT: 22,
    VAR_IPD: 23, VAR_OPD: 24, VAR_SUPPORT: 25
  }
};

const THAI_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
                     'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

// ========= 📋 CUSTOM MENU =========
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('💧 Water DB')
    .addItem('➕ บันทึกข้อมูลรายเดือน', 'showEntryForm')
    .addItem('🚨 ตรวจสอบน้ำสำรองทุกเดือน', 'scanAllReserves')
    .addItem('📊 รายงานเทียบ Target อาคาร', 'showVarianceReport')
    .addItem('📧 ส่งรายงานสรุปทางอีเมล', 'sendMonthlySummary')
    .addSeparator()
    .addItem('🏗️ สร้างชีตประกอบ (Setup)', 'setupSupportSheets')
    .addItem('🎨 ติดตั้ง Conditional Formatting', 'setupFormatting')
    .addToUi();
}

// ========= 🏗️ SETUP SUPPORT SHEETS (RUN ONCE) =========
function setupSupportSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1️⃣ Lookup - Thai month → month number
  const lookup = getOrCreate(ss, 'Lookup');
  lookup.clear();
  const months = [
    ['เดือน', 'เลขเดือน'],
    ['ม.ค', 1], ['ก.พ.', 2], ['มี.ค.', 3], ['เม.ย.', 4],
    ['พ.ค.', 5], ['มิ.ย.', 6], ['ก.ค.', 7], ['ส.ค.', 8],
    ['ก.ย.', 9], ['ต.ค.', 10], ['พ.ย.', 11], ['ธ.ค.', 12],
    ['ม.ค.', 1]   // dot-variant fallback
  ];
  lookup.getRange(1, 1, months.length, 2).setValues(months);
  lookup.getRange('A1:B1').setFontWeight('bold').setBackground('#c9daf8');

  // 2️⃣ OPD_Data - Hospital load per month
  const opd = getOrCreate(ss, 'OPD_Data');
  if (opd.getLastRow() === 0) {
    opd.getRange(1, 1, 1, 4)
       .setValues([['Date', 'OPD Visit', 'IPD Admit', 'Patient Day']])
       .setFontWeight('bold').setBackground('#d9ead3');
    opd.getRange('A2:A').setNumberFormat('yyyy-mm-dd');
  }

  // 3️⃣ Master_Building - Target per building
  const mb = getOrCreate(ss, 'Master_Building');
  mb.clear();
  mb.getRange(1, 1, 5, 4).setValues([
    ['BuildingID', 'BuildingName', 'Target (ลบ.ม./เดือน)', 'Meter Code'],
    ['B01', 'อาคารผู้ป่วยใน', 6360, 'MTR-01'],
    ['B02', 'อาคารผู้ป่วยนอก', 1200, 'MTR-02'],
    ['B03', 'อาคารสนับสนุน', 700, 'MTR-03'],
    ['B04', 'อาคารพักแพทย์', 350, 'MTR-04']
  ]);
  mb.getRange('A1:D1').setFontWeight('bold').setBackground('#fce5cd');

  // 4️⃣ Meter_Data - Daily/monthly meter readings
  const md = getOrCreate(ss, 'Meter_Data');
  if (md.getLastRow() === 0) {
    md.getRange(1, 1, 1, 5)
      .setValues([['Date', 'Meter Code', 'Building Name', 'Usage (ลบ.ม.)', 'Reserve Level (ลบ.ม.)']])
      .setFontWeight('bold').setBackground('#f4cccc');
    md.getRange('A2:A').setNumberFormat('yyyy-mm-dd');
  }

  SpreadsheetApp.getUi().alert(
    '✅ สร้างชีตประกอบเรียบร้อย!\n\n' +
    '• Lookup (Thai month mapping)\n' +
    '• OPD_Data (hospital load)\n' +
    '• Master_Building (targets)\n' +
    '• Meter_Data (meter readings)\n\n' +
    'ขั้นต่อไป: กรอกข้อมูลย้อนหลังใน OPD_Data และ Meter_Data'
  );
}

// ========= ➕ DATA ENTRY =========
/**
 * Enter monthly readings - only 4-5 inputs, sheet formulas do the rest
 */
function addMonthlyReading(yearBE, monthTH, municipalWater, plantWater, reserveLevel) {
  const sheet = getDataSheet();
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][CONFIG.COL.YEAR - 1]) === String(yearBE) &&
        String(data[i][CONFIG.COL.MONTH - 1]).trim() === String(monthTH).trim()) {

      const row = i + 1;
      sheet.getRange(row, CONFIG.COL.MUNICIPAL).setValue(Number(municipalWater));
      sheet.getRange(row, CONFIG.COL.PLANT).setValue(Number(plantWater));
      if (reserveLevel) {
        sheet.getRange(row, CONFIG.COL.RESERVE_LEVEL).setValue(Number(reserveLevel));
      }
      SpreadsheetApp.flush();          // force formulas to recalculate
      checkReserveDays(row);           // instant safety check
      return '✅ บันทึก ' + monthTH + ' ' + yearBE + ' เรียบร้อย';
    }
  }
  return '❌ ไม่พบเดือน ' + monthTH + ' ' + yearBE + ' ในตาราง';
}

// ========= 🖥️ SIDEBAR ENTRY FORM =========
function showEntryForm() {
  const monthOptions = THAI_MONTHS.map(m => `<option>${m}</option>`).join('');
  const html = HtmlService.createHtmlOutput(`
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; padding: 12px; color: #333; }
      h3 { color: #1a73e8; margin-top: 0; }
      label { font-weight: 600; font-size: 13px; }
      input, select {
        width: 95%; padding: 8px; margin: 4px 0 12px;
        border: 1px solid #ccc; border-radius: 4px; font-size: 14px;
      }
      button {
        background: #1a73e8; color: #fff; border: none;
        padding: 10px 18px; border-radius: 6px; cursor: pointer;
        font-size: 14px; font-weight: 600; width: 100%;
      }
      button:hover { background: #1557b0; }
      #result { margin-top: 12px; font-weight: bold; font-size: 13px; }
    </style>
    <h3>💧 บันทึกข้อมูลน้ำรายเดือน</h3>
    <label>ปี (พ.ศ.)</label><br>
    <input id="year" type="number" value="2569"><br>
    <label>เดือน</label><br>
    <select id="month">${monthOptions}</select><br>
    <label>น้ำประปาเทศบาล (ลบ.ม.)</label><br>
    <input id="muni" type="number" step="0.01"><br>
    <label>น้ำประปาโรงผลิต (ลบ.ม.)</label><br>
    <input id="plant" type="number" step="0.01"><br>
    <label>ระดับน้ำสำรอง (ลบ.ม.) - ถ้ามี</label><br>
    <input id="reserve" type="number" step="0.01"><br>
    <button noscript="submitData()">💾 บันทึกข้อมูล</button>
    <p id="result"></p>
    <script>
      function submitData() {
        document.getElementById('result').innerText = '⏳ กำลังบันทึก...';
        google.script.run
          .withSuccessHandler(msg => document.getElementById('result').innerText = msg)
          .withFailureHandler(err => document.getElementById('result').innerText = '❌ ' + err)
          .addMonthlyReading(
            Number(document.getElementById('year').value),
            document.getElementById('month').value,
            document.getElementById('muni').value,
            document.getElementById('plant').value,
            document.getElementById('reserve').value
          );
      }
    </script>
  `).setTitle('💧 Water DB Entry').setWidth(320);
  SpreadsheetApp.getUi().showSidebar(html);
}

// ========= 🚨 RESERVE SAFETY CHECKS =========
function checkReserveDays(row) {
  const sheet = getDataSheet();
  const daysLeft = Number(sheet.getRange(row, CONFIG.COL.DAYS_LEFT).getValue());
  const month = sheet.getRange(row, CONFIG.COL.MONTH).getValue();
  const year = sheet.getRange(row, CONFIG.COL.YEAR).getValue();

  if (daysLeft > 0 && daysLeft < CONFIG.RESERVE_CRITICAL_DAYS) {
    MailApp.sendEmail({
      to: CONFIG.ALERT_EMAIL,
      subject: '🚨 น้ำสำรองเหลือเพียง ' + daysLeft.toFixed(2) + ' วัน (' + month + ' ' + year + ')',
      body: 'ระดับน้ำสำรองต่ำกว่าเกณฑ์ ' + CONFIG.RESERVE_CRITICAL_DAYS + ' วัน\n\n' +
            '📅 เดือน: ' + month + ' ' + year + '\n' +
            '⏳ ใช้ได้อีก: ' + daysLeft.toFixed(2) + ' วัน\n\n' +
            'กรุณาตรวจสอบระบบผลิตน้ำและแผนสำรองฉุกเฉิน\n\n' +
            '🔗 ดูข้อมูล: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl()
    });
  }
}

/** Scan every active month and report reserve status */
function scanAllReserves() {
  const data = getDataSheet().getDataRange().getValues();
  const report = [];

  for (let i = 1; i < data.length; i++) {
    const daysLeft = Number(data[i][CONFIG.COL.DAYS_LEFT - 1]);
    const total = Number(data[i][CONFIG.COL.TOTAL - 1]);
    if (total > 0 && daysLeft > 0) {
      let icon = '🟢';
      if (daysLeft < CONFIG.RESERVE_CRITICAL_DAYS) icon = '🔴';
      else if (daysLeft < CONFIG.RESERVE_WARNING_DAYS) icon = '🟡';
      report.push(icon + ' ' + data[i][1] + ' ' + data[i][0] +
                  ' → ใช้ได้อีก ' + daysLeft.toFixed(2) + ' วัน');
    }
  }
  SpreadsheetApp.getUi().alert(
    report.length ? '📋 สถานะน้ำสำรองรายเดือน:\n\n' + report.join('\n')
                  : 'ไม่พบข้อมูลที่มีการใช้น้ำ'
  );
}

// ========= 📊 BUILDING VARIANCE REPORT =========
function showVarianceReport() {
  const data = getDataSheet().getDataRange().getValues();
  const report = [];

  for (let i = 1; i < data.length; i++) {
    if (Number(data[i][CONFIG.COL.TOTAL - 1]) > 0) {
      const vIPD = Number(data[i][CONFIG.COL.VAR_IPD - 1]);
      const vOPD = Number(data[i][CONFIG.COL.VAR_OPD - 1]);
      const vSUP = Number(data[i][CONFIG.COL.VAR_SUPPORT - 1]);
      report.push(
        data[i][1] + ' ' + data[i][0] + ':\n' +
        '   ผู้ป่วยใน: ' + fmtVar(vIPD) +
        ' | ผู้ป่วยนอก: ' + fmtVar(vOPD) +
        ' | สนับสนุน: ' + fmtVar(vSUP)
      );
    }
  }
  SpreadsheetApp.getUi().alert(
    report.length ? '📊 ผลต่างการใช้น้ำ vs Target\n\n' + report.join('\n\n')
                  : 'ไม่พบข้อมูลที่มีการใช้น้ำ'
  );
}

function fmtVar(v) {
  if (isNaN(v)) return '-';
  return (v > 0 ? '🔴 +' : '🟢 ') + v.toFixed(1);
}

// ========= 📧 MONTHLY EMAIL SUMMARY =========
function sendMonthlySummary() {
  const data = getDataSheet().getDataRange().getValues();
  let lastRow = null;

  // find latest month that has data
  for (let i = data.length - 1; i >= 1; i--) {
    if (Number(data[i][CONFIG.COL.TOTAL - 1]) > 0) { lastRow = data[i]; break; }
  }
  if (!lastRow) {
    SpreadsheetApp.getUi().alert('❌ ไม่พบข้อมูลที่จะสรุป');
    return;
  }

  const c = CONFIG.COL;
  const body =
    '📅 เดือน: ' + lastRow[c.MONTH - 1] + ' ' + lastRow[c.YEAR - 1] + '\n\n' +
    '💧 การใช้น้ำ\n' +
    ' - น้ำประปาเทศบาล: ' + num(lastRow[c.MUNICIPAL - 1]) + ' ลบ.ม.\n' +
    ' - น้ำประปาโรงผลิต: ' + num(lastRow[c.PLANT - 1]) + ' ลบ.ม.\n' +
    ' - รวม: ' + num(lastRow[c.TOTAL - 1]) + ' ลบ.ม.\n\n' +
    '📈 ประสิทธิภาพ\n' +
    ' - ลิตร/OPD: ' + num(lastRow[c.L_PER_OPD - 1]) + '\n' +
    ' - ลิตร/IPD: ' + num(lastRow[c.L_PER_IPD - 1]) + '\n' +
    ' - ลิตร/Patient Day: ' + num(lastRow[c.L_PER_PD - 1]) + '\n\n' +
    '🛡️ น้ำสำรอง\n' +
    ' - ระดับปัจจุบัน: ' + num(lastRow[c.RESERVE_LEVEL - 1]) + ' ลบ.ม.\n' +
    ' - ใช้ได้อีก: ' + num(lastRow[c.DAYS_LEFT - 1]) + ' วัน\n\n' +
    '🏢 เทียบ Target (ผลต่าง ลบ.ม.)\n' +
    ' - อาคารผู้ป่วยใน: ' + num(lastRow[c.VAR_IPD - 1]) + '\n' +
    ' - อาคารผู้ป่วยนอก: ' + num(lastRow[c.VAR_OPD - 1]) + '\n' +
    ' - อาคารสนับสนุน: ' + num(lastRow[c.VAR_SUPPORT - 1]) + '\n\n' +
    '🔗 ' + SpreadsheetApp.getActiveSpreadsheet().getUrl();

  MailApp.sendEmail({
    to: CONFIG.ALERT_EMAIL,
    subject: '💧 รายงานการใช้น้ำ ' + lastRow[c.MONTH - 1] + ' ' + lastRow[c.YEAR - 1],
    body: body
  });
  SpreadsheetApp.getUi().alert('📧 ส่งรายงานเรียบร้อยไปที่ ' + CONFIG.ALERT_EMAIL);
}

function num(v) {
  const n = Number(v);
  return isNaN(n) ? '-' : n.toLocaleString('th-TH', { maximumFractionDigits: 2 });
}

// ========= 🎨 CONDITIONAL FORMATTING (run once) =========
function setupFormatting() {
  const sheet = getDataSheet();
  const rangeP = sheet.getRange('P2:P100');   // ใช้ได้อีก (วัน)

  const rules = [
    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberBetween(0.01, CONFIG.RESERVE_CRITICAL_DAYS)
      .setBackground('#f4c7c3').setRanges([rangeP]).build(),   // 🔴
    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberBetween(CONFIG.RESERVE_CRITICAL_DAYS, CONFIG.RESERVE_WARNING_DAYS)
      .setBackground('#fce8b2').setRanges([rangeP]).build(),   // 🟡
    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberGreaterThan(CONFIG.RESERVE_WARNING_DAYS)
      .setBackground('#d9ead3').setRanges([rangeP]).build()    // 🟢
  ];
  sheet.setConditionalFormatRules(sheet.getConditionalFormatRules().concat(rules));
  SpreadsheetApp.getUi().alert('🎨 ติดตั้ง Conditional Formatting คอลัมน์ P เรียบร้อย!');
}

// ========= ⚡ AUTO-CHECK ON EDIT =========
function onEdit(e) {
  const sheet = e.range.getSheet();
  if (sheet.getName() !== CONFIG.SHEET_NAME) return;
  const col = e.range.getColumn();

  // If municipal (E) or plant (F) water was edited → recheck reserve
  if (col === CONFIG.COL.MUNICIPAL || col === CONFIG.COL.PLANT) {
    SpreadsheetApp.flush();
    checkReserveDays(e.range.getRow());
  }
}

// ========= 🌐 REST API (optional - for IoT/mobile) =========
/**
 * POST endpoint. Expects JSON:
 * {"year":2569,"month":"มี.ค.","municipal":250,"plant":8000,"reserve":1100}
 */
function doPost(e) {
  try {
    const b = JSON.parse(e.postData.contents);
    const result = addMonthlyReading(b.year, b.month, b.municipal, b.plant, b.reserve);
    return ContentService.createTextOutput(JSON.stringify({ status: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/** Simple GET health check */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    service: 'Hospital Water Monitoring',
    status: 'online',
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

// ========= 🔧 HELPERS =========
function getDataSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) throw new Error('❌ ไม่พบชีต "' + CONFIG.SHEET_NAME + '"');
  return sheet;
}

function getOrCreate(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}
