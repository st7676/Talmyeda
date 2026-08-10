# Talmyeda Backend — מצב התקדמות (Progress Tracker)

> מקור האמת למה נבנה, מה בעבודה, ומה הבא בתור.
> **לפני כל עבודה** קראו את הסקיל [`.claude/skills/talmyeda-workflow/SKILL.md`](.claude/skills/talmyeda-workflow/SKILL.md).
> אפיון מלא: [`SPEC.md.DOC`](SPEC.md.DOC).

מקרא סטטוסים: `✅ הושלם` · `🔧 בעבודה` · `⏸️ חלקי` · `⬜ טרם התחיל`

---

## תשתית (Foundation)

| רכיב | סעיף אפיון | סטטוס | הערות |
|------|-----------|-------|-------|
| Scaffold NestJS + Mongoose + Config + Validation | 4, 100 | ✅ הושלם | קיים מה-commit הראשוני |
| מבנה תגובה אחיד (success/data, error) | 65 | ✅ הושלם | `ResponseInterceptor` + `AllExceptionsFilter` + `AppError` |
| טיפוסים משותפים / enums (Role, Status, FieldType...) | 8, 28 | ✅ הושלם | `src/common/**` |
| חיבור MongoDB | 43 | ✅ הושלם | `DatabaseModule` |

## אימות והרשאות (Auth & Security)

| רכיב | סעיף אפיון | סטטוס | הערות |
|------|-----------|-------|-------|
| User schema (auth בלבד, נפרד מ-business) | 48, 7 | ✅ הושלם | `src/modules/users` |
| Login + JWT + bcrypt | 66-68, 90 | ✅ הושלם | `src/modules/auth` |
| JwtAuthGuard | 93 | ✅ הושלם | + `@Public()` decorator |
| Tenant scoping (institutionId מה-JWT) | 44, 92, 93 | ✅ הושלם | `@CurrentUser()` + guard מזריק scope |
| CASL Ability Factory + Guard (ABAC) | 20-21, 93 | ✅ הושלם | entity-level (`CaslAbilityGuard`+`@CheckAbility`) + context-aware group scoping ב-`ParticipantsService` |
| mustChangePassword flow | 70.1 | ✅ הושלם | `MustChangePasswordGuard` גלובלי — חוסם כל route (חוץ מ-`@Public`/`@SkipMustChangePasswordCheck`) עד שינוי סיסמה |
| Rate limiting (login, registration) | 90.1 | ✅ הושלם | `@nestjs/throttler`: ברירת מחדל 100/דקה גלובלי, login 10/דקה + נעילת חשבון per-username, registration-requests 5/דקה |

## ישויות ליבה (Core Entities & CRUD)

| מודול | סעיף אפיון | סטטוס | הערות |
|-------|-----------|-------|-------|
| Institution + InstitutionSettings + register | 46-47, 69 | ✅ הושלם | register יוצר Institution+Admin User+Settings |
| Platform (SUPER_ADMIN) approve/suspend/reactivate/reject | 69.1 | ✅ הושלם | `platform.controller.ts`, `@Roles(SuperAdmin)` |
| Users API (CRUD, soft delete, change-password) | 70, 70.1 | ✅ הושלם | controller מלא + temp password + mustChangePassword |
| Participants API (CRUD, pagination, search) | 71-75, 49 | ✅ הושלם | + group-scoping ל-STAFF, self-scoping ל-PARTICIPANT |
| Staff API | 76, 50 | ✅ הושלם | Admin-only CRUD + soft delete |
| Groups API | 77, 51 | ✅ הושלם | CRUD + soft delete |
| ParticipantGroup (+ היסטוריה) | 78, 52, 18 | ✅ הושלם | assign/deactivate (active=false+endDate, לא מחיקה פיזית) |
| StaffGroup | 79, 53 | ✅ הושלם | assign/remove |
| RegistrationRequest + approve/reject | 84, 13-15 | ✅ הושלם | submit (public) + list/approve/reject (Admin); approve יוצר Participant ומשתמש אופציונלי לפי `participantUserMode` |

