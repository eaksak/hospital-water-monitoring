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
  'sendMonthlySummary', 'doGet', 'doPost', 'getDashboardData'
];

for (const name of requiredFunctions) {
  if (!new RegExp(`function\\s+${name}\\s*\\(`).test(code)) throw new Error(`Missing function: ${name}`);
}

if (!sidebar.includes("form.addEventListener('submit'")) throw new Error('Sidebar submit handler is missing');
if (/noscript\s*=/.test(sidebar)) throw new Error('Invalid noscript click handler detected');
if (!dashboard.includes('getDashboardData(ACCESS_TOKEN)')) throw new Error('Dashboard access-token flow is missing');
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
vm.runInContext(`${code}\nthis.testApi = { normalizeThaiMonth_, validateReading_ };`, context);
if (context.testApi.normalizeThaiMonth_('มกราคม') !== 'ม.ค') throw new Error('Full Thai month normalization failed');
if (context.testApi.normalizeThaiMonth_('ม.ค.') !== 'ม.ค') throw new Error('January dot-variant normalization failed');
const zeroReading = context.testApi.validateReading_({ year: 2569, month: 'ส.ค.', municipal: 0, plant: 0, reserve: 0 });
if (zeroReading.reserve !== 0 || zeroReading.municipal !== 0) throw new Error('Zero-value readings must be valid');
let rejectedNegative = false;
try { context.testApi.validateReading_({ year: 2569, month: 'ส.ค.', municipal: -1, plant: 0 }); } catch { rejectedNegative = true; }
if (!rejectedNegative) throw new Error('Negative readings must be rejected');

console.log('Validation passed: syntax, manifest, UI wiring, triggers, locking, access controls, and input edge cases.');
