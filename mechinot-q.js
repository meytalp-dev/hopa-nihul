/* שאלון המכינות — הנוסח המשותף לדף העריכה (mechinot-sheelon), לטופס (mechinot-tofes) ולדף המעקב (mechinot-maakav).
   אם השותפים ערכו ושמרו בגיליון (mechinot_sheelon) — הגרסה מהגיליון גוברת על DEFAULT שכאן. */
const EXEC_URL = 'https://script.google.com/macros/s/AKfycby7ilGQKB0eypgYMJ0-F4PDgRUlhs12wB5NQVV3_gsm4U1iWec4aNzmeQ8qi7dFFBUoGw/exec';
const STORE_KEY = 'mechinot_sheelon';
const RESP_PREFIX = 'mechina-';            // תשובות נשמרות כ-intake_mechina-<id> (לא ציבורי)

const LIKERT = ['בכלל לא מסכים/ה','לא מסכים/ה','במידה מסוימת','מסכים/ה','מסכים/ה מאוד'];
const TYPES = {likert:'סולם הסכמה 1–5', single:'בחירה אחת', multi:'בחירה מרובה', select:'רשימה עם חיפוש', text:'תשובה פתוחה'};
const SCHOOLS = ['אורט אדיבי אשקלון','אורט בית הערבה','אורט כרמל חיפה','אורט מרום עכו','אורט צור ברק','אלאמאני סחנין','דרור גליל','דרור נווה מדבר','התיכון החברתי מצפה רמון','התיכון החברתי תל אביב','ח׳טוואת ירכא','טכנולוגי לקייה','יוצר עתיד ג׳וליס','יוצר עתיד פלמחים','מגשימים בית שאן','מנאראת טורעאן','עמל טכנולוגי אשדוד','עמל טכנולוגי רהט','עמל רמת דוד','עתיד אבדאע ביר אלמכסור','עתיד מגשימים כרמיאל','עתיד שמיים מוצקין','תיכון חברתי חיפה','תיכון חושן','תיכון נחלים','תיכון שיח','אחר'];
const MG = 'הצעת מורן וגל';

// מזהים קבועים לשאלות ברירת המחדל (q1, q2…) — כדי שתשובות מכל המכשירים יתאימו לאותה שאלה
let uid = 0; let nid = () => 'q' + (++uid);
const L = (text, extra) => Object.assign({id:nid(), type:'likert', text, options:LIKERT.slice(), required:true, note:''}, extra||{});
const S = (text, options, extra) => Object.assign({id:nid(), type:'single', text, options, required:true, note:''}, extra||{});
const M = (text, options, max, extra) => Object.assign({id:nid(), type:'multi', text, options, max:max||0, required:true, note:''}, extra||{});

