# חיבור הופה ל-Meta — פרסום אוטומטי לפייסבוק ולאינסטגרם

> ⚠️ **הטוקן הקיים (של לרני) לא מכסה את עמוד הופה.** צריך להנפיק טוקן חדש שכולל את
> עמוד הפייסבוק של הופה. זה בדיוק אותו תהליך שעשינו ללרני — 5 דקות.

## מה צריך שיהיה קיים
1. **עמוד פייסבוק** של הופה (עמוד, לא פרופיל) — ואת מנהלת בו
2. **חשבון אינסטגרם עסקי** של הופה, מקושר לעמוד הפייסבוק (כבר קיים — מקושר ב-Business Suite)

## שלב 1 — טוקן עם הרשאות
1. נכנסים ל-**Graph API Explorer**: https://developers.facebook.com/tools/explorer/
2. בוחרים את האפליקציה הקיימת למעלה מימין (זו שהשתמשנו בה ללרני)
3. **Add Permissions** — מוודאים שיש:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `instagram_basic`
   - `instagram_content_publish`
   - `business_management`
4. לוחצים **Generate Access Token** → בחלון של פייסבוק **חשוב: לבחור גם את עמוד הופה
   וגם את חשבון האינסטגרם של הופה** (אפשר לסמן את כל העמודים)

## שלב 2 — הארכת הטוקן
כדי שהטוקן לא יפוג אחרי שעתיים: **Access Token Debugger**
(https://developers.facebook.com/tools/debug/accesstoken/) → מדביקים את הטוקן → **Extend Access Token**.

## שלב 3 — מוסרים לקלוד
מדביקים את הטוקן המוארך בצ'אט עם קלוד. קלוד:
1. ישלוף את מזהה עמוד הופה ואת מזהה האינסטגרם
2. ייצור כאן קובץ `.env` (לא עולה לגיטהאב — מוגן ב-.gitignore)
3. יפעיל את סוכן הענן שמפרסם את התור אוטומטית

## שימוש ידני (אחרי ההקמה)
```
node publish-post.mjs --list                              # התור המלא
node publish-post.mjs --check                             # בדיקת חיבור
node publish-post.mjs --post post10 --to fb,ig            # פרסום עכשיו
node publish-post.mjs --post post10 --to fb --when "2026-08-18T20:00"   # תזמון בפייסבוק
```

## איך המערכת עובדת
- **מקור האמת**: `posts/posts-data.json` — כל פוסט עם טקסט פייסבוק, טקסט אינסטגרם, מדיה, מועד וסטטוס.
- **דף התור**: https://meytalp-dev.github.io/hopa-nihul/posts/ — מציג את התור עם סטטוסים.
- **אישור**: אומרים לקלוד בצ'אט ("מאשרת את 10 ו-11") → קלוד משנה status ל-approved ודוחף.
- **פרסום**: GitHub Action (`.github/workflows/auto-publish.yml`) רץ ב-8:00 וב-20:00 (שעון ישראל)
  ומריץ את `scripts/auto-publish.mjs` — מפרסם רק פוסטים עם status=approved שהגיע מועדם
  (כולל סרטונים: וידאו בפייסבוק, ריל באינסטגרם), מעדכן ל-published ודוחף חזרה —
  הדף תמיד מראה את המצב האמיתי. יש הגנה מכפל פרסום (בדיקת הפיד של העמוד).
- **הטוקן** שמור כ-Secret של הריפו בשם `META_USER_TOKEN` (Settings ← Secrets and variables ← Actions).
  אם הטוקן פג — מנפיקים חדש לפי המדריך למעלה ומעדכנים את הסוד.
