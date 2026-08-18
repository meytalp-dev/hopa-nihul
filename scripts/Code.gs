/*************************************************************
 * איסוף מענים מקבוצות הווטסאפ של מיטל → Google Sheet
 * + שליחת הודעות לקבוצות ניהול מדף-ניהול-הופה
 *************************************************************/

// ---------- הגדרות ----------
const MODEL = 'claude-sonnet-5';        // המוח: סינון + חילוץ + ניסוח
const CONFIDENCE_THRESHOLD = 0.6;       // סף ביטחון לקבלת מענה
const LOOKBACK_MINUTES = 1440;          // כמה אחורה למשוך כל סריקה (מקס' 1440 = 24ש')
const MAX_IMAGES = 25;                  // תקרת תמונות לסריקה (שמירה על עלות; מעבר לכך נבדק בסריקה הבאה)

// שמות לשוניות
const TAB_MENIM  = 'מענים';     // המאגר + ממשק האישור
const TAB_GROUPS = 'קבוצות';    // בחירת הקבוצות לקריאה
const TAB_SEEN   = '_מזוהים';   // מזהי הודעות שכבר עובדו (לכפילות)

// ============================================================
// הגדרה חד-פעמית
// ============================================================
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // לשונית מענים
  let menim = ss.getSheetByName(TAB_MENIM) || ss.insertSheet(TAB_MENIM);
  if (menim.getLastRow() === 0) {
    menim.appendRow([
      'תאריך', 'קבוצת מקור', 'שם המענה', 'אזור', 'קהל יעד',
      'גיל', 'קישור', 'הודעה מוכנה לרכזים', 'סטטוס', 'התאמה', 'טקסט מקורי'
    ]);
    menim.setFrozenRows(1);
    menim.getRange('A1:K1').setFontWeight('bold').setBackground('#E8348A').setFontColor('#ffffff');
    menim.setColumnWidth(8, 380);
    menim.setColumnWidth(11, 320);
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['ממתין', 'נשלח', 'נדחה'], true).build();
    menim.getRange('I2:I').setDataValidation(rule);
  }

  // לשונית קבוצות
  let groups = ss.getSheetByName(TAB_GROUPS) || ss.insertSheet(TAB_GROUPS);
  if (groups.getLastRow() === 0) {
    groups.appendRow(['לקרוא?', 'שם קבוצה', 'chatId']);
    groups.setFrozenRows(1);
    groups.getRange('A1:C1').setFontWeight('bold').setBackground('#FFF200');
    const cb = SpreadsheetApp.newDataValidation().requireCheckbox().build();
    groups.getRange('A2:A').setDataValidation(cb);
  }

  // לשונית מזוהים (מוסתרת)
  let seen = ss.getSheetByName(TAB_SEEN) || ss.insertSheet(TAB_SEEN);
  if (seen.getLastRow() === 0) { seen.appendRow(['idMessage']); }
  seen.hideSheet();

  SpreadsheetApp.getUi().alert(
    'הוקם! עכשיו:\n' +
    '1. הגדרות → Script Properties: GREENAPI_INSTANCE, GREENAPI_TOKEN, ANTHROPIC_API_KEY, MEITAL_WHATSAPP\n' +
    '2. הרץ listGroups() ובחר קבוצות בלשונית "קבוצות"\n' +
    '3. הרץ createDailyTrigger()'
  );
}

// חלקי-שם של הקבוצות שיסומנו אוטומטית ✓ (אפשר להוסיף/לערוך)
const WANTED = [
  'צעירי מוצקין',
  'משוחררים מוצקין',
  'מוצקינאים כללי',
  'תעסוקה וקריירה',
  "עכו ג'וב",
  'מרכז הזדמנות',
  'משרות מקצועיות',
  'שירות צבאי',
  'מילואימניקים ירושלמים',
  'מרכז צעירים עכו',
  'לאודר',
  'סטארט'
];