const DEFAULT = {sections:[
  {id:'s1', title:'קצת עליך', questions:[
    S('באיזה בית ספר את/ה עובד/ת?', SCHOOLS, {type:'select', note:MG+': כדי להשוות בין בתי הספר ולבנות תוכנית מותאמת לכל אחד'}),
    S('מה התפקיד שלך בבית הספר?', ['מורה / מחנך/ת','יועץ/ת','רכז/ת בוגרים','רכז/ת שכבה או חברתי/ת','הנהלה','אחר']),
    M('מה ההיכרות האישית שלך עם מכינות?', ['אני בוגר/ת מכינה','בן/בת משפחה או חבר/ה קרוב/ה','תלמידים שלי היו במכינה','מכיר/ה בוגר/ת של בית הספר שיצא/ה למכינה','ביקרתי במכינה','אין לי היכרות אישית'], 0, {note:MG+': אוחד כאן "מכיר/ה בוגר/ת של בית הספר"'})
  ]},
  {id:'s3', title:'מה אני חושב/ת', questions:[
    L('מכינה היא שנה משמעותית שתורמת לבוגרים לאורך החיים'),
    L('מכינה מתאימה בעיקר לתלמידים חזקים ומצטיינים', {note:'שאלה הפוכה: הסכמה גבוהה מעידה על חסם'}),
    L('מכינה עלולה לעכב את הבוגרים: שנה שבאה על חשבון לימודים או עבודה', {note:'שאלה הפוכה: הסכמה גבוהה מעידה על חסם'}),
    L('מכינה מתאימה לתלמידים של בית הספר שלנו'),
    L('ההורים של התלמידים שלנו יתמכו בבחירה במכינה'),
    L('הייתי ממליץ/ה לתלמיד/ה שלי לצאת למכינה', {note:MG+': תמיכה של המבוגר עצמו ("ברק בעיניים")'}),
    L('חשוב לי שהתלמידים שלנו יגיעו לשירות משמעותי', {note:MG})
  ]},
  {id:'s2', title:'מה אני יודע/ת', questions:[
    L('אני יודע/ת להסביר לתלמיד/ה מה זו מכינה קדם-צבאית ומה עושים בה'),
    L('אני יודע/ת איך ומתי נרשמים למכינה (לוח זמנים, ימי מיון)'),
    L('אני יודע/ת שיש מכינות ללא עלות למשתתפים', {note:MG})
  ]},
  {id:'s4', title:'מה קורה היום', questions:[
    S('בשנה האחרונה, יצא לך לשוחח עם תלמיד/ה על מכינה?', ['לא','פעם או פעמיים','כמה פעמים','באופן קבוע']),
    S('מי אחראי/ת על נושא המכינות בבית הספר שלך?', ['יועץ/ת','מחנכים','רכז/ת בוגרים','הנהלה','אף אחד באופן מוגדר','לא יודע/ת']),
    M('אילו פעולות מתקיימות היום בבית הספר לעידוד יציאה למכינה? (אפשר לסמן כמה)', ['שיחות אישיות עם יועץ/ת או מחנך/ת','הרצאה או מפגש עם נציגי מכינות','סיור או יום פתוח במכינה','מפגש עם בוגרים','מידע להורים','שילוב בשעת חינוך או בהכנה לצו','אין פעולות קבועות','אחר'], 0, {note:MG+': מחליפה את "מסגרת קבועה שאחרי י\"ב" ומאפשרת להשוות בין בתי הספר'})
  ]},
  {id:'s5', title:'מה מקשה ומה יעזור', questions:[
    M('מה הכי מקשה לקדם מכינות בבית הספר? (עד 3)', ['אין לי מספיק מידע','אין זמן במערכת','לא בטוח/ה שזה מתאים לתלמידים שלנו','התנגדות או חוסר תמיכה של הורים','מרחק וחשש מהתרחקות מהבית','מועדי הרשמה מוקדמים (מרץ)','רקע מורכב וחשש מדחייה','זה לא באחריותי','אחר'], 3, {note:MG+': קוצר ל-8 אפשרויות + "אחר" עם מקום לכתוב'}),
    M('לדעתך, מה החסם העיקרי של תלמידי בית הספר להגיע למכינה? (עד 2)', ['חוסר מודעות','חסם כלכלי (הצורך לעבוד ולעזור בפרנסה)','חוסר תמיכה מהבית ומהמשפחה','התלמידים לא רואים במכינה ערך עבורם','אחר'], 2, {note:MG+': "אחר" עם מקום לכתוב. לשאול את אותה שאלה גם הורים ותלמידים, ולהשוות בין המעגלים'}),
    M('מה היה עוזר לך לקדם את הנושא? (עד 3)', ['מפגש עם בוגרי מכינה מבית הספר','סיור במכינה','יום הכשרה לצוות החינוכי במכינה','הרצאה קצרה לצוות','איש/אשת קשר קבוע/ה מהמכינה','חומרים מוכנים לשיחה או לשיעור','שילוב בסדירויות קיימות (שעת חינוך, הכנה לצו)','מפגש להורים','מידע על מלגות וסיוע כלכלי','פעילות של המכינה לתלמידים בבית הספר'], 3, {note:MG+': נוספו יום הכשרה, סדירויות קיימות ומפגש להורים'}),
    L('אשמח להיות שותף/ה לפעילות מכינות בבית הספר שלנו'),
    {id:nid(), type:'text', text:'משהו נוסף שחשוב שנדע?', options:[], required:false, note:''}
  ]}
], general:'', updatedAt:'', updatedBy:''};
// שאלה חדשה שנוספת בעריכה מקבלת מזהה ייחודי
nid = () => 'q' + Date.now().toString(36) + (uid++);