## מנוע סכימה דינמית (Dynamic Schema Engine)

| רכיב | סעיף אפיון | סטטוס | הערות |
|------|-----------|-------|-------|
| FieldDefinition CRUD | 25-32, 80-82 | ✅ הושלם | internalKey אוטומטי; type-change ו-required-change עוברים בדיקות בטיחות מול דאטה קיים לפני יישום |
| FieldOption CRUD (isActive) | 33-34, 83 | ✅ הושלם | disable (לא מחיקה פיזית) + institutionId denormalized |
| customFields Attribute Pattern `[{k,v}]` | 35 | ✅ הושלם | canonical בכל הישויות (Participant/Staff/Group/RegistrationRequest) |
| DynamicValidationPipe (type/required/unknown) | 36-37, 94.3 | ✅ הושלם | `DynamicFieldsValidatorService` — נאכף ב-create/update של Participant/Staff/Group |
| Dynamic search / filter / sort | 38-40, 85 | ✅ הושלם (Participants) | `?filters={"field_x":"y"}` (רק filterable), `?sortBy=&sortDir=` (רק sortable; שדה דינמי → aggregation pipeline). Staff/Groups עדיין רק שדות מערכת |
| אינדקסים מורכבים ל-customFields | 60-61 | ✅ הושלם | `{institutionId, customFields.k, customFields.v}` בכל schema רלוונטי |

## איכות ותשתיות (Cross-cutting)

| רכיב | סעיף אפיון | סטטוס | הערות |
|------|-----------|-------|-------|
| Soft delete (isDeleted/deletedAt) | 59 | ✅ הושלם | User, Institution, Participant, Staff, Group |
| Pagination אחיד | 86, 98.1 | ✅ הושלם | `PaginationQueryDto` + `PaginatedResult<T>` בכל ה-list endpoints |
| Logging | 96 | ⬜ טרם התחיל | |
| Docker (backend + mongo) | 101 | ✅ הושלם | `Dockerfile` (multi-stage build), `docker-compose.yml` (backend+mongo+healthcheck+volume), `.dockerignore`. **אומת בפועל** — `docker compose up` הורץ עד הסוף מול MongoDB אמיתי (ראו סעיף הבאג הקריטי למטה) |
| טסטים (unit/integration/security) | 102 | ✅ הושלם | `npm run test:integration` — 14 טסטים אוטומטיים מול MongoDB אמיתי (in-memory, לא mock) דרך `mongodb-memory-server`, ב-3 קבצים: functional (5) + security (9, סעיף 102.3 — tenant isolation, unauthenticated access, RBAC, mustChangePassword enforcement). **אומת פעמיים שהם באמת תופסים רגרסיות:** גם הבאג הקריטי וגם שבירת tenant isolation שוחזרו זמנית ונצפה כישלון מדויק, לפני שחזור התיקון |

---

## 🚨 באג קריטי שנמצא ותוקן (2026-08-10)

**נמצא רק דרך בדיקה אמיתית מול MongoDB (Docker) — בדיוק הסיבה שסעיף 102 חשוב.**