// מסיר רווחים/גרש/מרכאות כדי שההשוואה תעבוד גם עם שינויים קטנים בשם
function nrm2(s) { return String(s || '').replace(/[\s'׳`"״]/g, ''); }

// מושך את רשימת הקבוצות מהווטסאפ, כותב הכל, ומסמן אוטומטית את WANTED
function listGroups() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(TAB_GROUPS);
  if (!sheet) { SpreadsheetApp.getUi().alert('לא נמצאה לשונית "קבוצות" — הרץ setup קודם.'); return; }

  const contacts = greenGet('getContacts');
  if (!contacts) { SpreadsheetApp.getUi().alert('Green API לא החזיר תשובה. בדוק שה-Instance מחובר (Authorized).'); return; }

  const groups = contacts.filter(c => String(c.id || '').endsWith('@g.us'));

  const prev = sheet.getRange('A2:C').getValues();
  const checked = new Set(prev.filter(r => r[0] === true && r[2]).map(r => r[2]));

  const wantedN = WANTED.map(nrm2);

  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).clearContent();

  let auto = 0;
  const rows = groups.map(g => {
    const nm = nrm2(g.name);
    const isWanted = wantedN.some(w => w && nm.indexOf(w) !== -1);
    if (isWanted) auto++;
    return [checked.has(g.id) || isWanted, g.name || '(ללא שם)', g.id];
  });
  if (rows.length) sheet.getRange(2, 1, rows.length, 3).setValues(rows);
  SpreadsheetApp.flush();

  SpreadsheetApp.getUi().alert(
    `קבוצות שנכתבו: ${groups.length}\n` +
    `סומנו אוטומטית ✓: ${auto}\n\n` +
    `עברי על הסימונים בלשונית "קבוצות" ותקני אם צריך.`
  );
}

// קבוצות הניהול של הופה: token לזיהוי + סוג + בית ספר
const MGMT_GROUPS = [
  { token: 'פורום רכזי',            type: 'פורום',  school: '',                 label: 'פורום רכזי בוגרים' },
  { token: 'צוות אורט צור ברק',      type: 'צוות',   school: 'צור ברק',          label: 'צוות צור ברק' },
  { token: 'צוות מגשימים',          type: 'צוות',   school: 'מגשימים בית שאן',   label: 'צוות מגשימים בית שאן' },
  { token: 'צוות הופה אורט בית הערבה', type: 'צוות',   school: 'בית הערבה',        label: 'צוות בית הערבה' },
  { token: 'צוות עכו מרום',         type: 'צוות',   school: 'עכו מרום',         label: 'צוות עכו מרום' },
  { token: 'צוות אורט אדיבי',        type: 'צוות',   school: 'אדיבי אשקלון',      label: 'צוות אדיבי אשקלון' },
  { token: 'צוות עתיד טכנולוגי',     type: 'צוות',   school: 'מוצקין',           label: 'צוות עתיד טכנולוגי מוצקין' },
  { token: 'בוגרי אורט מרום עכו',    type: 'בוגרים', school: 'עכו מרום',         label: 'בוגרי מרום עכו' },
  { token: 'בוגרי תשפד',            type: 'בוגרים', school: 'אדיבי אשקלון',      label: 'בוגרי אדיבי אשקלון תשפ״ד' },
  { token: 'קבוצת עדכונים',         type: 'בוגרים', school: 'אדיבי אשקלון',      label: 'בוגרי אדיבי אשקלון עדכונים' },
  { token: 'מחזור נ תשפה',          type: 'בוגרים', school: 'אדיבי אשקלון',      label: 'בוגרי אדיבי אשקלון מחזור נ' },
  { token: 'בוגרי אורט צור ברק',     type: 'בוגרים', school: 'צור ברק',          label: 'בוגרי צור ברק' },
  { token: 'בוגרי אורט בית הערבה',   type: 'בוגרים', school: 'בית הערבה',        label: 'בוגרי בית הערבה' },
  { token: 'בוגרי עתיד טכנולוגי',    type: 'בוגרים', school: 'מוצקין',           label: 'בוגרי עתיד טכנולוגי מוצקין' },
  { token: 'בוגרי מגשימים',         type: 'בוגרים', school: 'מגשימים בית שאן',   label: 'בוגרי מגשימים בית שאן' },
];

function listManagementGroups() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const contacts = greenGet('getContacts');
  if (!contacts) { SpreadsheetApp.getUi().alert('Green API לא החזיר תשובה.'); return; }
  const groups = contacts.filter(c => String(c.id || '').endsWith('@g.us'));

  let sheet = ss.getSheetByName('ניהול') || ss.insertSheet('ניהול');
  sheet.clear();
  sheet.appendRow(['שם', 'סוג', 'בית ספר', 'chatId', 'נמצא?']);
  sheet.setFrozenRows(1);
  sheet.getRange('A1:E1').setFontWeight('bold').setBackground('#E8348A').setFontColor('#ffffff');

  const notFound = [];
  const rows = MGMT_GROUPS.map(mg => {
    const tokenN = nrm2(mg.token);
    const hit = groups.find(g => nrm2(g.name).indexOf(tokenN) !== -1);
    if (!hit) notFound.push(mg.label);
    return [mg.label, mg.type, mg.school, hit ? hit.id : '', hit ? '✓' : '✗ לא נמצא'];
  });
  sheet.getRange(2, 1, rows.length, 5).setValues(rows);
  SpreadsheetApp.flush();

  SpreadsheetApp.getUi().alert(
    `נמצאו ${rows.length - notFound.length} מתוך ${rows.length} קבוצות ניהול.` +
    (notFound.length ? `\n\nלא נמצאו:\n- ${notFound.join('\n- ')}` : '')
  );
}

