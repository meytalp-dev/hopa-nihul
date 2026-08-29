#!/usr/bin/env node
/**
 * הסוכן האוטומטי של הופה — רץ ב-GitHub Actions ב-8:00 וב-20:00 (שעון ישראל).
 * מפרסם לפייסבוק ולאינסטגרם את הפוסטים שאושרו והגיע זמנם — ורק אותם.
 *
 * קלט (משתני סביבה): META_USER_TOKEN (סוד), META_PAGE_ID, META_IG_USER_ID.
 * מקור האמת: posts/posts-data.json. פוסט מתפרסם רק אם status="approved"
 * וגם when <= השעה הנוכחית בישראל. אחרי פרסום: status="published" + מזהים.
 * הקומיט והדחיפה נעשים ב-workflow, לא כאן.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const GRAPH = 'https://graph.facebook.com/v21.0';
const dataPath = join(here, '..', 'posts', 'posts-data.json');

const { META_USER_TOKEN, META_PAGE_ID, META_IG_USER_ID } = process.env;
if (!META_USER_TOKEN || !META_PAGE_ID || !META_IG_USER_ID) {
  console.error('חסרים משתני סביבה: META_USER_TOKEN / META_PAGE_ID / META_IG_USER_ID');
  process.exit(1);
}

// השעה הנוכחית בשעון ישראל, בפורמט של שדה when: "YYYY-MM-DD HH:MM"
const nowIL = () => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date()).map(x => [x.type, x.value])
  );
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
};

async function graphGet(path, params) {
  const qs = new URLSearchParams(params);
  const res = await fetch(`${GRAPH}/${path}?${qs}`);
  const json = await res.json();
  if (json.error) throw new Error(`${path}: ${json.error.message} (code ${json.error.code})`);
  return json;
}

async function graphPost(path, params, token) {
  const body = new URLSearchParams({ ...params, access_token: token });
  const res = await fetch(`${GRAPH}/${path}`, { method: 'POST', body });
  const json = await res.json();
  if (json.error) throw new Error(`${path}: ${json.error.message} (code ${json.error.code})`);
  return json;
}

const data = JSON.parse(readFileSync(dataPath, 'utf8'));
const now = nowIL();
const due = data.posts.filter(p => p.status === 'approved' && p.when && p.when <= now);

console.log(`השעה בישראל: ${now} | פוסטים שהגיע זמנם: ${due.length}`);
if (!due.length) {
  console.log('אין פוסטים לפרסום.');
  process.exit(0);
}

const pageTokenRes = await graphGet(META_PAGE_ID, { fields: 'access_token', access_token: META_USER_TOKEN });
const PAGE_TOKEN = pageTokenRes.access_token;

// הגנה מכפל פרסום: כל מה שכבר באוויר בעמוד — פייסבוק ואינסטגרם, עד 200 פוסטים בכל פלטפורמה.
// הערה: /feed מחזיר שגיאת הרשאה עם טוקן העמוד, /published_posts עובד. זו הסיבה שההגנה
// הקודמת לא עבדה בפועל ופוסטים יצאו פעמיים בהפרש של ימים.
const norm = (s) => (s || '').replace(/[‎‏ ]/g, '').replace(/\s+/g, ' ').trim();

async function pullAll(path, fields) {
  let page = await graphGet(path, { fields, limit: '100', access_token: PAGE_TOKEN });
  const all = [...(page.data || [])];
  while (page.paging?.next && all.length < 200) {
    const res = await fetch(page.paging.next);
    page = await res.json();
    if (page.error) break;
    all.push(...(page.data || []));
  }
  return all;
}

// אם אי אפשר לוודא — לא מפרסמים. הפוסט נשאר approved ויֵצא בהרצה הבאה.
const livePosts = new Set();
try {
  for (const f of await pullAll(`${META_PAGE_ID}/published_posts`, 'message')) livePosts.add(norm(f.message));
  for (const m of await pullAll(`${META_IG_USER_ID}/media`, 'caption')) livePosts.add(norm(m.caption));
  livePosts.delete('');
  console.log(`הגנה מכפילויות: נטענו ${livePosts.size} פוסטים שכבר באוויר.`);
} catch (e) {
  console.error('✗ לא הצלחתי לשלוף את הפוסטים הקיימים לבדיקת כפילויות:', e.message);
  console.error('  לא מפרסם כלום כדי לא לסכן פרסום כפול. התור יישאר כמו שהוא וינסה שוב בהרצה הבאה.');
  process.exit(1);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let published = 0, failed = 0;

for (const post of due) {
  const mediaUrl = data.mediaBase + post.file;
  const igMediaUrl = data.mediaBase + (post.igFile || post.file);
  const isVideo = post.type === 'video';
  console.log(`\n▶ ${post.id} — ${post.title}`);

  if (livePosts.has(norm(post.fb)) || livePosts.has(norm(post.ig))) {
    console.log('  ⏭ הטקסט הזה כבר פורסם בעמוד — מסומן published בלי לפרסם שוב.');
    post.status = 'published';
    post.publishedAt = now;
    post.note = 'זוהה כפרסום כפול — סומן published בלי פרסום חוזר';
    published++;
    continue;
  }

  const notes = [];

  try {
    if (isVideo) {
      const r = await graphPost(`${META_PAGE_ID}/videos`, { file_url: mediaUrl, description: post.fb }, PAGE_TOKEN);
      post.fbPostId = r.id;
      console.log(`  ✓ פייסבוק (וידאו): ${r.id}`);
    } else {
      const r = await graphPost(`${META_PAGE_ID}/photos`, { url: mediaUrl, message: post.fb }, PAGE_TOKEN);
      post.fbPostId = r.post_id || r.id;
      console.log(`  ✓ פייסבוק: ${post.fbPostId}`);
    }
  } catch (e) {
    notes.push('פייסבוק נכשל: ' + e.message);
    console.error('  ✗ פייסבוק:', e.message);
  }

  try {
    const containerParams = isVideo
      ? { media_type: 'REELS', video_url: igMediaUrl, caption: post.ig }
      : { image_url: igMediaUrl, caption: post.ig };
    const container = await graphPost(`${META_IG_USER_ID}/media`, containerParams, PAGE_TOKEN);
    if (isVideo) {
      for (let i = 0; i < 30; i++) {
        const st = await graphGet(container.id, { fields: 'status_code', access_token: PAGE_TOKEN });
        if (st.status_code === 'FINISHED') break;
        if (st.status_code === 'ERROR') throw new Error('עיבוד הווידאו באינסטגרם נכשל');
        await sleep(5000);
      }
    }
    const r = await graphPost(`${META_IG_USER_ID}/media_publish`, { creation_id: container.id }, PAGE_TOKEN);
    post.igMediaId = r.id;
    console.log(`  ✓ אינסטגרם: ${r.id}`);
  } catch (e) {
    notes.push('אינסטגרם נכשל: ' + e.message);
    console.error('  ✗ אינסטגרם:', e.message);
  }

  if (post.fbPostId || post.igMediaId) {
    post.status = 'published';
    post.publishedAt = now;
    if (notes.length) post.note = notes.join(' | ');
    published++;
  } else {
    post.note = notes.join(' | ');
    failed++;
  }
}

writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(`\nסיכום: פורסמו ${published}, נכשלו ${failed}.`);
if (failed) process.exit(1);
