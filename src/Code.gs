/**
 * Hospital Water Monitoring System
 * Google Sheets + Google Apps Script
 * Version 1.0.0
 */

const APP = Object.freeze({
  NAME: 'Hospital Water Monitoring',
  VERSION: '1.0.0',
  TIMEZONE: 'Asia/Bangkok',
  SHEETS: Object.freeze({
    RAW: 'Raw_Water_Data',
    OPD: 'OPD_Data',
    BUILDINGS: 'Master_Building',
    METERS: 'Meter_Data',
    LOOKUP: 'Lookup',
    DASHBOARD: 'Dashboard',
    ALERTS: 'Alert_Log',
    AUDIT: 'Audit_Log',
    API_LOG: 'API_Log'
  }),
  PROP: Object.freeze({
    ALERT_EMAIL: 'ALERT_EMAIL',
    WARNING_DAYS: 'RESERVE_WARNING_DAYS',
    CRITICAL_DAYS: 'RESERVE_CRITICAL_DAYS',
    API_KEY: 'API_KEY',
    DASHBOARD_TOKEN: 'DASHBOARD_TOKEN',
    INSTALLED_VERSION: 'INSTALLED_VERSION'
  }),
  DEFAULT_WARNING_DAYS: 4,
  DEFAULT_CRITICAL_DAYS: 3.5,
  SEED_YEARS: 3
});

const RAW_HEADERS = [
  'ปี (พ.ศ.)', 'เดือน', 'เลขเดือน', 'วันที่', 'น้ำประปาเทศบาล (ลบ.ม.)',
  'น้ำประปาโรงผลิต (ลบ.ม.)', 'ปริมาณใช้รวม (ลบ.ม.)', 'OPD Visit', 'IPD Admit',
  'ลิตร/OPD', 'ลิตร/IPD', 'Patient Day', 'ลิตร/Patient Day',
  'ระดับน้ำสำรอง (ลบ.ม.)', 'ใช้เฉลี่ย/วัน (ลบ.ม.)', 'ใช้ได้อีก (วัน)',
  'อาคารผู้ป่วยใน', 'อาคารผู้ป่วยนอก', 'อาคารสนับสนุน',
  'Target ผู้ป่วยใน', 'Target ผู้ป่วยนอก', 'Target สนับสนุน',
  'ผลต่าง ผู้ป่วยใน', 'ผลต่าง ผู้ป่วยนอก', 'ผลต่าง สนับสนุน'
];

const THAI_MONTHS = ['ม.ค', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

const MONTH_ALIASES = Object.freeze({
  'ม.ค.': 'ม.ค', 'มกราคม': 'ม.ค',
  'ก.พ': 'ก.พ.', 'กุมภาพันธ์': 'ก.พ.',
  'มี.ค': 'มี.ค.', 'มีนาคม': 'มี.ค.',
  'เม.ย': 'เม.ย.', 'เมษายน': 'เม.ย.',
  'พ.ค': 'พ.ค.', 'พฤษภาคม': 'พ.ค.',
  'มิ.ย': 'มิ.ย.', 'มิถุนายน': 'มิ.ย.',
  'ก.ค': 'ก.ค.', 'กรกฎาคม': 'ก.ค.',
  'ส.ค': 'ส.ค.', 'สิงหาคม': 'ส.ค.',
  'ก.ย': 'ก.ย.', 'กันยายน': 'ก.ย.',
  'ต.ค': 'ต.ค.', 'ตุลาคม': 'ต.ค.',
  'พ.ย': 'พ.ย.', 'พฤศจิกายน': 'พ.ย.',
  'ธ.ค': 'ธ.ค.', 'ธันวาคม': 'ธ.ค.'
});

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('💧 Water DB')
    .addItem('🚀 ติดตั้งระบบครั้งแรก', 'setupSystem')
    .addSeparator()
    .addItem('➕ บันทึกข้อมูลรายเดือน', 'showEntryForm')
    .addItem('📊 เปิด Dashboard', 'openDashboardSheet')
    .addItem('🔄 อัปเดต Dashboard', 'refreshDashboardSheet')
    .addItem('🚨 ตรวจสอบน้ำสำรอง', 'scanAllReserves')
    .addItem('📧 ส่งรายงานรายเดือน', 'sendMonthlySummary')
    .addSeparator()
    .addItem('⚙️ ตั้งค่าอีเมลและเกณฑ์เตือน', 'configureSettings')
    .addItem('🔐 ดู API และ Dashboard Key', 'showAccessInformation')
    .addItem('🎨 ติดตั้ง Conditional Formatting ใหม่', 'setupFormatting')
    .addItem('⏰ ติดตั้ง Triggers ใหม่', 'installTriggers')
    .addToUi();
}