// יוצר טריגר יומי (07:00 בבוקר בערך)
function createDailyTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'scanNow')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('scanNow').timeBased().everyDays(1).atHour(7).create();
  SpreadsheetApp.getUi().alert('נקבע טריגר יומי לשעה 07:00 בערך. אפשר לשנות ב"טריגרים".');
}

// ============================================================
// הסריקה — רצה כל יום
// ============================================================
function scanNow() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const menim = ss.getSheetByName(TAB_MENIM);
  const seenSheet = ss.getSheetByName(TAB_SEEN);

  const groupRows = ss.getSheetByName(TAB_GROUPS).getRange('A2:C').getValues();
  const allowedIds = new Set(groupRows.filter(r => r[0] === true && r[2]).map(r => r[2]));
  const nameById = {}; groupRows.forEach(r => { if (r[2]) nameById[r[2]] = r[1]; });
  if (allowedIds.size === 0) { Logger.log('אין קבוצות מסומנות — עצירה.'); return; }

  const msgs = greenGet('lastIncomingMessages', { minutes: LOOKBACK_MINUTES }) || [];

  const seenIds = new Set(seenSheet.getRange('A2:A').getValues().flat().filter(String));

  const existing = menim.getRange('C2:G').getValues();
  const existingNames = new Set(existing.map(r => norm(r[0])).filter(Boolean));
  const existingLinks = new Set(existing.map(r => norm(r[4])).filter(Boolean));

  const newSeen = [];
  const accepted = [];
  let imgCount = 0;

  for (const m of msgs) {
    const id = m.idMessage;
    const chatId = m.chatId || (m.senderData && m.senderData.chatId);
    if (!id || seenIds.has(id)) continue;
    if (!allowedIds.has(chatId)) continue;

    const isImage = msgType(m) === 'imageMessage';
    // אם עברנו את תקרת התמונות — לא לסמן כמעובד, שייבדק בסריקה הבאה
    if (isImage && imgCount >= MAX_IMAGES) continue;

    let ex, rawText;
    if (isImage) {
      imgCount++;
      const caption = extractCaption(m);
      const dl = greenDownloadUrl(chatId, id);
      const img = dl ? fetchImageBase64(dl) : null;
      if (!img) continue;                 // הורדה נכשלה (זמני) — לא לסמן כמעובד, ינוסה שוב בסריקה הבאה
      ex = classifyAndFormat(caption, img);
      rawText = caption || '(תמונה)';
    } else {
      const text = extractText(m);
      if (!looksLikeResource(text)) { newSeen.push([id]); continue; }   // מסנן זול קבוע — בוודאות לא מענה, לסמן כמעובד
      ex = classifyAndFormat(text);
      rawText = text;
    }
    // תקלת API/רשת (כולל אזל קרדיט) → ex==null. לא לסמן כמעובד, שההודעה תיבדק שוב בסריקה הבאה.
    if (!ex) continue;
    // התקבלה החלטה תקינה מ-Claude — עכשיו בטוח לסמן כמעובד כדי לא לבדוק שוב.
    newSeen.push([id]);
    if (ex.is_resource !== true) continue;
    if ((ex.confidence || 0) < CONFIDENCE_THRESHOLD) continue;
    if (ex.link && existingLinks.has(norm(ex.link))) continue;
    if (ex.name && existingNames.has(norm(ex.name))) continue;

    accepted.push([
      new Date(),
      nameById[chatId] || '',
      ex.name || '',
      ex.region || '',
      ex.target_audience || '',
      ageLabel(ex),
      ex.link || '',
      ex.message_for_coordinators || '',
      'ממתין',
      matchLabel(ex),
      rawText
    ]);
    existingNames.add(norm(ex.name)); if (ex.link) existingLinks.add(norm(ex.link));
  }

  if (newSeen.length) {
    seenSheet.getRange(seenSheet.getLastRow() + 1, 1, newSeen.length, 1).setValues(newSeen);
  }

  if (accepted.length) {
    menim.getRange(menim.getLastRow() + 1, 1, accepted.length, accepted[0].length).setValues(accepted);
    pingMeital(accepted.length);
  }
  Logger.log(`נסרקו ${msgs.length} הודעות, נמצאו ${accepted.length} מענים חדשים.`);
}

