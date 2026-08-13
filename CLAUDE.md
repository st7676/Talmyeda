# CLAUDE.md — Talmyeda Backend

## ⚠️ קרא זאת ראשון / Read this first

לפני כל עבודה על הריפו הזה, **חובה** להפעיל ולפעול לפי הסקיל:
`.claude/skills/talmyeda-workflow/SKILL.md` (קראו אותו דרך כלי ה-Skill או ישירות).

בקצרה: קראו את [`PROGRESS.md`](PROGRESS.md) → בחרו משימה → סמנו `🔧 בעבודה` → בנו →
`npm run build && npm run lint && npm test` → עדכנו ל-`✅` → commit + push.
בהגעה ל-90% טוקנים: עצרו, תעדו `⏸️ חלקי` ב-PROGRESS.md, ודחפו עם `[WIP - 90% token stop]`.

## מה המערכת

Talmyeda — פלטפורמת SaaS גנרית, רב-דיירותית (multi-tenant), לניהול מוסדות חינוך.
אפיון מלא: [`SPEC.md.DOC`](SPEC.md.DOC) (מסמך Word). מצב התקדמות: [`PROGRESS.md`](PROGRESS.md).
תיעוד מורחב (איך המערכת עובדת, הסבר על כל מודול, מילון מונחים): [`docs/README.md`](docs/README.md).

## עקרונות שאסור להפר

- **Multi-tenant:** כל שאילתה עסקית מסוננת ב-`institutionId`. אין `find({})` על דאטה עסקית. (אפיון 44, 92)
- **`institutionId` מגיע מה-JWT/המשתמש המאומת בלבד**, לעולם לא מגוף הבקשה. (אפיון 91)
- **הפרדה User↔business:** `User` = אימות בלבד; `Participant`/`Staff` = דאטה עסקית. (אפיון 7)
- **סכימה דינמית:** `customFields` תמיד `[{ k, v }]` (Attribute Pattern), לעולם לא אובייקט מקונן. (אפיון 35)
- **אל תשברו קיים / הימנעו ממיגרציות הרסניות.** (אפיון 2.2, 62, 104)
- **סודות במשתני סביבה בלבד**, לא בקוד/גיט.
- **שדות ObjectId ב-Mongoose:** תמיד `@Prop({ type: SchemaTypes.ObjectId, ... })`
  (מ-`import { SchemaTypes } from 'mongoose'`), **לעולם לא** `type: Types.ObjectId`
  — זו מחלקת ה-BSON עצמה, לא ה-SchemaType, וגורמת ל-Mongoose להגדיר את השדה
  כ-`Mixed` ולאבד cast אוטומטי string↔ObjectId (באג קריטי שנתפס ותוקן ב-2026-08-10,
  ראו PROGRESS.md). `Types.ObjectId` עדיין תקין כטיפוס TypeScript (`institutionId: Types.ObjectId | null`).
- **`.aggregate()` לא עובר cast אוטומטי כמו `.find()`:** כל ObjectId (כולל `institutionId`)
  שנכנס ל-`$match`/שלב אחר בתוך pipeline חייב המרה ידנית ל-`new Types.ObjectId(...)` מראש —
  אחרת string לא יתאים ל-ObjectId מאוחסן ותקבלו 0 תוצאות בשקט (באג נתפס ותוקן ב-2026-08-13,
  ראו PROGRESS.md, `ParticipantsService.findSortedByDynamicField`).

## מבנה ופקודות

- מבנה מודול: `Controller · Service · DTO · Schema · Guards · Validators`. לוגיקה עסקית ב-Service, לא ב-Controller. (אפיון 87)
- `npm run start:dev` · `npm run build` · `npm run lint` · `npm test`
- `npm run test:e2e` — בדיקת "עולה בלי לקרוס" (בלי DB אמיתי)
- `npm run test:integration` — טסטים אמיתיים מול MongoDB (`mongodb-memory-server`, לא Docker) — **חובה** להריץ לפני push של שינויים בסכימות/שאילתות
- `docker compose up` — מריץ שרת+Mongo אמיתיים לבדיקה ידנית/manual QA
- דורש `.env` (ראו `.env.example`): `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `NODE_ENV`.