/** One safe, repeatable installer for a new spreadsheet. */
function setupSystem() {
  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureSecrets_();
    setupLookup_(ss);
    setupOpd_(ss);
    setupBuildings_(ss);
    setupMeters_(ss);
    setupLogSheets_(ss);
    setupRaw_(ss);
    seedCalendarYears_(ss.getSheetByName(APP.SHEETS.RAW), APP.SEED_YEARS);
    setupValidations_(ss.getSheetByName(APP.SHEETS.RAW));
    setupFormatting_(ss.getSheetByName(APP.SHEETS.RAW));
    setupDashboard_(ss);
    installTriggers_();
    PropertiesService.getScriptProperties().setProperty(APP.PROP.INSTALLED_VERSION, APP.VERSION);
    refreshDashboardSheet_();
    SpreadsheetApp.getUi().alert(
      'ติดตั้งสำเร็จ',
      'สร้างฐานข้อมูล สูตรคำนวณ Dashboard การตรวจสอบข้อมูล และ Triggers เรียบร้อยแล้ว\n\n' +
      'ขั้นต่อไป: เลือก “ตั้งค่าอีเมลและเกณฑ์เตือน” แล้วเริ่มบันทึกข้อมูล',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } finally {
    lock.releaseLock();
  }
}

function setupLookup_(ss) {
  const sheet = ensureSheet_(ss, APP.SHEETS.LOOKUP, ['เดือน', 'เลขเดือน']);
  if (sheet.getLastRow() <= 1) {
    sheet.getRange(2, 1, 12, 2).setValues(THAI_MONTHS.map(function(month, index) {
      return [month, index + 1];
    }));
  }
  styleTable_(sheet, 2);
}

function setupOpd_(ss) {
  const sheet = ensureSheet_(ss, APP.SHEETS.OPD,
    ['Date', 'OPD Visit', 'IPD Admit', 'Patient Day']);
  sheet.getRange('A2:A').setNumberFormat('yyyy-mm-dd');
  styleTable_(sheet, 4);
}

function setupBuildings_(ss) {
  const sheet = ensureSheet_(ss, APP.SHEETS.BUILDINGS,
    ['BuildingID', 'BuildingName', 'Target (ลบ.ม./เดือน)', 'Meter Code', 'Active']);
  if (sheet.getLastRow() <= 1) {
    sheet.getRange(2, 1, 4, 5).setValues([
      ['B01', 'อาคารผู้ป่วยใน', 6360, 'MTR-01', true],
      ['B02', 'อาคารผู้ป่วยนอก', 1200, 'MTR-02', true],
      ['B03', 'อาคารสนับสนุน', 700, 'MTR-03', true],
      ['B04', 'อาคารพักแพทย์', 350, 'MTR-04', true]
    ]);
  }
  styleTable_(sheet, 5);
}

function setupMeters_(ss) {
  const sheet = ensureSheet_(ss, APP.SHEETS.METERS,
    ['Date', 'Meter Code', 'Building Name', 'Usage (ลบ.ม.)', 'Reserve Level (ลบ.ม.)', 'Source', 'Note']);
  sheet.getRange('A2:A').setNumberFormat('yyyy-mm-dd');
  styleTable_(sheet, 7);
}

function setupLogSheets_(ss) {
  ensureSheet_(ss, APP.SHEETS.ALERTS,
    ['Alert Key', 'Timestamp', 'Year', 'Month', 'Days Left', 'Email', 'Status']);
  ensureSheet_(ss, APP.SHEETS.AUDIT,
    ['Timestamp', 'Action', 'Year', 'Month', 'Source', 'User', 'Details']);
  ensureSheet_(ss, APP.SHEETS.API_LOG,
    ['Timestamp', 'Request ID', 'Action', 'Status', 'Message']);
  [APP.SHEETS.ALERTS, APP.SHEETS.AUDIT, APP.SHEETS.API_LOG].forEach(function(name) {
    styleTable_(ss.getSheetByName(name), ss.getSheetByName(name).getLastColumn());
  });
}

function setupRaw_(ss) {
  const sheet = ensureSheet_(ss, APP.SHEETS.RAW, RAW_HEADERS);
  sheet.setFrozenRows(1);
  sheet.getRange('D2:D').setNumberFormat('mmm yyyy');
  sheet.getRange('E2:Y').setNumberFormat('#,##0.00');
  sheet.autoResizeColumns(1, RAW_HEADERS.length);
  sheet.setColumnWidths(1, 4, 95);
  sheet.setColumnWidths(5, 21, 135);
  if (!sheet.getFilter() && sheet.getMaxRows() > 1) {
    sheet.getRange(1, 1, sheet.getMaxRows(), RAW_HEADERS.length).createFilter();
  }
  styleTable_(sheet, RAW_HEADERS.length);
}