// ============================================================
// Claude — סיווג + חילוץ + ניסוח הודעה לרכזים בקריאה אחת
// ============================================================
function classifyAndFormat(text, image) {
  const prompt =
`אתה עוזר של עמותת "הופה" (מניעת נשירה וליווי בוגרים, גילאי 14-26).
בקבוצות ווטסאפ מתפרסמות הצעות מענה: סדנאות, קורסים, מלגות, תוכניות, אירועים, הזדמנויות תעסוקה, זכויות.
המשימה: לזהות אם ההודעה היא הצעת מענה אמיתית, לחלץ ממנה שדות, ולנסח הודעה מוכנה שמיטל תוכל להעביר לרכזים.
אם מצורפת תמונה, קרא גם את כל הטקסט שבתוך התמונה (כולל טקסט שצרוב על הגרפיקה) והתייחס אליו כחלק מההודעה.

ההודעה מהקבוצה (ייתכן שהטקסט ריק והמידע כולו בתמונה):
"""
${text}
"""

החזר JSON תקין בלבד, בלי טקסט מסביב:
{
  "is_resource": true/false,
  "confidence": 0.0-1.0,
  "name": "שם קצר וברור של המענה",
  "age_track": "1418" | "1826" | "",
  "age_uncertain": true/false,
  "region": "אזור/עיר אם מצוין, אחרת ריק",
  "target_audience": "קהל יעד אם מצוין, אחרת ריק",
  "link": "קישור הרשמה אם קיים, אחרת ריק",
  "message_for_coordinators": "הודעה מוכנה לשליחה לרכזים"
}

כללים ל-message_for_coordinators:
- קול רגוע, חם ומקצועי. בלי סימני קו מפריד ארוכים (—).
- מבנה: כותרת עם אימוג'י מתאים, שורת קהל יעד, תאריך/שעה/מקום אם קיימים, 2-3 נקודות על מה מקבלים, ולסיום קישור/דרך הרשמה.
- להשתמש רק במידע שמופיע בהודעה. לא להמציא תאריכים, מקומות, לינקים או טלפונים.
- אם חסר שדה, פשוט לדלג עליו בהודעה.

כללים נוספים:
- 14-18 = נוער, 18-26 = בוגרים. אם לא ברור — age_track="" ו-age_uncertain=true.
- אם זו לא הצעת מענה (ברכה, שאלה, שיחה, סטיקר) — is_resource=false.`;

  const content = [];
  if (image && image.data) {
    content.push({ type: 'image', source: { type: 'base64', media_type: image.mediaType || 'image/jpeg', data: image.data } });
  }
  content.push({ type: 'text', text: prompt });

  const key = prop('ANTHROPIC_API_KEY');
  const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({ model: MODEL, max_tokens: 900, messages: [{ role: 'user', content }] })
  });
  if (res.getResponseCode() !== 200) { Logger.log('Anthropic error: ' + res.getContentText()); return null; }
  const raw = (JSON.parse(res.getContentText()).content || [{}])[0].text || '';
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch (e) { Logger.log('JSON parse failed: ' + raw); return null; }
}

// ============================================================
// Green API
// ============================================================
function greenGet(method, params) {
  const inst = prop('GREENAPI_INSTANCE'), token = prop('GREENAPI_TOKEN');
  let url = `https://api.green-api.com/waInstance${inst}/${method}/${token}`;
  if (params) url += '?' + Object.keys(params).map(k => `${k}=${encodeURIComponent(params[k])}`).join('&');
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) { Logger.log(`Green ${method} error: ` + res.getContentText()); return null; }
  return JSON.parse(res.getContentText());
}

function greenSend(chatId, message) {
  const inst = prop('GREENAPI_INSTANCE'), token = prop('GREENAPI_TOKEN');
  const url = `https://api.green-api.com/waInstance${inst}/sendMessage/${token}`;
  const res = UrlFetchApp.fetch(url, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({ chatId, message })
  });
  if (res.getResponseCode() !== 200) throw new Error('send ' + res.getResponseCode());
  return true;
}

