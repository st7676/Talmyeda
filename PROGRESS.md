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
| mustChangePassword flow | 70.1 | ⬜ טרם התחיל | |
| Rate limiting (login, registration) | 90.1 | ⬜ טרם התחיל | |

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
| Docker (backend + mongo) | 101 | ⬜ טרם התחיל | |
| טסטים (unit/integration/security) | 102 | ⬜ טרם התחיל | |

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

## מה הבא בתור (Next up)

1. mustChangePassword אכיפה בפועל (guard שחוסם פעולות עד שינוי סיסמה) + Rate limiting (90.1).
2. Docker, logging מובנה, טסטים (unit/integration/security) — סעיפים 96, 101, 102. **בפרט:** אין עדיין שום טסט אמיתי מול MongoDB — כדאי שזה יהיה בעדיפות גבוהה כדי לאמת את ה-aggregation pipeline של דירוג דינמי ואת שאר לוגיקת ה-DB.
3. Dynamic search/filter/sort — להרחיב מ-Participants גם ל-Staff ו-Groups (כרגע רק Participants קיבל את זה).

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
