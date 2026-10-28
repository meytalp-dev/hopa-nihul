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

const GP = 'הצעת GPT (מיטל)';
const DEFAULT = {sections:[
  {id:'s1', title:'קצת עליך', questions:[
    S('באיזה בית ספר את/ה עובד/ת?', SCHOOLS, {type:'select', note:MG+': כדי להשוות בין בתי הספר ולבנות תוכנית מותאמת לכל אחד'}),
    M('מהם התפקידים שלך בבית הספר? (אפשר לסמן כמה)', ['מורה / מחנך/ת','יועץ/ת','רכז/ת בוגרים','רכז/ת שכבה או חברתי/ת','הנהלה','אחר'], 0, {note:GP+': רבים בצוות ממלאים כמה תפקידים'}),
    M('באילו דרכים נחשפת למכינות קדם-צבאיות? (אפשר לסמן כמה)', ['אני בוגר/ת מכינה','בן/בת משפחה או חבר/ה קרוב/ה','תלמידים שלי היו במכינה','מכיר/ה בוגר/ת של בית הספר שיצא/ה למכינה','ביקרתי במכינה','אין לי היכרות אישית'], 0, {excl:['אין לי היכרות אישית'], note:MG+': אוחד כאן "מכיר/ה בוגר/ת". '+GP+': ניסוח השאלה, ו"אין היכרות" לא מסתמן יחד עם היכרות'})
  ]},
  {id:'s3', title:'מה אני חושב/ת', questions:[
    L('לדעתי, השתתפות במכינה יכולה לתרום להתפתחות האישית של בוגרי בית הספר', {dk:true, note:GP+': פחות גורף מ"תורמת לאורך החיים"'}),
    L('לדעתי, מכינות מתאימות בעיקר לתלמידים בעלי הישגים לימודיים גבוהים', {dk:true, note:'שאלה הפוכה: הסכמה גבוהה מעידה על חסם. '+GP+': "הישגים גבוהים" במקום "חזקים"'}),
    L('לדעתי, שנת מכינה עלולה לעכב את הבוגרים בלימודים או בעבודה', {dk:true, note:'שאלה הפוכה: הסכמה גבוהה מעידה על חסם. ההצעה של GPT לשנות את המוקד ל"צורך לעבוד" לא אומצה — זה כבר מופיע בשאלת החסמים של התלמידים'}),
    L('לדעתי, מכינה יכולה להיות אפשרות מתאימה לחלק מתלמידי בית הספר שלנו', {dk:true, note:GP+': לא כל התלמידים, חלק מהם'}),
    L('להערכתי, משפחות התלמידים שלנו יתמכו בבחירה במכינה', {dk:true, note:GP+': מדגיש שזו הערכת הצוות, ונוספה אפשרות "אין לי מספיק מידע"'}),
    L('הייתי ממליץ/ה לתלמידים שמתאימים לכך לשקול ברצינות מכינה', {dk:true, note:MG+': תמיכה של המבוגר עצמו ("ברק בעיניים"). 28.10: נוסח של '+MG+' כדי למדוד את ההתלהבות של המבוגר עצמו'}),
    L('לדעתי, שנת מכינה עוזרת לבוגרים להגיע לשירות משמעותי', {dk:true, note:MG+' (שירות משמעותי). '+GP+': במקום "חשוב לי שיגיעו לשירות משמעותי", שכמעט כולם מסכימים איתו. 28.10: ניסוח של '+MG})
  ]},
  {id:'s2', title:'מה אני יודע/ת', questions:[
    L('אני יודע/ת להסביר לתלמיד/ה מה זו מכינה קדם-צבאית ומה עושים בה'),
    L('אני יודע/ת איך ומתי נרשמים למכינה (לוח זמנים, ימי מיון)'),
    L('אני יודע/ת היכן לברר על עלויות ההשתתפות במכינות ועל אפשרויות לסיוע כלכלי', {note:MG+' (עלות). '+GP+': בודק ידע שימושי, בלי להניח שכל המכינות ללא עלות'})
  ]},
  {id:'s4', title:'מה קורה היום', questions:[
    S('בשנה האחרונה, יצא לך לשוחח עם תלמיד/ה על מכינה?', ['לא','פעם או פעמיים','כמה פעמים','באופן קבוע']),
    S('מי אחראי/ת על נושא המכינות בבית הספר שלך?', ['יועץ/ת','מחנכים','רכז/ת בוגרים','הנהלה','אף אחד באופן מוגדר','לא יודע/ת']),
    M('אילו פעילויות התקיימו בבית הספר בשנה האחרונה להיכרות עם מכינות ולליווי תלמידים שמתעניינים בהן? (אפשר לסמן כמה)', ['שיחות אישיות עם יועץ/ת או מחנך/ת','הרצאה או מפגש עם נציגי מכינות','סיור או יום פתוח במכינה','מפגש עם בוגרים','מידע להורים','שילוב בשעת חינוך או בהכנה לצו','לא התקיימו פעילויות','לא ידוע לי','אחר'], 0, {excl:['לא התקיימו פעילויות','לא ידוע לי'], note:MG+': מחליפה את "מסגרת קבועה שאחרי י\"ב". '+GP+': תקופה ברורה (השנה האחרונה), חשיפה וגם ליווי, ו"לא ידוע לי"'})
  ]},
  {id:'s5', title:'מה מקשה ומה יעזור', questions:[
    M('מה מקשה עליך ועל הצוות לעסוק בנושא המכינות? (עד 3)', ['אין לי מספיק מידע על מכינות','אין זמן במערכת','חסרים לי כלים או חומרים לשיחה עם תלמידים','לא ברור מי אחראי/ת על הנושא בבית הספר','קושי להיערך בזמן לתהליכי ההרשמה והמיון','לא בטוח/ה שזה מתאים לתלמידים שלנו','זה לא באחריותי','לא זיהיתי קושי משמעותי','אחר'], 3, {excl:['לא זיהיתי קושי משמעותי'], note:MG+': "אחר" עם מקום לכתוב. '+GP+': השאלה מתמקדת עכשיו בקשיי הצוות (מידע, זמן, כלים, אחריות). הורים, מרחק ורקע עברו לשאלה הבאה על התלמידים; "מרץ" הוחלף ב"להיערך בזמן"'}),
    M('להערכתך, מהם הקשיים המרכזיים שעלולים למנוע מתלמידים שמעוניינים במכינה להשתלב בה? (עד 2)', ['חוסר מודעות למכינות','הצורך לעבוד ולעזור בפרנסה','עלות, או חשש מעלות','חוסר תמיכה מהבית ומהמשפחה','התרחקות מהבית','חשש מתהליך הקבלה והמיון','חשש שלא יינתן מענה לצורכי התלמידים','התלמידים לא רואים במכינה ערך עבורם','לא ידוע לי','אחר'], 2, {excl:['לא ידוע לי'], note:MG+': לשאול את אותה שאלה גם הורים ותלמידים ולהשוות. '+GP+': "הקשיים המרכזיים" (כי בוחרים 2), והחסמים של התלמידים מרוכזים כאן'}),
    M('מה יעזור לך ללוות תלמידים בבדיקת האפשרות להשתלב במכינה? (עד 3)', ['מפגש עם בוגרי מכינה מבית הספר','סיור במכינה','יום הכשרה לצוות החינוכי במכינה','הרצאה קצרה לצוות','איש/אשת קשר קבוע/ה מהמכינה','חומרים מוכנים לשיחה או לשיעור','שילוב בסדירויות קיימות (שעת חינוך, הכנה לצו)','מפגש להורים','מידע על מלגות וסיוע כלכלי','פעילות של המכינה לתלמידים בבית הספר','אחר'], 3, {note:MG+': נוספו יום הכשרה, סדירויות ומפגש להורים, ו"אחר" עם מקום לכתוב (28.10). '+GP+': ניסוח שמבהיר מה הצוות עושה — מלווה בבדיקה'}),
    L('אשמח להיות שותף/ה לפעילות מכינות בבית הספר שלנו'),
    {id:nid(), type:'text', text:'משהו נוסף שחשוב שנדע?', options:[], required:false, note:''}
  ]}
], general:'', updatedAt:'', updatedBy:''};
// שאלה חדשה שנוספת בעריכה מקבלת מזהה ייחודי
nid = () => 'q' + Date.now().toString(36) + (uid++);

