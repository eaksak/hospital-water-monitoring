import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';

const code = readFileSync(new URL('../src/Code.gs', import.meta.url), 'utf8');
const sidebar = readFileSync(new URL('../src/Sidebar.html', import.meta.url), 'utf8');
const dashboard = readFileSync(new URL('../src/Dashboard.html', import.meta.url), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('../src/appsscript.json', import.meta.url), 'utf8'));

const requiredFunctions = [
  'setupSystem', 'showEntryForm', 'submitMonthlyReading', 'handleSheetEdit',
  'sendMonthlySummary', 'doGet', 'doPost', 'getDashboardData', 'getPeriodDashboardData'
];

for (const name of requiredFunctions) {
  if (!new RegExp(`function\\s+${name}\\s*\\(`).test(code)) throw new Error(`Missing function: ${name}`);
}

if (!sidebar.includes("form.addEventListener('submit'")) throw new Error('Sidebar submit handler is missing');
if (/noscript\s*=/.test(sidebar)) throw new Error('Invalid noscript click handler detected');
if (!dashboard.includes('getPeriodDashboardData(ACCESS_TOKEN')) throw new Error('Period dashboard access-token flow is missing');
if (!dashboard.includes('window.print()')) throw new Error('PDF print/export flow is missing');
if (!dashboard.includes('@media print')) throw new Error('Print report layout is missing');
if (manifest.runtimeVersion !== 'V8') throw new Error('Apps Script V8 runtime is required');
if (!code.includes("ScriptApp.newTrigger('handleSheetEdit')")) throw new Error('Installable edit trigger is missing');
if (!code.includes('LockService.getDocumentLock()')) throw new Error('Document write lock is missing');
if (!code.includes("APP.PROP.API_KEY")) throw new Error('API key validation is missing');

const temp = mkdtempSync(join(tmpdir(), 'water-monitor-'));
const jsFile = join(temp, 'Code.js');
writeFileSync(jsFile, code);
execFileSync(process.execPath, ['--check', jsFile], { stdio: 'inherit' });

function validateInlineScript(html, name) {
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) throw new Error(`${name} has no inline script`);
  const source = match[1].replace(/<\?!=[\s\S]*?\?>/g, '"test-token"');
  const file = join(temp, `${name}.js`);
  writeFileSync(file, source);
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}
validateInlineScript(sidebar, 'Sidebar');
validateInlineScript(dashboard, 'Dashboard');

const context = vm.createContext({ console });
vm.runInContext(`${code}\nthis.testApi = { normalizeThaiMonth_, validateReading_, buildPeriodDashboardData_, normalizePeriodFilters_ };`, context);
if (context.testApi.normalizeThaiMonth_('มกราคม') !== 'ม.ค') throw new Error('Full Thai month normalization failed');
if (context.testApi.normalizeThaiMonth_('ม.ค.') !== 'ม.ค') throw new Error('January dot-variant normalization failed');
const zeroReading = context.testApi.validateReading_({ year: 2569, month: 'ส.ค.', municipal: 0, plant: 0, reserve: 0 });
if (zeroReading.reserve !== 0 || zeroReading.municipal !== 0) throw new Error('Zero-value readings must be valid');
let rejectedNegative = false;
try { context.testApi.validateReading_({ year: 2569, month: 'ส.ค.', municipal: -1, plant: 0 }); } catch { rejectedNegative = true; }
if (!rejectedNegative) throw new Error('Negative readings must be rejected');

function reportRecord(index, total, daysLeft) {
  return {
    year: 2567, month: `M${index}`, monthNumber: index, sortKey: 256700 + index,
    municipal: total * 0.2, plant: total * 0.8, total,
    opd: 1000, ipd: 100, litersPerOpd: total, patientDays: 500,
    litersPerPatientDay: total * 2, reserve: daysLeft * 10, avgPerDay: 10, daysLeft,
    buildingUsage: [70 + index, 20 + index, 10 + index],
    buildingTargets: [70, 20, 10],
    buildingVariance: [index, index - 2, 2 - index],
    hasOpdData: true, hasPatientDayData: true, hasReserveData: true
  };
}
const records = [
  reportRecord(1, 100, 5), reportRecord(2, 110, 4.2), reportRecord(3, 120, 3.6),
  reportRecord(4, 130, 3.4), reportRecord(5, 140, 4), reportRecord(6, 150, 5)
];
const report = context.testApi.buildPeriodDashboardData_(records, { fromKey:256704, toKey:256706 }, { criticalDays:3.5, warningDays:4 });
if (report.records.length !== 3 || report.summary.totalUsage !== 420) throw new Error('Selected-period totals are incorrect');
if (!report.previousSummary || report.previousSummary.totalUsage !== 330) throw new Error('Previous equal-length period is incorrect');
if (report.summary.criticalMonths !== 1 || report.summary.warningMonths !== 1) throw new Error('Reserve threshold classification is incorrect');
if (report.analytics.length < 5 || !report.analytics.some((item) => item.category === 'reserve')) throw new Error('Analytical report is incomplete');
if (report.buildings.length !== 3 || report.buildings[0].monthsOverTarget !== 3) throw new Error('Building variance summary is incorrect');
const reversed = context.testApi.normalizePeriodFilters_(records, { fromKey:256706, toKey:256704 });
if (reversed.fromKey !== 256704 || reversed.toKey !== 256706) throw new Error('Reversed period range was not normalized');

console.log('Validation passed: syntax, manifest, UI wiring, period calculations, analytics, PDF layout, security, and input edge cases.');