const esc = s => String(s==null?'':s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const isOther = o => /^אחר/.test(String(o||''));

/* ---------- גיליון ---------- */
function jsonpOnce(params, tmo){
  return new Promise((res,rej)=>{
    const cb='cb'+Math.random().toString(36).slice(2);
    const s=document.createElement('script');
    const timer=setTimeout(()=>{ window[cb]=()=>{}; s.remove(); rej(new Error('timeout')); }, tmo);
    window[cb]=d=>{clearTimeout(timer); delete window[cb]; s.remove(); res(d);};
    s.src=EXEC_URL+'?'+new URLSearchParams(Object.assign({callback:cb},params)).toString();
    s.onerror=()=>{clearTimeout(timer); delete window[cb]; s.remove(); rej(new Error('network'));};
    document.head.appendChild(s);
  });
}
async function fetchOnce(params, tmo){
  const ctl = new AbortController(); const timer = setTimeout(()=>ctl.abort(), tmo);
  try{
    const r = await fetch(EXEC_URL+'?'+new URLSearchParams(params).toString(), {credentials:'omit', cache:'no-store', redirect:'follow', signal:ctl.signal});
    const txt = await r.text();
    try{ return JSON.parse(txt); }catch(e){ throw new Error('bad response '+r.status); }
  } finally { clearTimeout(timer); }
}
async function jsonp(params, onRetry){
  let err;
  for (let i=1;i<=4;i++){
    try{ return await fetchOnce(params, 25000); } catch(e){ err=e; }
    try{ return await jsonpOnce(params, 25000); } catch(e){ err=e; if(onRetry) onRetry(i+1); }
  }
  throw err;
}
// הנוסח העדכני: מהגיליון אם נשמר, אחרת ברירת המחדל
async function loadQuestions(){
  const r = await jsonp({action:'storeAll'});
  const st = r && r.ok ? (r.store||{})[STORE_KEY] : null;
  return (st && Array.isArray(st.sections)) ? st : JSON.parse(JSON.stringify(DEFAULT));
}

/* ---------- שאלה בטופס (משותף לתצוגת הטופס ולטופס עצמו) ----------
   הדף שמשתמש בזה מגדיר: ANS (תשובות) ו-pick(qid,i). */
function qHTML(q, n){
  const a = ANS[q.id], o = ANS[q.id+'_o'];
  let h = `<div class="qcard" id="qc_${q.id}"><div class="qt">${n}. ${esc(q.text)}${q.required?' <span class="req">*</span>':''}</div>`;
  const other = ph => `<input type="text" class="field other" placeholder="${ph}" value="${esc(o||'')}" oninput="ANS['${q.id}_o']=this.value;if(window.onAns)onAns()">`;
  if(q.type==='likert') h += `<div class="likert">${q.options.map((op,i)=>`<button type="button" class="${a===i?'on':''}" onclick="pick('${q.id}',${i})"><b>${i+1}</b>${esc(op)}</button>`).join('')}</div>`;
  else if(q.type==='text') h += `<textarea placeholder="אפשר לדלג" oninput="ANS['${q.id}']=this.value;if(window.onAns)onAns()">${esc(a||'')}</textarea>`;
  else if(q.type==='select'){
    if(a!=null && a!==''){
      h += `<div class="picked"><span>${esc(q.options[a])}</span><button type="button" class="btn" onclick="pick('${q.id}',null)">החלפה</button></div>`;
      if(isOther(q.options[a])) h += other('מה שם בית הספר?');
    } else {
      h += `<input type="search" class="field" placeholder="הקלידו כמה אותיות מהשם…" oninput="filterSel('${q.id}',this.value)" autocomplete="off">
        <div class="sel-list" id="sl_${q.id}">${q.options.map((op,i)=>`<button type="button" data-t="${esc(op)}" class="${isOther(op)?'oth':''}" onclick="pick('${q.id}',${i})">${esc(op)}</button>`).join('')}</div>
        <div class="hint sel-none" id="sn_${q.id}" style="display:none">לא מצאתם? בחרו "אחר" וכתבו את השם.</div>`;
    }
  } else {
    const on = i => q.type==='multi' ? (a||[]).includes(i) : a===i;
    h += `<div class="choices">${q.options.map((op,i)=>`<button type="button" class="${on(i)?'on':''}" onclick="pick('${q.id}',${i})">${esc(op)}</button>`).join('')}</div>`;
    if(q.options.some((op,i)=>isOther(op) && on(i))) h += other('מה אחר? אפשר לכתוב כאן');
  }
  return h + '</div>';
}
// סינון רשימת בתי הספר בלי לצייר מחדש (כדי שהמקלדת לא תיסגר בנייד)
function filterSel(qid, v){
  const norm = s => String(s).replace(/["'׳״`\-]/g,'').replace(/\s+/g,' ').trim();
  const words = norm(v).split(' ').filter(Boolean);
  let shown = 0;
  document.querySelectorAll('#sl_'+qid+' button').forEach(b=>{
    const t = norm(b.dataset.t);
    const ok = isOther(b.dataset.t) || words.every(w=>t.includes(w));
    b.style.display = ok ? '' : 'none';
    if(ok && !isOther(b.dataset.t)) shown++;
  });
  const n = document.getElementById('sn_'+qid); if(n) n.style.display = (words.length && !shown) ? '' : 'none';
}

document.head.insertAdjacentHTML('beforeend', `<style>
.sel-list{margin-top:8px;max-height:260px;overflow-y:auto;border:1px solid #d9d7c6;border-radius:12px;background:#fff}
.sel-list button{display:block;width:100%;text-align:start;font:inherit;font-size:15px;border:0;border-bottom:1px solid #efeee6;background:none;padding:11px 12px;cursor:pointer}
.sel-list button:hover{background:#f4f3ea}
.sel-list button.oth{color:#635F2F;font-weight:500}
.sel-none{margin-top:6px}
.picked{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.picked span{background:#635F2F;color:#fff;border-radius:999px;padding:8px 16px;font-weight:500}
.field.other{margin-top:10px}
</style>`);
