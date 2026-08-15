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

// הגנה מכפל פרסום: הפוסטים האחרונים בעמוד ב-24 השעות האחרונות
let recentFirstLines = [];
try {
  const feed = await graphGet(`${META_PAGE_ID}/feed`, { fields: 'message,created_time', limit: '10', access_token: PAGE_TOKEN });
  const dayAgo = Date.now() - 24 * 3600 * 1000;
  recentFirstLines = (feed.data || [])
    .filter(f => f.message && new Date(f.created_time).getTime() > dayAgo)
    .map(f => f.message.split('\n')[0].trim());
} catch (e) {
  console.warn('⚠ לא הצלחתי לשלוף את הפיד לבדיקת כפילויות:', e.message);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let published = 0, failed = 0;

for (const post of due) {
  const mediaUrl = data.mediaBase + post.file;
  const isVideo = post.type === 'video';
  console.log(`\n▶ ${post.id} — ${post.title}`);

  if (recentFirstLines.includes(post.fb.split('\n')[0].trim())) {
    console.log('  ⏭ כבר קיים פוסט זהה בעמוד מה-24 שעות האחרונות — מסומן published בלי לפרסם שוב.');
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
      ? { media_type: 'REELS', video_url: mediaUrl, caption: post.ig }
      : { image_url: mediaUrl, caption: post.ig };
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
