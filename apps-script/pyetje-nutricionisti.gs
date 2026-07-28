/**
 * Pyet Nutricionistin — Apps Script Web App backend
 *
 * Sheet: "Pyetje Nutricionisti" (bind this script to that spreadsheet:
 * Extensions → Apps Script). Uses the first sheet tab, columns A–H:
 * Timestamp | UserID | Emri | Email | Pyetja | Përgjigja | Statusi | DataPërgjigjes
 *
 * Each account gets exactly 1 question — doPost rejects a second submission
 * from a userId that already has a row.
 *
 * SETUP
 * 1. Paste this file into Extensions → Apps Script on the "Pyetje Nutricionisti" sheet.
 * 2. Deploy → New deployment → Web app → Execute as "Me" → Who has access "Anyone".
 * 3. Copy the /exec URL into API.pyetjeNutricionisti in src/constants/index.ts.
 * 4. Triggers (clock icon, left sidebar) → Add Trigger:
 *      function: onAnswerEdit
 *      event source: From spreadsheet
 *      event type: On edit
 *    This MUST be an installable trigger (not the default onEdit) — only
 *    installable triggers are authorized to send email.
 *
 * ANSWERING WORKFLOW (Pavli)
 * Filter the sheet where Statusi = "Në pritje", type the reply into the
 * Përgjigja cell. The trigger below handles the rest.
 */

var HEADERS = ['Timestamp', 'UserID', 'Emri', 'Email', 'Pyetja', 'Përgjigja', 'Statusi', 'DataPërgjigjes'];
var COL = { TIMESTAMP: 1, USER_ID: 2, EMRI: 3, EMAIL: 4, PYETJA: 5, PERGJIGJA: 6, STATUSI: 7, DATA_PERGJIGJES: 8 };
var APP_URL = 'https://app.sohealthy.al/pyetje';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var userId = String(data.userId || '').trim();
    var emri = String(data.emri || '').trim();
    var email = String(data.email || '').trim();
    var pyetja = String(data.pyetja || '').trim();

    if (!userId || !pyetja) {
      return jsonResponse({ ok: false, error: 'Mungon userId ose pyetja.' });
    }

    var sheet = getSheet();
    var values = sheet.getDataRange().getValues();
    for (var i = 1; i < values.length; i++) {
      if (String(values[i][COL.USER_ID - 1]).trim() === userId) {
        return jsonResponse({ ok: false, error: 'alreadyAsked' });
      }
    }

    sheet.appendRow([new Date(), userId, emri, email, pyetja, '', 'Në pritje', '']);
    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err.message || err) });
  }
}

function doGet(e) {
  try {
    var userId = String((e.parameter && e.parameter.userId) || '').trim();
    if (!userId) return jsonResponse({ ok: false, error: 'Mungon userId.' });

    var values = getSheet().getDataRange().getValues();
    var rows = [];
    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      if (String(row[COL.USER_ID - 1]).trim() === userId) {
        rows.push({
          timestamp: toIso(row[COL.TIMESTAMP - 1]),
          pyetja: row[COL.PYETJA - 1],
          pergjigja: row[COL.PERGJIGJA - 1],
          statusi: row[COL.STATUSI - 1],
          dataPergjigjes: toIso(row[COL.DATA_PERGJIGJES - 1]),
        });
      }
    }
    rows.sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
    return jsonResponse({ ok: true, questions: rows });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err.message || err) });
  }
}

/**
 * Installable "On edit" trigger — do NOT rename to onEdit() and rely on the
 * simple trigger, it cannot send email (no auth).
 */
function onAnswerEdit(e) {
  try {
    var range = e.range;
    var sheet = range.getSheet();
    if (sheet.getName() !== getSheet().getName()) return;
    if (range.getRow() === 1) return;                 // header row
    if (range.getColumn() !== COL.PERGJIGJA) return;   // only care about the answer column

    var row = range.getRow();
    var rowValues = sheet.getRange(row, 1, 1, HEADERS.length).getValues()[0];
    var answer = String(rowValues[COL.PERGJIGJA - 1] || '').trim();
    var status = String(rowValues[COL.STATUSI - 1] || '').trim();

    if (!answer) return;                  // blank/whitespace edit — ignore
    if (status === 'Përgjigjur') return;  // already notified — guards against duplicate emails

    var email = String(rowValues[COL.EMAIL - 1] || '').trim();
    var emri = String(rowValues[COL.EMRI - 1] || '').trim();

    if (email) {
      MailApp.sendEmail({
        to: email,
        subject: 'Pavli ju është përgjigjur',
        body: 'Përshëndetje' + (emri ? ' ' + emri : '') + ',\n\n' +
          'Pavli i është përgjigjur pyetjes tuaj në SoHealthy.\n' +
          'Hape aplikacionin te "Pyetjet e Mia" për ta lexuar:\n' + APP_URL + '\n\nSoHealthy',
      });
    }

    sheet.getRange(row, COL.STATUSI).setValue('Përgjigjur');
    sheet.getRange(row, COL.DATA_PERGJIGJES).setValue(new Date());
  } catch (err) {
    console.error('onAnswerEdit error: ' + err.message);
  }
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheets()[0];
}

function toIso(val) {
  return val instanceof Date ? val.toISOString() : val;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