const esc = s => String(s==null?'':s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const isOther = o => /^אחר/.test(String(o||''));
const DK = -1, DK_TEXT = 'אין לי מספיק מידע לגבש עמדה';

// בחירה מרובה: אפשרות "בלעדית" (למשל "אין לי היכרות אישית") מבטלת את השאר, ולהפך.
// מחזיר את הרשימה החדשה, או null אם עברו את המקסימום.
function togglePick(q, cur, i){
  cur = (cur||[]).slice();
  const ex = j => (q.excl||[]).includes(q.options[j]);
  const k = cur.indexOf(i);
  if(k>-1){ cur.splice(k,1); return cur; }
  if(ex(i)) return [i];
  cur = cur.filter(j=>!ex(j));
  if(q.max && cur.length>=q.max) return null;
  cur.push(i); return cur;
}

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
  // "(עד 3)" / "(אפשר לסמן כמה)" בסוף השאלה יורד לשורת הנחיה מתחתיה
  const m = String(q.text).match(/^(.*?)\s*\(([^()]*)\)\s*$/);
  const title = m ? m[1] : q.text;
  const hint = m ? m[2].replace(/^עד (\d+)$/, 'אפשר לבחור עד $1 תשובות')
    : q.type==='multi' ? 'אפשר לבחור יותר מתשובה אחת'
    : q.type==='likert' ? 'עד כמה את/ה מסכים/ה עם המשפט?'
    : q.type==='text' ? 'שאלה פתוחה (לא חובה)' : '';
  let h = `<div class="qcard" id="qc_${q.id}"><div class="qt">${n}. ${esc(title)}${q.required?' <span class="req">*</span>':''}</div>${hint?`<div class="qhint">${esc(hint)}</div>`:''}`;
  const other = ph => `<input type="text" class="field other" placeholder="${ph}" value="${esc(o||'')}" oninput="ANS['${q.id}_o']=this.value;if(window.onAns)onAns()">`;
  if(q.type==='likert'){
    h += `<div class="likert">${q.options.map((op,i)=>`<button type="button" class="${a===i?'on':''}" onclick="pick('${q.id}',${i})"><b>${i+1}</b>${esc(op)}</button>`).join('')}</div>`;
    // "אין לי מספיק מידע" נשמר בנפרד מאמצע הסולם
    if(q.dk) h += `<div class="choices single dk"><button type="button" class="${a===DK?'on':''}" onclick="pick('${q.id}',DK)">${DK_TEXT}</button></div>`;
  }
  else if(q.type==='text') h += `<textarea placeholder="אפשר לדלג" oninput="ANS['${q.id}']=this.value;if(window.onAns)onAns()">${esc(a||'')}</textarea>`;
  else if(q.type==='select'){
    if(a!=null && a!==''){
      h += `<div class="picked"><span>${esc(q.options[a])}</span><button type="button" class="btn" onclick="pick('${q.id}',null)">החלפה</button></div>`;
      if(isOther(q.options[a])) h += other('מה שם בית הספר?');
    } else {
      // הרשימה מוסתרת עד שמקלידים או לוחצים "כל בתי הספר" — כדי שהמסך הראשון לא ייראה ארוך
      h += `<input type="search" class="field" placeholder="הקלידו כמה אותיות מהשם…" oninput="filterSel('${q.id}',this.value)" autocomplete="off">
        <button type="button" class="sel-all" id="sa_${q.id}" onclick="filterSel('${q.id}','',true)">או הצגת כל בתי הספר</button>
        <div class="sel-list" id="sl_${q.id}" style="display:none">${q.options.map((op,i)=>`<button type="button" data-t="${esc(op)}" class="${isOther(op)?'oth':''}" onclick="pick('${q.id}',${i})">${esc(op)}</button>`).join('')}</div>
        <div class="hint sel-none" id="sn_${q.id}" style="display:none">לא מצאתם? בחרו "אחר" וכתבו את השם.</div>`;
    }
  } else {
    const on = i => q.type==='multi' ? (a||[]).includes(i) : a===i;
    h += `<div class="choices ${q.type}">${q.options.map((op,i)=>`<button type="button" class="${on(i)?'on':''}" onclick="pick('${q.id}',${i})">${esc(op)}</button>`).join('')}</div>`;
    if(q.options.some((op,i)=>isOther(op) && on(i))) h += other('מה אחר? אפשר לכתוב כאן');
  }
  return h + '</div>';
}
// סינון רשימת בתי הספר בלי לצייר מחדש (כדי שהמקלדת לא תיסגר בנייד)
function filterSel(qid, v, all){
  const norm = s => String(s).replace(/["'׳״`\-]/g,'').replace(/\s+/g,' ').trim();
  const words = norm(v).split(' ').filter(Boolean);
  const list = document.getElementById('sl_'+qid), sa = document.getElementById('sa_'+qid);
  list.style.display = (words.length || all) ? '' : 'none';
  if(sa) sa.style.display = (words.length || all) ? 'none' : '';
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
.qhint{font-size:13px;color:#6f6c55;margin:-4px 0 10px}
.sel-all{font:inherit;font-size:14px;background:none;border:0;color:#635F2F;text-decoration:underline;cursor:pointer;padding:8px 2px 0}
.choices.dk{margin-top:8px}
.choices.dk button{font-size:13px;border-style:dashed;color:#6f6c55}
.choices.dk button.on{color:#fff;border-style:solid}
.sel-list{margin-top:8px;max-height:260px;overflow-y:auto;border:1px solid #d9d7c6;border-radius:12px;background:#fff}
.sel-list button{display:block;width:100%;text-align:start;font:inherit;font-size:15px;border:0;border-bottom:1px solid #efeee6;background:none;padding:11px 12px;cursor:pointer}
.sel-list button:hover{background:#f4f3ea}
.sel-list button.oth{color:#635F2F;font-weight:500}
.sel-none{margin-top:6px}
.picked{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.picked span{background:#635F2F;color:#fff;border-radius:999px;padding:8px 16px;font-weight:500}
.field.other{margin-top:10px}
</style>`);
