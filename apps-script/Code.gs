/**
 * FAST - Google Sheet backup for the fasting tracker.
 *
 * Bound to the backup Sheet. The phone app posts every start, stop and delete
 * here; on a new phone the app reads the log back from this Sheet.
 *
 * One-time setup (see README.md):
 *   1. Run setup()            -> creates the Log tab and the secret key.
 *   2. Deploy as web app      -> Execute as: Me, Who has access: Anyone.
 *   3. Run showSetupLink()    -> open the logged link once on the phone.
 *
 * The key lives in Script Properties, never in the Sheet or in this file.
 */

const APP_URL = 'https://jensparker.github.io/fast/';
const SHEET_NAME = 'Log';
const KEY_PROPERTY = 'FAST_KEY';
const HEADERS = ['ID', 'Start', 'End', 'Hours', 'Status', 'Start (ms)', 'End (ms)', 'Updated'];
const GOAL_MS = 36 * 3600 * 1000;

function setup() {
  const sheet = getLogSheet_();
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty(KEY_PROPERTY)) {
    props.setProperty(KEY_PROPERTY, Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''));
  }
  Logger.log('Log tab ready: ' + sheet.getName() + '. Now deploy as web app, then run showSetupLink().');
}

/** Logs the one-time link that connects the phone app to this Sheet. */
function showSetupLink() {
  const key = PropertiesService.getScriptProperties().getProperty(KEY_PROPERTY);
  const url = ScriptApp.getService().getUrl();
  if (!key) throw new Error('Run setup() first.');
  if (!url) throw new Error('Deploy as web app first (Deploy > New deployment > Web app).');
  const execUrl = url.replace(/\/dev$/, '/exec');
  const code = Utilities.base64EncodeWebSafe(JSON.stringify({ u: execUrl, k: key }));
  Logger.log('Open this link once on your phone (Chrome):\n' + APP_URL + '#setup=' + code);
  Logger.log('Or paste by hand in SETUP -> URL: ' + execUrl + '  KEY: ' + key);
}

function doGet() {
  return ContentService.createTextOutput('FAST sync endpoint.');
}

function doPost(e) {
  let result;
  try {
    const body = JSON.parse(e.postData.contents);
    const key = PropertiesService.getScriptProperties().getProperty(KEY_PROPERTY);
    if (!key || body.key !== key) {
      result = { error: 'unauthorized' };
    } else {
      const lock = LockService.getScriptLock();
      lock.waitLock(20000);
      try {
        result = handle_(body);
      } finally {
        lock.releaseLock();
      }
    }
  } catch (err) {
    result = { error: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function handle_(body) {
  if (body.action === 'upsert') return upsert_(body.fast);
  if (body.action === 'delete') return delete_(body.id);
  if (body.action === 'list') return { fasts: list_() };
  return { error: 'unknown action' };
}

function getLogSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Row number (1-based) of the fast with this ID, or -1. */
function findRow_(sheet, id) {
  const last = sheet.getLastRow();
  if (last < 2) return -1;
  const ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function upsert_(fast) {
  if (!fast || !fast.id || !fast.start) return { error: 'invalid fast' };
  const sheet = getLogSheet_();
  const start = Number(fast.start);
  const end = fast.end ? Number(fast.end) : null;
  const status = end === null ? 'RUNNING' : (end - start >= GOAL_MS ? 'COMPLETE' : 'INCOMPLETE');
  const values = [[
    String(fast.id), new Date(start), end === null ? '' : new Date(end),
    end === null ? '' : Math.round((end - start) / 36000) / 100, status,
    start, end === null ? '' : end, new Date()
  ]];
  let row = findRow_(sheet, fast.id);
  if (row === -1) row = sheet.getLastRow() + 1;
  sheet.getRange(row, 1, 1, HEADERS.length).setValues(values);
  return { ok: true, row: row };
}

function delete_(id) {
  const sheet = getLogSheet_();
  const row = findRow_(sheet, id);
  if (row !== -1) sheet.deleteRow(row);
  return { ok: true, deleted: row !== -1 };
}

function list_() {
  const sheet = getLogSheet_();
  const last = sheet.getLastRow();
  if (last < 2) return [];
  return sheet.getRange(2, 1, last - 1, HEADERS.length).getValues()
    .filter(function (r) { return r[0] && r[5]; })
    .map(function (r) {
      return { id: String(r[0]), start: Number(r[5]), end: r[6] === '' ? null : Number(r[6]) };
    });
}
