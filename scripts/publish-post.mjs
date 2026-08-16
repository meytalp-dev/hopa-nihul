#!/usr/bin/env node
/**
 * פרסום פוסט של הופה לפייסבוק ולאינסטגרם דרך Meta Graph API.
 *
 * שימוש:
 *   node publish-post.mjs --list                          רשימת הפוסטים בתור
 *   node publish-post.mjs --check                         בדיקת חיבור
 *   node publish-post.mjs --post post10 --to fb,ig        פרסום מיידי
 *   node publish-post.mjs --post post10 --to fb --when "2026-08-18T20:00"   תזמון (פייסבוק בלבד)
 *
 * דורש קובץ .env בתיקייה הזו (ראו META-SETUP-הופה.md):
 *   META_PAGE_ID=...        עמוד הפייסבוק של הופה
 *   META_PAGE_TOKEN=...     (או META_USER_TOKEN — יומר אוטומטית)
 *   META_IG_USER_ID=...     (אופציונלי — יישלף אוטומטית מהעמוד)
 *
 * הערות:
 * - תזמון עתידי דרך ה-API נתמך רק בפייסבוק ורק לתמונות. באינסטגרם הפרסום מיידי.
 * - פוסטי וידאו (type=video) מתפרסמים מיידית בשתי הפלטפורמות.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const GRAPH = 'https://graph.facebook.com/v21.0';

const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : null;
};

const data = JSON.parse(readFileSync(join(here, '..', 'posts', 'posts-data.json'), 'utf8'));

if (args.includes('--list')) {
  for (const p of data.posts) console.log(`${p.id}  [${p.status}]  ${p.when || 'לא משובץ'}  ${p.title}`);
  process.exit(0);
}

const env = {};
const envPath = join(here, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+)\s*$/);
    if (m) env[m[1]] = m[2];
  }
}
let { META_PAGE_ID, META_IG_USER_ID, META_PAGE_TOKEN, META_USER_TOKEN } = env;
if (!META_PAGE_TOKEN && !META_USER_TOKEN) {
  console.error('לא נמצאו הרשאות Meta ב-.env — ראו META-SETUP-הופה.md.');
  process.exit(1);
}

async function graphGet(path, params) {
  const qs = new URLSearchParams(params);
  const res = await fetch(`${GRAPH}/${path}?${qs}`);
  const json = await res.json();
  if (json.error) throw new Error(`${path}: ${json.error.message} (code ${json.error.code})`);
  return json;
}

async function graph(path, params) {
  const body = new URLSearchParams({ ...params, access_token: META_PAGE_TOKEN });
  const res = await fetch(`${GRAPH}/${path}`, { method: 'POST', body });
  const json = await res.json();
  if (json.error) throw new Error(`${path}: ${json.error.message} (code ${json.error.code})`);
  return json;
}

async function resolveCredentials() {
  if (!META_PAGE_TOKEN && META_USER_TOKEN) {
    const pg = await graphGet(META_PAGE_ID, { fields: 'access_token', access_token: META_USER_TOKEN });
    META_PAGE_TOKEN = pg.access_token;
  }
  if (!META_IG_USER_ID) {
    const pg = await graphGet(META_PAGE_ID, { fields: 'instagram_business_account', access_token: META_PAGE_TOKEN });
    META_IG_USER_ID = pg.instagram_business_account?.id;
  }
}

if (args.includes('--check')) {
  try {
    await resolveCredentials();
    const pg = await graphGet(META_PAGE_ID, { fields: 'name', access_token: META_PAGE_TOKEN });
    console.log(`✓ מחובר לעמוד: ${pg.name} | אינסטגרם: ${META_IG_USER_ID || 'לא מקושר'}`);
  } catch (e) {
    console.error('✗', e.message);
    process.exit(1);
  }
  process.exit(0);
}

const postId = getArg('post');
const to = (getArg('to') || 'fb,ig').split(',').map(s => s.trim());
const when = getArg('when');

const post = data.posts.find(p => p.id === postId);
if (!post) {
  console.error(`פוסט "${postId}" לא נמצא. אפשרויות: ${data.posts.map(p => p.id).join(', ')}`);
  process.exit(1);
}
const mediaUrl = data.mediaBase + post.file;
const igMediaUrl = data.mediaBase + (post.igFile || post.file);
const isVideo = post.type === 'video';

async function publishFacebook() {
  if (!META_PAGE_ID) throw new Error('חסר META_PAGE_ID ב-.env');
  if (isVideo) {
    const r = await graph(`${META_PAGE_ID}/videos`, { file_url: mediaUrl, description: post.fb });
    console.log(`✓ פייסבוק: הסרטון הועלה (video id: ${r.id})`);
    return;
  }
  const params = { url: mediaUrl, message: post.fb };
  if (when) {
    const ts = Math.floor(new Date(when).getTime() / 1000);
    if (Number.isNaN(ts)) throw new Error(`תאריך לא תקין: ${when}`);
    params.published = 'false';
    params.scheduled_publish_time = String(ts);
  }
  const r = await graph(`${META_PAGE_ID}/photos`, params);
  console.log(when
    ? `✓ פייסבוק: תוזמן ל-${when} (post id: ${r.id || r.post_id})`
    : `✓ פייסבוק: פורסם (post id: ${r.post_id || r.id})`);
}

async function publishInstagram() {
  if (!META_IG_USER_ID) throw new Error('אין חשבון אינסטגרם עסקי מקושר לעמוד');
  if (when) console.warn('⚠ אינסטגרם: ה-API לא תומך בתזמון — מפרסם עכשיו.');
  const containerParams = isVideo
    ? { media_type: 'REELS', video_url: igMediaUrl, caption: post.ig }
    : { image_url: igMediaUrl, caption: post.ig };
  const container = await graph(`${META_IG_USER_ID}/media`, containerParams);
  if (isVideo) {
    // וידאו מעובד אסינכרונית — ממתינים שהקונטיינר יהיה מוכן
    for (let i = 0; i < 30; i++) {
      const st = await graphGet(container.id, { fields: 'status_code', access_token: META_PAGE_TOKEN });
      if (st.status_code === 'FINISHED') break;
      if (st.status_code === 'ERROR') throw new Error('עיבוד הווידאו באינסטגרם נכשל');
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  const r = await graph(`${META_IG_USER_ID}/media_publish`, { creation_id: container.id });
  console.log(`✓ אינסטגרם: פורסם (media id: ${r.id})`);
}

console.log(`פוסט: ${post.title}`);
console.log(`מדיה: ${mediaUrl}`);
try {
  await resolveCredentials();
  if (to.includes('fb')) await publishFacebook();
  if (to.includes('ig')) await publishInstagram();
} catch (e) {
  console.error('✗ שגיאה:', e.message);
  process.exit(1);
}