function seedCalendarYears_(sheet, numberOfYears) {
  const now = new Date();
  const currentYearBE = now.getFullYear() + 543;
  for (let yearBE = currentYearBE - numberOfYears + 1; yearBE <= currentYearBE; yearBE++) {
    for (let monthIndex = 0; monthIndex < THAI_MONTHS.length; monthIndex++) {
      const month = THAI_MONTHS[monthIndex];
      const row = findMonthlyRow_(sheet, yearBE, month) || sheet.getLastRow() + 1;
      if (sheet.getRange(row, 1).isBlank()) {
        sheet.getRange(row, 1, 1, 2).setValues([[yearBE, month]]);
      }
      applyRowFormulas_(sheet, row);
    }
  }
}

function applyRowFormulas_(sheet, row) {
  const q = function(name) { return "'" + name.replace(/'/g, "''") + "'"; };
  const raw = {
    C: '=IF(B' + row + '=\"\",\"\",IFERROR(VLOOKUP(B' + row + ',' + q(APP.SHEETS.LOOKUP) + '!A:B,2,FALSE),\"\"))',
    D: '=IF(OR(A' + row + '=\"\",C' + row + '=\"\"),\"\",DATE(A' + row + '-543,C' + row + ',1))',
    G: '=IF(COUNTA(E' + row + ':F' + row + ')=0,\"\",SUM(E' + row + ':F' + row + '))',
    H: '=IF(D' + row + '=\"\",\"\",SUMIFS(' + q(APP.SHEETS.OPD) + '!B:B,' + q(APP.SHEETS.OPD) + '!A:A,\">=\"&D' + row + ',' + q(APP.SHEETS.OPD) + '!A:A,\"<=\"&EOMONTH(D' + row + ',0)))',
    I: '=IF(D' + row + '=\"\",\"\",SUMIFS(' + q(APP.SHEETS.OPD) + '!C:C,' + q(APP.SHEETS.OPD) + '!A:A,\">=\"&D' + row + ',' + q(APP.SHEETS.OPD) + '!A:A,\"<=\"&EOMONTH(D' + row + ',0)))',
    J: '=IFERROR(G' + row + '*1000/H' + row + ',\"\")',
    K: '=IFERROR(G' + row + '*1000/I' + row + ',\"\")',
    L: '=IF(D' + row + '=\"\",\"\",SUMIFS(' + q(APP.SHEETS.OPD) + '!D:D,' + q(APP.SHEETS.OPD) + '!A:A,\">=\"&D' + row + ',' + q(APP.SHEETS.OPD) + '!A:A,\"<=\"&EOMONTH(D' + row + ',0)))',
    M: '=IFERROR(G' + row + '*1000/L' + row + ',\"\")',
    O: '=IFERROR(G' + row + '/DAY(EOMONTH(D' + row + ',0)),\"\")',
    P: '=IFERROR(N' + row + '/O' + row + ',\"\")',
    Q: buildingUsageFormula_(row, 'อาคารผู้ป่วยใน'),
    R: buildingUsageFormula_(row, 'อาคารผู้ป่วยนอก'),
    S: buildingUsageFormula_(row, 'อาคารสนับสนุน'),
    T: '=IFERROR(VLOOKUP(\"B01\",' + q(APP.SHEETS.BUILDINGS) + '!A:C,3,FALSE),\"\")',
    U: '=IFERROR(VLOOKUP(\"B02\",' + q(APP.SHEETS.BUILDINGS) + '!A:C,3,FALSE),\"\")',
    V: '=IFERROR(VLOOKUP(\"B03\",' + q(APP.SHEETS.BUILDINGS) + '!A:C,3,FALSE),\"\")',
    W: '=IF(OR(Q' + row + '=\"\",T' + row + '=\"\"),\"\",Q' + row + '-T' + row + ')',
    X: '=IF(OR(R' + row + '=\"\",U' + row + '=\"\"),\"\",R' + row + '-U' + row + ')',
    Y: '=IF(OR(S' + row + '=\"\",V' + row + '=\"\"),\"\",S' + row + '-V' + row + ')'
  };
  Object.keys(raw).forEach(function(column) {
    sheet.getRange(column + row).setFormula(raw[column]);
  });
}

function buildingUsageFormula_(row, buildingName) {
  const meters = "'" + APP.SHEETS.METERS + "'";
  return '=IF(D' + row + '=\"\",\"\",SUMIFS(' + meters + '!D:D,' + meters + '!A:A,\">=\"&D' + row + ',' + meters + '!A:A,\"<=\"&EOMONTH(D' + row + ',0),' + meters + '!C:C,\"' + buildingName + '\"))';
}

function setupValidations_(sheet) {
  const rows = Math.max(sheet.getMaxRows() - 1, 1);
  sheet.getRange(2, 1, rows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireNumberBetween(2500, 2700).setAllowInvalid(false).build());
  sheet.getRange(2, 2, rows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(THAI_MONTHS, true).setAllowInvalid(false).build());
  [5, 6, 14].forEach(function(column) {
    sheet.getRange(2, column, rows, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireNumberGreaterThanOrEqualTo(0).setAllowInvalid(false).build());
  });
}

function setupFormatting_(sheet) {
  const range = sheet.getRange('P2:P' + sheet.getMaxRows());
  const existing = sheet.getConditionalFormatRules().filter(function(rule) {
    return !rule.getRanges().some(function(item) {
      return item.getSheet().getSheetId() === sheet.getSheetId() && /^P2:P/.test(item.getA1Notation());
    });
  });
  const critical = getSettings_().criticalDays;
  const warning = getSettings_().warningDays;
  existing.push(
    SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(critical)
      .setBackground('#f4c7c3').setFontColor('#9c0006').setRanges([range]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenNumberBetween(critical, warning)
      .setBackground('#fce8b2').setFontColor('#7f6000').setRanges([range]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(warning)
      .setBackground('#d9ead3').setFontColor('#274e13').setRanges([range]).build()
  );
  sheet.setConditionalFormatRules(existing);
}

function setupDashboard_(ss) {
  const sheet = ensureSheet_(ss, APP.SHEETS.DASHBOARD, ['Hospital Water Monitoring Dashboard']);
  sheet.setHiddenGridlines(true);
  sheet.setFrozenRows(2);
  sheet.setColumnWidths(1, 8, 125);
}

function showEntryForm() {
  const html = HtmlService.createTemplateFromFile('Sidebar');
  html.months = THAI_MONTHS;
  SpreadsheetApp.getUi().showSidebar(html.evaluate().setTitle('บันทึกข้อมูลน้ำ').setWidth(360));
}

function getEntryDefaults() {
  const now = new Date();
  return { year: now.getFullYear() + 543, month: THAI_MONTHS[now.getMonth()] };
}

function submitMonthlyReading(payload) {
  const result = upsertMonthlyReading_(payload, 'sidebar');
  return '✅ ' + result.message;
}

/** Compatibility entry point used by the former single-file sidebar. */
function addMonthlyReading(yearBE, monthTH, municipalWater, plantWater, reserveLevel) {
  return submitMonthlyReading({
    year: yearBE,
    month: monthTH,
    municipal: municipalWater,
    plant: plantWater,
    reserve: reserveLevel
  });
}

function upsertMonthlyReading_(payload, source) {
  const input = validateReading_(payload);
  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    const sheet = getSheet_(APP.SHEETS.RAW);
    let row = findMonthlyRow_(sheet, input.year, input.month);
    const action = row ? 'UPDATE_MONTHLY_READING' : 'CREATE_MONTHLY_READING';
    if (!row) {
      row = sheet.getLastRow() + 1;
      sheet.getRange(row, 1, 1, 2).setValues([[input.year, input.month]]);
    }
    applyRowFormulas_(sheet, row);
    sheet.getRange(row, 5).setValue(input.municipal);
    sheet.getRange(row, 6).setValue(input.plant);
    if (input.reserve !== null) sheet.getRange(row, 14).setValue(input.reserve);
    SpreadsheetApp.flush();
    logAudit_(action, input.year, input.month, source, 'row=' + row);
    maybeSendReserveAlert_(row);
    refreshDashboardSheet_();
    return {
      ok: true,
      code: action === 'CREATE_MONTHLY_READING' ? 'CREATED' : 'UPDATED',
      row: row,
      message: 'บันทึก ' + input.month + ' ' + input.year + ' เรียบร้อย'
    };
  } finally {
    lock.releaseLock();
  }
}

function validateReading_(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('ไม่พบข้อมูลที่ต้องการบันทึก');
  const year = Number(payload.year);
  const month = normalizeThaiMonth_(payload.month);
  const municipal = parseRequiredNonNegative_(payload.municipal, 'น้ำประปาเทศบาล');
  const plant = parseRequiredNonNegative_(payload.plant, 'น้ำประปาโรงผลิต');
  const reserve = parseOptionalNonNegative_(payload.reserve, 'ระดับน้ำสำรอง');
  if (!Number.isInteger(year) || year < 2500 || year > 2700) {
    throw new Error('ปี พ.ศ. ต้องเป็นจำนวนเต็มระหว่าง 2500–2700');
  }
  if (!month) throw new Error('เดือนภาษาไทยไม่ถูกต้อง');
  return { year: year, month: month, municipal: municipal, plant: plant, reserve: reserve };
}

function parseRequiredNonNegative_(value, label) {
  if (value === '' || value === null || typeof value === 'undefined') throw new Error('กรุณากรอก' + label);
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error(label + ' ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป');
  return number;
}

function parseOptionalNonNegative_(value, label) {
  if (value === '' || value === null || typeof value === 'undefined') return null;
  return parseRequiredNonNegative_(value, label);
}

function normalizeThaiMonth_(value) {
  const text = String(value || '').trim();
  if (THAI_MONTHS.indexOf(text) >= 0) return text;
  return MONTH_ALIASES[text] || '';
}

function configureSettings() {
  const ui = SpreadsheetApp.getUi();
  const current = getSettings_();
  const emailResult = ui.prompt('อีเมลแจ้งเตือน', 'กรอกอีเมลผู้รับ (ปัจจุบัน: ' + (current.alertEmail || 'ยังไม่ได้ตั้งค่า') + ')', ui.ButtonSet.OK_CANCEL);
  if (emailResult.getSelectedButton() !== ui.Button.OK) return;
  const email = emailResult.getResponseText().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    ui.alert('รูปแบบอีเมลไม่ถูกต้อง');
    return;
  }
  const thresholdResult = ui.prompt('เกณฑ์แจ้งเตือน', 'กรอก Critical,Warning เช่น 3.5,4', ui.ButtonSet.OK_CANCEL);
  if (thresholdResult.getSelectedButton() !== ui.Button.OK) return;
  const values = thresholdResult.getResponseText().split(',').map(Number);
  if (values.length !== 2 || !values.every(Number.isFinite) || values[0] <= 0 || values[1] <= values[0]) {
    ui.alert('เกณฑ์ไม่ถูกต้อง: Warning ต้องมากกว่า Critical และทั้งสองค่าต้องมากกว่า 0');
    return;
  }
  PropertiesService.getScriptProperties().setProperties({
    ALERT_EMAIL: email,
    RESERVE_CRITICAL_DAYS: String(values[0]),
    RESERVE_WARNING_DAYS: String(values[1])
  });
  setupFormatting_(getSheet_(APP.SHEETS.RAW));
  ui.alert('บันทึกการตั้งค่าเรียบร้อย');
}

function getSettings_() {
  const props = PropertiesService.getScriptProperties();
  return {
    alertEmail: props.getProperty(APP.PROP.ALERT_EMAIL) || Session.getEffectiveUser().getEmail() || '',
    warningDays: Number(props.getProperty(APP.PROP.WARNING_DAYS)) || APP.DEFAULT_WARNING_DAYS,
    criticalDays: Number(props.getProperty(APP.PROP.CRITICAL_DAYS)) || APP.DEFAULT_CRITICAL_DAYS
  };
}

function ensureSecrets_() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty(APP.PROP.API_KEY)) props.setProperty(APP.PROP.API_KEY, createSecret_());
  if (!props.getProperty(APP.PROP.DASHBOARD_TOKEN)) props.setProperty(APP.PROP.DASHBOARD_TOKEN, createSecret_());
}