// מבקש מ-Green קישור הורדה טרי לקובץ של הודעה
function greenDownloadUrl(chatId, idMessage) {
  const inst = prop('GREENAPI_INSTANCE'), token = prop('GREENAPI_TOKEN');
  const url = `https://api.green-api.com/waInstance${inst}/downloadFile/${token}`;
  const res = UrlFetchApp.fetch(url, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({ chatId, idMessage })
  });
  if (res.getResponseCode() !== 200) { Logger.log('downloadFile error: ' + res.getContentText()); return null; }
  try { return JSON.parse(res.getContentText()).downloadUrl || null; } catch (e) { return null; }
}

// מוריד תמונה ומחזיר base64 + סוג, לשליחה ל-Claude
function fetchImageBase64(downloadUrl) {
  try {
    const res = UrlFetchApp.fetch(downloadUrl, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return null;
    const blob = res.getBlob();
    let mt = blob.getContentType() || 'image/jpeg';
    if (!/^image\//.test(mt)) mt = 'image/jpeg';
    return { data: Utilities.base64Encode(blob.getBytes()), mediaType: mt };
  } catch (e) { Logger.log('fetchImage error: ' + e); return null; }
}

function pingMeital(n) {
  const num = prop('MEITAL_WHATSAPP');
  if (!num) return;
  const link = SpreadsheetApp.getActiveSpreadsheet().getUrl();
  try {
    greenSend(`${num}@c.us`,
      `🔎 סריקת מענים: נמצאו ${n} מענים חדשים לבדיקה.\n` +
      `פתחי את השיט, אשרי מה שמתאים והעבירי לרכזים:\n${link}`);
  } catch (e) { Logger.log('ping failed: ' + e); }
}

// ============================================================
// עזרים
// ============================================================
function prop(k) { return PropertiesService.getScriptProperties().getProperty(k); }

function extractText(m) {
  return (m.textMessage)
      || (m.extendedTextMessage && m.extendedTextMessage.text)
      || (m.messageData && m.messageData.textMessageData && m.messageData.textMessageData.textMessage)
      || (m.messageData && m.messageData.extendedTextMessageData && m.messageData.extendedTextMessageData.text)
      || '';
}

// סוג ההודעה (textMessage / imageMessage / ...)
function msgType(m) {
  return m.typeMessage || (m.messageData && m.messageData.typeMessage) || '';
}

// כיתוב שמתחת לתמונה, אם יש
function extractCaption(m) {
  return (m.caption)
      || (m.fileMessageData && m.fileMessageData.caption)
      || (m.messageData && m.messageData.fileMessageData && m.messageData.fileMessageData.caption)
      || '';
}

const KEYWORDS = [
  'מלגה','מלגות','תוכנית','תכנית','קורס','סדנה','סדנת','הרשמה','נרשמים','להירשם',
  'מימון','מענק','זכאות','זכאים','זכויות','הזדמנות','ליווי','ייעוץ','אירוע','מפגש',
  'השמה','תעסוקה','עבודה','התמחות','מכינה','לצעירים','לנוער','חינם','ללא עלות',
  'פתוח להרשמה','לפרטים','טופס','קישור','לינק'
];
const URL_RE = /https?:\/\/\S+|wa\.me\/\S+|bit\.ly\/\S+|wkf\.ms\/\S+/i;

function looksLikeResource(text) {
  if (!text) return false;
  const t = String(text).trim();
  if (t.length < 40) return false;
  if (URL_RE.test(t)) return true;
  return KEYWORDS.some(k => t.indexOf(k) !== -1);
}

function ageLabel(ex) {
  if (ex.age_uncertain || !ex.age_track) return '⚠️ לא ודאי';
  return ex.age_track === '1418' ? 'נוער 14-18' : 'בוגרים 18-26';
}
function matchLabel(ex) {
  const c = ex.confidence || 0;
  return c >= 0.8 ? 'גבוהה' : c >= 0.6 ? 'בינונית' : 'נמוכה';
}
function norm(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, ' ').replace(/[״"'.,]/g, '').trim();
}

// ============================================================
// Web App — שליחת הודעות לקבוצות ניהול מדף-ניהול-הופה
// פריסה: Deploy → New deployment → Web app →
//        Execute as: Me · Who has access: Anyone → Deploy → להעתיק את כתובת /exec
// לפני פריסה: להוסיף ב-Script Properties את SEND_SECRET (סיסמה כלשהי שתמציאי),
//             ולהדביק אותה גם בדף הניהול.
// ============================================================
function doGet(e) {
  const p = (e && e.parameter) || {};
  const cb = p.callback;
  let out;
  try {
    if (p.secret !== prop('SEND_SECRET')) {
      out = { ok: false, error: 'unauthorized' };
    } else if (p.action === 'groups') {
      out = { ok: true, groups: readMgmtGroups() };
    } else if (p.action === 'allgroups') {
      // כל קבוצות הוואטסאפ בחשבון — לצורך התאמת "צוות הופה + בית ספר" בדף הקישורים
      const contacts = greenGet('getContacts') || [];
      out = {
        ok: true,
        groups: contacts
          .filter(c => String(c.id || '').endsWith('@g.us'))
          .map(c => ({ id: c.id, name: c.name || '' }))
      };
    } else if (p.action === 'contacts') {
      // אנשי קשר פרטיים (לא קבוצות) ששמם מכיל מילת חיפוש — למשל "בוגרים" — לדף התזכורת לרכזים
      const q = String(p.q || 'בוגרים');
      const contacts = greenGet('getContacts') || [];
      out = {
        ok: true,
        contacts: contacts
          .filter(c => String(c.id || '').endsWith('@c.us') && String(c.name || '').indexOf(q) !== -1)
          .map(c => ({ id: c.id, name: c.name || '' }))
      };
    } else if (p.action === 'send') {
      out = sendManyGroups(p.chatIds || '', p.message || '');
    } else {
      out = { ok: false, error: 'unknown action' };
    }
  } catch (err) {
    out = { ok: false, error: String(err) };
  }
  const json = JSON.stringify(out);
  return ContentService
    .createTextOutput(cb ? `${cb}(${json})` : json)
    .setMimeType(cb ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}

function readMgmtGroups() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ניהול');
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues()
    .filter(r => r[3])
    .map(r => ({ label: r[0], type: r[1], school: r[2], chatId: r[3] }));
}

function sendManyGroups(chatIdsCsv, message) {
  if (!String(message).trim()) return { ok: false, error: 'empty message' };
  const ids = String(chatIdsCsv).split(',').map(s => s.trim()).filter(Boolean);
  if (!ids.length) return { ok: false, error: 'no groups' };
  const results = [];
  ids.forEach((chatId, i) => {
    if (i > 0) Utilities.sleep(1200);
    try { greenSend(chatId, message); results.push({ chatId, ok: true }); }
    catch (err) { results.push({ chatId, ok: false }); }
  });
  return { ok: true, sent: results.filter(r => r.ok).length, total: ids.length };
}

// ============================================================
// בדיקות עזר (אפשר להריץ ידנית)
// ============================================================
function diag() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const groupRows = ss.getSheetByName(TAB_GROUPS).getRange('A2:C').getValues();
  const checked = groupRows.filter(r => r[0] === true && r[2]);
  const msgs = greenGet('lastIncomingMessages', { minutes: 1440 }) || [];
  const inGroups = msgs.filter(m => String(m.chatId || '').endsWith('@g.us'));
  let sample = '';
  if (inGroups[0]) sample = `\nדוגמה: ${inGroups[0].chatName || inGroups[0].chatId}`;
  SpreadsheetApp.getUi().alert(
    `קבוצות מסומנות ✓: ${checked.length}\n` +
    `הודעות שחזרו מ-Green (סה"כ): ${msgs.length}\n` +
    `מתוכן מקבוצות: ${inGroups.length}` + sample
  );
}

function enableIncoming() {
  const inst = prop('GREENAPI_INSTANCE'), token = prop('GREENAPI_TOKEN');
  const url = `https://api.green-api.com/waInstance${inst}/setSettings/${token}`;
  const res = UrlFetchApp.fetch(url, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({ incomingWebhook: 'yes' })
  });
  SpreadsheetApp.getUi().alert('תשובה: ' + res.getResponseCode() + '\n' + res.getContentText());
}

// ============================================================
// תפריט נוח בשיט
// ============================================================
function onOpen() {
  SpreadsheetApp.getUi().createMenu('מענים הופה')
    .addItem('סריקה עכשיו', 'scanNow')
    .addItem('רענון רשימת קבוצות', 'listGroups')
    .addItem('רענון קבוצות ניהול', 'listManagementGroups')
    .addSeparator()
    .addItem('הקמה ראשונית', 'setup')
    .addItem('קביעת סריקה יומית', 'createDailyTrigger')
    .addToUi();
}