**מה היה שבור:** בכל 10 קבצי ה-schema בפרויקט, שדות ObjectId (`institutionId`,
`participantId`, `staffId`, `groupId`, `fieldId` וכו') הוגדרו כך:
```ts
import { Types } from 'mongoose';
@Prop({ type: Types.ObjectId, ref: 'Institution', ... })
```
`Types.ObjectId` הוא מחלקת ה-**BSON ObjectId עצמה** (ליצירת instance), **לא**
`Schema.Types.ObjectId`/`SchemaTypes.ObjectId` שזה מה ש-Mongoose צריך כדי לדעת
את **סוג השדה בסכימה**. Mongoose לא זיהה את זה, הגדיר את השדה כ-`Mixed`, ואיבד
את ה-cast האוטומטי string↔ObjectId.

**איך זה התבטא בפועל:** שדה שנכתב עם string (למשל institutionId שמגיע מ-JWT)
נשמר כ-string; שדה שנכתב עם ObjectId אמיתי (כמו `institution._id` בקוד פנימי)
נשמר כ-ObjectId. חוסר עקביות שקט. **תפסתי את זה** כי `GET /institutions/me`
החזיר `settings: null` על אף שהמסמך קיים ב-DB — כי `register()` יצר את
ה-settings עם `institution._id` (ObjectId אמיתי), אבל `getMe()`/`getSettings()`
שאלו עם `institutionId` string מה-JWT — type mismatch, אפס תוצאות.

**למה זה לא נתפס קודם:** רוב המודולים (Participant, Group וכו') כתבו **וגם**
קראו עם string בעקביות (שניהם מגיעים מ-JWT), אז זה "עבד במקרה". זה נשבר רק
כשמסלול אחד כתב ObjectId אמיתי ומסלול אחר קרא עם string — בדיוק המקרה של
Institution↔InstitutionSettings.

**התיקון:** בכל 10 הקבצים, `type: Types.ObjectId` → `type: SchemaTypes.ObjectId`
(עם `import { SchemaTypes } from 'mongoose'` — לא `Schema.Types` כי `Schema`
כבר מיובא מ-`@nestjs/mongoose` בכל קובץ ויוצר התנגשות שמות). `Types.ObjectId`
עדיין נשאר בשימוש כטיפוס TypeScript (`institutionId: Types.ObjectId | null`)
— זה תקין ולא קשור לבאג.

**אומת אחרי התיקון (מול Mongo אמיתי דרך Docker, DB נקי מאפס):**
- `register()` → `login()` → `GET /institutions/me` מחזיר `settings` תקין (לא null)
- `PUT /institutions/settings` עובד (קודם היה מחזיר 404)
- `institutionId` מאוחסן כ-BSON ObjectId אמיתי (נבדק ישירות ב-mongosh: `instanceof ObjectId === true`)
- שרשרת מלאה: Group + Participant + ParticipantGroup + סינון `?groupId=` (שאילתה חוצת-collections) — עובד נכון

**קבצים שתוקנו:** `field-definition.schema.ts`, `field-option.schema.ts`,
`group.schema.ts`, `institution-settings.schema.ts`, `participant-group.schema.ts`,
`participant.schema.ts`, `registration-request.schema.ts`, `staff-group.schema.ts`,
`staff.schema.ts`, `user.schema.ts`.

**עדכון (2026-08-10, אחר כך): הבדיקה הידנית הזו הפכה לטסטים אוטומטיים** —
ראו `test/integration/`. הרצתי ניסוי מכוון: **החזרתי את הבאג זמנית**
(`type: Types.ObjectId` בחזרה) והרצתי רק את `institution-settings.integration-spec.ts`
— שני מתוך שלושה טסטים נכשלו **בדיוק** באותם אופנים שנצפו ידנית
(`settings: null`, `PUT` מחזיר 404). זה מוכיח שהטסטים באמת תופסים את
הבאג הזה ולא רק "עוברים במקרה". אחרי זה שוחזר התיקון וכל הטסטים חזרו לירוק.

---

## החלטות פתוחות / שאלות לבעל המוצר

- **זיהוי מוסד ב-login (סעיף 66):** בקשת ה-login מכילה `username`+`password` בלבד, אבל `username` ייחודי רק *בתוך* מוסד. הפתרון הזמני ל-v1: מחפשים את כל המשתמשים הפעילים עם אותו username ומקבלים את זה שהסיסמה שלו תואמת (`AuthService.login`). אם בעל המוצר ירצה — לשקול הוספת מזהה מוסד ל-login או username גלובלי (אימייל). ליישום ב-`src/modules/auth/auth.service.ts`.
- רישום מוסד (`register`) מבצע יצירה סדרתית ללא טרנזקציה (MongoDB standalone לא תומך ב-transactions). יש rollback ידני אם יצירת האדמין/הגדרות נכשלת. אם עוברים ל-replica set — כדאי לעטוף ב-session/transaction.
- **"Staff (according to institution settings)" ליצירת Participant (סעיף 71):** אין כרגע דגל ב-`InstitutionSettings` שקובע האם STAFF רשאי ליצור Participant — כרגע כל STAFF מורשה (per CASL entity-level). אם בעל המוצר רוצה toggle — צריך להוסיף שדה להגדרות ולבדוק אותו ב-`ParticipantsController`/`Service`.
- **Group-scoping ל-STAFF (סעיף 19, 519, 833):** ממומש ב-`ParticipantsService` (לא כתנאי CASL native, אלא כלוגיקת שירות שמסננת לפי `StaffGroup`+`ParticipantGroup` כש-`staffGroupManagementEnabled=true`). CASL כרגע אחראי רק לרמת entity (can/cannot על הישות כולה), לא field-level — זה עדיין לא בנוי (חלק מ-Dynamic Schema Engine).
- **`institutionId` בגוף הבקשה ב-`POST /registration-requests` (סעיף 84, 13):** יוצא דופן מכוון לכלל "לעולם לא institutionId מה-body" (סעיף 91) — השולח אינו מאומת (אין JWT), אז אין מקור אחר. הבקשה יוצרת רק `RegistrationRequest` ב-Pending, לא דאטה עסקית. מתועד ב-DTO עצמו.
- **`participantUserMode = 'optional'` באישור בקשת הרשמה (סעיף 15):** האפיון לא קובע מי מחליט. החלטה: המנהל המאשר בוחר per-request דרך `createUser` (ברירת מחדל `false`) ב-body של ה-approve. ל-`'always'` תמיד נוצר User, ל-`'never'` אף פעם.
- **Username אוטומטי כשנוצר User באישור בקשת הרשמה:** אין username בבקשת ההרשמה המקורית (רק firstName/lastName/customFields) — נוצר אוטומטית מ-`firstName.lastName.<סיומת רנדומלית>`. אפשר לשקול לתת למנהל לספק username מותאם ב-body של approve בעתיד.
- **required=true עם רשומות קיימות חסרות ערך (סעיף 31):** אם יש רשומות חסרות, `PUT /field-definitions/:id` נכשל עם `REQUIRED_CHANGE_NEEDS_CONFIRMATION` ומספר הרשומות החסרות. Option A (השארה כמו שהיא) = לשלוח שוב עם `confirmRequiredChange:true`. Option B (מילוי ידני קודם) = לתקן את הרשומות דרך endpoints רגילים ואז לשלוח את אותו PUT בלי דגל — הבדיקה תעבור אוטומטית כשהמספר יגיע ל-0.
- **שינוי fieldType (סעיף 32):** נבדק בפועל מול **כל** הערכים הקיימים תחת אותו `internalKey` בכל הרשומות של המוסד/סוג הישות (Participant/Staff/Group). אם ולו רשומה אחת לא תואמת — כל הבקשה נדחית (`INCOMPATIBLE_FIELD_TYPE_CHANGE`), אין המרה חלקית. לביצועים בקנה מידה גדול ייתכן שיהיה צריך אופטימיזציה (אגרגציה עם projection) — כרגע טוען את כל המסמכים התואמים לזיכרון.
- **מחיקת FieldDefinition (סעיף 82.1):** מחיקת ה-FieldDefinition עצמה סינכרונית; ניקוי ה-`customFields` מהרשומות הקיימות (`$pull`) הוא "fire-and-forget" — לא ממתינים לו בתגובת ה-API, רק נרשם ללוג בסיום. אין עדיין תשתית job queue אמיתית (Bull/Redis) — זה ריצה ברקע של אותו תהליך Node, לא job עצמאי.
- **DynamicValidationPipe — reject ולא strip (סעיף 36):** האפיון מציע "Automatically strip or reject". בחרתי **reject** (שגיאה חוזרת ללקוח) על ניסיון לכתוב שדה שאין הרשאת edit אליו, במקום לזרוק את הערך בשקט — כדי שכשלים בהרשאות יהיו גלויים ולא יבלעו בלי הודעה. ממומש ב-`DynamicFieldsValidatorService`.
- **Field-level READ permissions (סעיף 21) — הושלם:** `DynamicFieldsValidatorService.getViewableKeys`/`filterByViewableKeys`. שדה עם `view:false` לתפקיד המבקש מוסתר לגמרי מ-GET (list/single/אחרי update) של Participant/Staff/Group. ADMIN רואה תמיד הכל (מחזיר `null` = "אין סינון"). entry עם מפתח (`k`) שאין לו FieldDefinition תואם מוסתר גם הוא מ-STAFF/PARTICIPANT כברירת מחדל בטוחה (לדוגמה שארית אחרי מחיקת שדה שהניקוי ברקע עוד לא הגיע אליה).
- **תיקון אגבי: `_id:false` על איברי customFields:** גילינו שהמערכים `customFields:[{k,v}]` ב-Participant/Staff/Group/RegistrationRequest קיבלו `_id` אוטומטי מ-Mongoose לכל איבר (לא חלק מהמבנה הקנוני בסעיף 35). תוקן בכל הסכימות.
- **ביצועי סינון READ:** `getViewableKeys` נקרא **פעם אחת** לכל בקשת GET (גם ברשימה שלמה, לא לכל רשומה) כדי למנוע N+1 שאילתות.
- **ADMIN עוקף את כל בדיקות ה-DynamicValidationPipe פרט למבנה/טיפוס:** ADMIN עדיין עובר בדיקת "unknown key"/"invalid type"/"missing required" (בדיקות שלמות דאטה), אבל לא בדיקת הרשאת edit (יש לו תמיד edit מלא, per סעיף 21 editorial note). קריאות פנימיות (כמו `RegistrationRequestsService.approve`) עוברות עם role=ADMIN כברירת מחדל.
- **Dynamic filter/sort מומש רק ב-Participants (סעיפים 38-40):** `filters` הוא JSON string `{internalKey:value}` שהופך ל-`$all`/`$elemMatch` (AND בין כמה שדות), נאכף רק אם `searchSettings.filterable=true`. `sortBy`/`sortDir` — אם `sortBy` הוא שדה מערכת (firstName/lastName/createdAt) ממוינים רגיל; אם זה internalKey עם `searchSettings.sortable=true` — עובר ל-aggregation pipeline (`$addFields`+`$let`+`$filter` לחלץ את הערך מתוך מערך ה-customFields, `$sort` לפיו). **חשוב:** אין עדיין סביבת אינטגרציה עם MongoDB אמיתי בפרויקט (סעיף 102 עדיין לא בנוי) — נתיב ה-aggregation נבדק רק ב-build/lint/e2e-boot (שלא נוגע ב-DB), לא הורץ בפועל מול דאטה אמיתי. מומלץ לבדוק ידנית לפני production. Staff ו-Groups לא קיבלו את אותה הרחבה — יש להם רק pagination בסיסי.
- **npm audit fix (2026-07-27):** תוקנה חולשת אבטחה "high severity" בחבילה עקיפה (`brace-expansion`, תלות של jest/typescript-eslint) שהתגלתה בבדיקת clone נקי. תלות פיתוח בלבד, לא בקוד הייצור. `npm audit fix` פתר בלי לשבור כלום (build/lint/test אומתו אחרי).
- **mustChangePassword — עלות ביצועים מקובלת (סעיף 70.1):** `MustChangePasswordGuard` קורא ל-DB בכל בקשה מוגנת (לא נשען על השדה ב-JWT, כי סעיף 67 אוסר "frequently changing settings" בטוקן — וזה בדיוק שדה כזה: משתמש שממש שינה סיסמה חייב "להשתחרר" מיידית, לא אחרי שה-cache יפוג). Trade-off מתועד: תקינות מיידית > ביצועים.
- **נעילת חשבון per-username (סעיף 90.1):** נוספו שדות `failedLoginAttempts`/`lockedUntil` ל-`User`. לאחר 5 ניסיונות כושלים על אותו חשבון — ננעל ל-15 דקות, ללא קשר לכתובת ה-IP. המספרים (5 ניסיונות, 15 דקות) הם ערכים שנבחרו — האפיון לא מציין מספרים מדויקים. חשבון נעול מדולג ישירות (לא מנסים bcrypt.compare בכלל) — לא מגדילים את מונה הכשלונות בזמן שהחשבון כבר נעול.
- **Rate limiting IP-based — אחסון בזיכרון (`@nestjs/throttler` ברירת מחדל):** מתאים לאינסטנס שרת בודד. אם יהיה scale-out (כמה אינסטנסים מאחורי load balancer), יהיה צריך storage משותף (Redis) כדי שהמגבלה תיאכף נכון על פני כל האינסטנסים.
- **Integration tests עם `mongodb-memory-server` ולא Docker (סעיף 102):** נבחר במכוון — מריץ MongoDB **אמיתי** (לא mock) בזיכרון, ללא תלות ב-Docker daemon בזמן ריצת הטסטים. עובד זהה מקומית וב-CI, בלי הבעיות שנתקלנו בהן עם Docker Desktop. `test/integration/setup-mongo.ts` מפעיל/מכבה, `test/integration/bootstrap-app.ts` בונה אפליקציית Nest מלאה (אותו ValidationPipe כמו `main.ts`), `test/integration/http-helpers.ts` נותן טיפוס בטוח ל-`.body.data` של supertest. הרצה: `npm run test:integration`. **מכסה כרגע (14 טסטים, 3 קבצים):** רגרסיית הבאג הקריטי (Institution↔Settings), שרשרת Group+Participant+ParticipantGroup, ו-security (`security.integration-spec.ts`, סעיף 102.3) — tenant isolation בין שני מוסדות (GET/list/DELETE cross-tenant → 404 לא 200), גישה לא מאומתת (401), RBAC (STAFF חסום מ-FieldDefinition, מותר ל-Participant), ואכיפת mustChangePassword על משתמש חדש (403 עד שינוי סיסמה). **אומת ששבירת tenant isolation (הסרת סינון institutionId מ-`findOneRaw`) גורמת לטסט המתאים להיכשל בדיוק (200 במקום 404)** — לפני שהוחזר. **לא מכוסה עדיין:** ה-aggregation pipeline של מיון דינמי (FieldDefinition-based sort).

## מה הבא בתור (Next up)

1. הרחבת integration tests לכסות את ה-aggregation pipeline של מיון דינמי (FieldDefinition sortable) — עדיין לא נבדק אוטומטית.
2. לוודא שאין עוד מופעים של הבאג הקריטי (type:Types.ObjectId) במקומות שלא נבדקו — סקירה נוספת/lint rule מותאם שמונע רגרסיה.
3. Logging מובנה (סעיף 96).
4. Dynamic search/filter/sort — להרחיב מ-Participants גם ל-Staff ו-Groups (כרגע רק Participants קיבל את זה).
5. Field-level permissions על RegistrationRequest (אם רלוונטי) ו-Audit Log (סעיף 97, מוגדר עתידי ולא v1 — לוודא שזה אכן לא נדרש עדיין).

## יומן דחיפות (Session Log)

| תאריך | מפתחת/סשן | מה נעשה | סטטוס בסיום |
|-------|-----------|---------|-------------|
| 2026-07-24 | Claude (Miryam) | סקיל שיטת עבודה + PROGRESS + תשתית common + Auth/Users/Institution בסיסי | ✅ נדחף |
| 2026-07-24 | Claude (Miryam) | CASL Ability Factory+Guard, Groups, Participants (+group/self scoping), Staff, ParticipantGroup, StaffGroup | ✅ נדחף |
| 2026-07-26 | Claude (Miryam) | RegistrationRequest — submit (public) + list/approve/reject (Admin), יצירת Participant+User אופציונלי באישור | ✅ נדחף |
| 2026-07-27 | Claude (Miryam) | FieldDefinition + FieldOption CRUD מלא — internalKey אוטומטי, בדיקות בטיחות ל-required/fieldType change מול דאטה קיים, מחיקה עם ניקוי customFields ברקע | ✅ נדחף |
| 2026-07-27 | Claude (Miryam) | DynamicValidationPipe (`DynamicFieldsValidatorService`) — נאכף על create/update של Participant/Staff/Group: unknown-key, type/required, write-permission (reject) | ✅ נדחף |
| 2026-07-27 | Claude (Miryam) | Field-level READ permissions — סינון customFields ב-GET לפי `view` permission; תיקון `_id:false` על customFields entries | ✅ נדחף |
| 2026-07-27 | Claude (Miryam) | Dynamic search/filter/sort ל-Participants — `filters` JSON + `sortBy`/`sortDir` עם aggregation pipeline לשדות דינמיים (לא נבדק עדיין מול DB אמיתי) | ✅ נדחף |
| 2026-07-27 | Claude (Miryam) | תיעוד: תיקיית `docs/` עם 11 קבצים — הסבר כללי, מבנה פרויקט, כל מודול לעומק, ומילון מונחים (כולל Docker) | ✅ נדחף |
| 2026-07-27 | Claude (Miryam) | תיעוד מורחב: 4 קבצים נוספים (12-15) — הסברי קוד שורה-שורה ל-common/auth/users, Docker מורחב, enum-vs-union-type | ✅ נדחף |
| 2026-07-27 | Claude (Miryam) | אימות מלא מ-clone נקי (npm install+build+lint+test+e2e) בתיקייה זמנית — סימולציית "מפתחת אחרת"; תוקנה חולשת אבטחה שהתגלתה (brace-expansion, dev dep) | ✅ נדחף |
| 2026-08-03 | Claude (Miryam) | mustChangePassword אכיפה בפועל (`MustChangePasswordGuard` גלובלי) + Rate limiting (`@nestjs/throttler`: IP-based על login/registration-requests, נעילת חשבון per-username על login) | ✅ נדחף |
| 2026-08-03 | Claude (Miryam) | תוקנה חולשת אבטחה נוספת שהתגלתה ב-clone נקי (`fast-uri`, הובאה ע"י `@nestjs/throttler`) — `npm audit` מציג 0 חולשות כעת. אומת שוב בזרימת clone-נקי מלאה (install+build+lint+test+e2e) | ✅ נדחף |
| 2026-08-10 | Claude (Miryam) | Docker (Dockerfile+docker-compose+dockerignore), הורץ בפועל עם `docker compose up` מול MongoDB אמיתי. **תפס באג קריטי** ב-10 קבצי schema (`type:Types.ObjectId` → `Mixed` type, לא `ObjectId`) — תוקן ל-`SchemaTypes.ObjectId`, אומת מחדש מקצה-לקצה (register/login/CRUD/cross-collection filter) | ✅ נדחף |
| 2026-08-10 | Claude (Miryam) | Integration tests אוטומטיים (`test/integration/`, `mongodb-memory-server`) — 5 טסטים מול Mongo אמיתי; אומת שהם תופסים רגרסיות ע"י החזרת הבאג הקריטי זמנית ובדיקה שהטסטים נכשלים כצפוי | ✅ נדחף |
| 2026-08-10 | Claude (Miryam) | Security integration tests (סעיף 102.3) — `security.integration-spec.ts`: tenant isolation (2 מוסדות), unauthenticated access, RBAC (STAFF vs Admin), mustChangePassword enforcement. 9 טסטים; אומת ששבירת tenant isolation גורמת לכישלון מדויק לפני שחזור | ✅ נדחף |