function createSecret_() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 16);
}

function showAccessInformation() {
  ensureSecrets_();
  const props = PropertiesService.getScriptProperties();
  const url = ScriptApp.getService().getUrl();
  const dashboardUrl = url ? url + '?key=' + props.getProperty(APP.PROP.DASHBOARD_TOKEN) : 'Deploy as Web App first';
  SpreadsheetApp.getUi().alert(
    'ข้อมูลการเชื่อมต่อ',
    'API Key:\n' + props.getProperty(APP.PROP.API_KEY) + '\n\nDashboard URL:\n' + dashboardUrl +
      '\n\nเก็บข้อมูลนี้เป็นความลับและไม่บันทึกลง GitHub',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function doGet(e) {
  const parameters = (e && e.parameter) || {};
  if (parameters.action === 'health') {
    return jsonOutput_({ ok: true, service: APP.NAME, version: APP.VERSION, status: 'online', timestamp: new Date().toISOString() });
  }
  ensureSecrets_();
  const expected = PropertiesService.getScriptProperties().getProperty(APP.PROP.DASHBOARD_TOKEN);
  if (!parameters.key || parameters.key !== expected) {
    return HtmlService.createHtmlOutput('<h2>Access denied</h2><p>Open the dashboard using the URL shown in 💧 Water DB → ดู API และ Dashboard Key.</p>');
  }
  const template = HtmlService.createTemplateFromFile('Dashboard');
  template.accessToken = parameters.key;
  return template.evaluate().setTitle(APP.NAME).addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function doPost(e) {
  let body;
  let apiLock;
  try {
    body = JSON.parse(e && e.postData && e.postData.contents ? e.postData.contents : '{}');
    ensureSecrets_();
    const expected = PropertiesService.getScriptProperties().getProperty(APP.PROP.API_KEY);
    if (!body.apiKey || body.apiKey !== expected) return jsonOutput_({ ok: false, code: 'UNAUTHORIZED', message: 'Invalid API key' });
    apiLock = LockService.getScriptLock();
    apiLock.waitLock(30000);
    if (body.requestId) {
      const previous = findApiRequest_(String(body.requestId));
      if (previous) return jsonOutput_({ ok: true, code: 'DUPLICATE', message: 'Request already processed', previous: previous });
    }
    const result = upsertMonthlyReading_(body, 'api');
    if (body.requestId) logApiRequest_(String(body.requestId), 'monthly-reading', result.code, result.message);
    return jsonOutput_(result);
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    if (body && body.requestId) logApiRequest_(String(body.requestId), 'monthly-reading', 'ERROR', message);
    return jsonOutput_({ ok: false, code: 'VALIDATION_ERROR', message: message });
  } finally {
    if (apiLock) apiLock.releaseLock();
  }
}

function jsonOutput_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function findApiRequest_(requestId) {
  const sheet = getSheet_(APP.SHEETS.API_LOG);
  if (sheet.getLastRow() < 2) return null;
  const found = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).createTextFinder(requestId).matchEntireCell(true).findNext();
  if (!found) return null;
  return sheet.getRange(found.getRow(), 1, 1, 5).getDisplayValues()[0];
}

function logApiRequest_(requestId, action, status, message) {
  getSheet_(APP.SHEETS.API_LOG).appendRow([new Date(), requestId, action, status, message]);
}

function installTriggers() {
  installTriggers_();
  SpreadsheetApp.getUi().alert('ติดตั้ง Triggers เรียบร้อย');
}

/** Compatibility entry point from the former setup instructions. */
function setupSupportSheets() {
  setupSystem();
}

/** Re-applies reserve-day formatting without rebuilding the workbook. */
function setupFormatting() {
  setupFormatting_(getSheet_(APP.SHEETS.RAW));
  SpreadsheetApp.getUi().alert('ติดตั้ง Conditional Formatting คอลัมน์ P เรียบร้อย');
}

/** Compatibility entry point from the former Code.gs. */
function checkReserveDays(row) {
  maybeSendReserveAlert_(Number(row));
}

function installTriggers_() {
  const handlers = ['handleSheetEdit', 'sendMonthlySummary'];
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (handlers.indexOf(trigger.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('handleSheetEdit').forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet()).onEdit().create();
  ScriptApp.newTrigger('sendMonthlySummary').timeBased().onMonthDay(1).atHour(7).create();
}

function handleSheetEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  if (sheet.getName() !== APP.SHEETS.RAW || e.range.getRow() < 2) return;
  const firstColumn = e.range.getColumn();
  const lastColumn = e.range.getLastColumn();
  const touchesInput = [5, 6, 14].some(function(column) {
    return column >= firstColumn && column <= lastColumn;
  });
  if (!touchesInput) return;
  const firstRow = e.range.getRow();
  const lastRow = e.range.getLastRow();
  for (let row = firstRow; row <= lastRow; row++) applyRowFormulas_(sheet, row);
  SpreadsheetApp.flush();
  for (let row = firstRow; row <= lastRow; row++) maybeSendReserveAlert_(row);
  refreshDashboardSheet_();
}

function maybeSendReserveAlert_(row) {
  const sheet = getSheet_(APP.SHEETS.RAW);
  const values = sheet.getRange(row, 1, 1, 16).getValues()[0];
  const daysLeft = Number(values[15]);
  const settings = getSettings_();
  if (!Number.isFinite(daysLeft) || daysLeft <= 0 || daysLeft >= settings.criticalDays || !settings.alertEmail) return;
  const year = values[0];
  const month = values[1];
  const alertKey = 'RESERVE_CRITICAL|' + year + '|' + month;
  const log = getSheet_(APP.SHEETS.ALERTS);
  if (log.getLastRow() > 1) {
    const exists = log.getRange(2, 1, log.getLastRow() - 1, 1).createTextFinder(alertKey).matchEntireCell(true).findNext();
    if (exists) return;
  }
  MailApp.sendEmail({
    to: settings.alertEmail,
    subject: 'น้ำสำรองต่ำกว่าเกณฑ์: ' + month + ' ' + year,
    body: 'น้ำสำรองใช้ได้อีกประมาณ ' + daysLeft.toFixed(2) + ' วัน ซึ่งต่ำกว่าเกณฑ์ ' + settings.criticalDays + ' วัน\n\nกรุณาตรวจสอบแผนสำรองและข้อมูลล่าสุดในระบบ\n\n' + SpreadsheetApp.getActiveSpreadsheet().getUrl()
  });
  log.appendRow([alertKey, new Date(), year, month, daysLeft, settings.alertEmail, 'SENT']);
}

function scanAllReserves() {
  const records = readMonthlyRecords_().filter(function(item) { return Number.isFinite(item.daysLeft) && item.daysLeft > 0; });
  const settings = getSettings_();
  const lines = records.slice(-36).reverse().map(function(item) {
    const icon = item.daysLeft < settings.criticalDays ? '🔴' : item.daysLeft <= settings.warningDays ? '🟡' : '🟢';
    return icon + ' ' + item.month + ' ' + item.year + ': ' + item.daysLeft.toFixed(2) + ' วัน';
  });
  SpreadsheetApp.getUi().alert(lines.length ? lines.join('\n') : 'ยังไม่มีข้อมูลน้ำสำรอง');
}

function sendMonthlySummary() {
  const data = getDashboardDataInternal_();
  const settings = getSettings_();
  if (!data.latest || !settings.alertEmail) return;
  const item = data.latest;
  const body = [
    'รายงานการใช้น้ำ ' + item.month + ' ' + item.year,
    '',
    'น้ำประปาเทศบาล: ' + formatNumber_(item.municipal) + ' ลบ.ม.',
    'น้ำจากโรงผลิต: ' + formatNumber_(item.plant) + ' ลบ.ม.',
    'รวม: ' + formatNumber_(item.total) + ' ลบ.ม.',
    'น้ำสำรอง: ' + formatNumber_(item.reserve) + ' ลบ.ม.',
    'ใช้ได้อีก: ' + formatNumber_(item.daysLeft) + ' วัน',
    '',
    SpreadsheetApp.getActiveSpreadsheet().getUrl()
  ].join('\n');
  MailApp.sendEmail({ to: settings.alertEmail, subject: 'รายงานการใช้น้ำ ' + item.month + ' ' + item.year, body: body });
}

function openDashboardSheet() {
  const sheet = getSheet_(APP.SHEETS.DASHBOARD);
  refreshDashboardSheet_();
  SpreadsheetApp.getActiveSpreadsheet().setActiveSheet(sheet);
}

function refreshDashboardSheet() {
  refreshDashboardSheet_();
  SpreadsheetApp.getUi().alert('อัปเดต Dashboard เรียบร้อย');
}

function refreshDashboardSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(APP.SHEETS.DASHBOARD);
  if (!sheet) return;
  const data = getDashboardDataInternal_();
  sheet.clearContents();
  sheet.getRange('A1:H8').breakApart();
  sheet.getRange('A1:H1').merge().setValue('Hospital Water Monitoring Dashboard')
    .setFontSize(20).setFontWeight('bold').setFontColor('#ffffff').setBackground('#0b7285').setHorizontalAlignment('center');
  sheet.getRange('A2:H2').merge().setValue('อัปเดตล่าสุด: ' + Utilities.formatDate(new Date(), APP.TIMEZONE, 'dd/MM/yyyy HH:mm'))
    .setFontColor('#4f5d64').setHorizontalAlignment('center');
  if (!data.latest) {
    sheet.getRange('A4:H6').merge().setValue('ยังไม่มีข้อมูล กรุณาบันทึกข้อมูลรายเดือน').setHorizontalAlignment('center');
    return;
  }
  const latest = data.latest;
  const cards = [
    ['ปริมาณใช้รวม', latest.total, 'ลบ.ม.'], ['ใช้เฉลี่ยต่อวัน', latest.avgPerDay, 'ลบ.ม.'],
    ['น้ำสำรอง', latest.reserve, 'ลบ.ม.'], ['ใช้ได้อีก', latest.daysLeft, 'วัน']
  ];
  cards.forEach(function(card, index) {
    const col = index * 2 + 1;
    sheet.getRange(4, col, 1, 2).merge().setValue(card[0]).setFontWeight('bold').setBackground('#dff4f5').setHorizontalAlignment('center');
    sheet.getRange(5, col, 1, 2).merge().setValue(formatNumber_(card[1]) + ' ' + card[2]).setFontSize(16).setHorizontalAlignment('center');
  });
  sheet.getRange('A8:H8').merge().setValue('แนวโน้ม 12 เดือนล่าสุด').setFontWeight('bold').setBackground('#e9ecef');
  sheet.getRange('A9:C9').setValues([['เดือน', 'ปริมาณรวม', 'น้ำสำรอง (วัน)']]).setFontWeight('bold').setBackground('#dff4f5');
  if (data.trend.length) {
    sheet.getRange(10, 1, data.trend.length, 3).setValues(data.trend.map(function(item) {
      return [item.month + ' ' + item.year, item.total, item.daysLeft];
    }));
  }
  sheet.getCharts().forEach(function(chart) { sheet.removeChart(chart); });
  if (data.trend.length > 1) {
    const chart = sheet.newChart().asLineChart()
      .addRange(sheet.getRange(9, 1, data.trend.length + 1, 2))
      .setPosition(9, 5, 0, 0).setOption('title', 'ปริมาณใช้น้ำรวม').setOption('legend', { position: 'none' }).build();
    sheet.insertChart(chart);
  }
}

function getDashboardData(accessToken) {
  ensureSecrets_();
  const expected = PropertiesService.getScriptProperties().getProperty(APP.PROP.DASHBOARD_TOKEN);
  if (!accessToken || accessToken !== expected) throw new Error('Unauthorized');
  return getDashboardDataInternal_();
}

function getDashboardDataInternal_() {
  const records = readMonthlyRecords_();
  const latest = records.length ? records[records.length - 1] : null;
  return {
    version: APP.VERSION,
    generatedAt: Utilities.formatDate(new Date(), APP.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    latest: latest,
    trend: records.slice(-12),
    settings: {
      warningDays: getSettings_().warningDays,
      criticalDays: getSettings_().criticalDays
    }
  };
}

function readMonthlyRecords_() {
  const sheet = getSheet_(APP.SHEETS.RAW);
  if (sheet.getLastRow() < 2) return [];
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 25).getValues();
  return rows.filter(function(row) {
    return row[0] && row[1] && row[6] !== '';
  }).map(function(row) {
    return {
      year: Number(row[0]), month: String(row[1]), monthNumber: Number(row[2]),
      municipal: finiteOrZero_(row[4]), plant: finiteOrZero_(row[5]), total: finiteOrZero_(row[6]),
      opd: finiteOrZero_(row[7]), ipd: finiteOrZero_(row[8]), litersPerOpd: finiteOrZero_(row[9]),
      patientDays: finiteOrZero_(row[11]), litersPerPatientDay: finiteOrZero_(row[12]),
      reserve: finiteOrZero_(row[13]), avgPerDay: finiteOrZero_(row[14]), daysLeft: finiteOrZero_(row[15]),
      buildingVariance: [finiteOrZero_(row[22]), finiteOrZero_(row[23]), finiteOrZero_(row[24])],
      sortKey: Number(row[0]) * 100 + Number(row[2])
    };
  }).sort(function(a, b) { return a.sortKey - b.sortKey; });
}

function finiteOrZero_(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatNumber_(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  return number.toLocaleString('th-TH', { maximumFractionDigits: 2 });
}

function findMonthlyRow_(sheet, year, month) {
  if (sheet.getLastRow() < 2) return 0;
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getDisplayValues();
  for (let index = 0; index < values.length; index++) {
    if (Number(values[index][0]) === Number(year) && normalizeThaiMonth_(values[index][1]) === normalizeThaiMonth_(month)) return index + 2;
  }
  return 0;
}

function logAudit_(action, year, month, source, details) {
  let user = '';
  try { user = Session.getActiveUser().getEmail(); } catch (error) { user = ''; }
  getSheet_(APP.SHEETS.AUDIT).appendRow([new Date(), action, year, month, source, user, details]);
}

function ensureSheet_(ss, name, headers) {
  const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  if (headers && headers.length) {
    const current = sheet.getRange(1, 1, 1, headers.length).getDisplayValues()[0];
    if (current.every(function(value) { return value === ''; })) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sheet;
}

function getSheet_(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('ไม่พบชีต ' + name + ' กรุณารัน setupSystem ก่อน');
  return sheet;
}

function styleTable_(sheet, columnCount) {
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, columnCount).setFontWeight('bold').setFontColor('#ffffff').setBackground('#0b7285').setWrap(true);
}
