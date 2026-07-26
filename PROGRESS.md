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
| FieldDefinition CRUD | 25-32, 80-82 | ⬜ טרם התחיל | internalKey אוטומטי |
| FieldOption CRUD (isActive) | 33-34, 83 | ⬜ טרם התחיל | |
| customFields Attribute Pattern `[{k,v}]` | 35 | ⬜ טרם התחיל | canonical בכל הישויות |
| DynamicValidationPipe (type/required/unknown) | 36-37, 94.3 | ⬜ טרם התחיל | |
| Dynamic search / filter / sort | 38-40, 85 | ⬜ טרם התחיל | sort דרך aggregation |
| אינדקסים מורכבים ל-customFields | 60-61 | ⬜ טרם התחיל | |

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

## מה הבא בתור (Next up)

1. **מנוע הסכימה הדינמית**: FieldDefinition + FieldOption CRUD, ואז DynamicValidationPipe שמחבר את זה ל-Participant/Staff/Group customFields (כרגע customFields מתקבל כ-`[{k,v}]` גולמי בלי ולידציה מול הגדרות שדה) — סעיפים 25-41, 80-83.
2. **Field-level permissions ב-CASL** (סעיף 21) — ברגע שיש FieldDefinition, לחבר את מטריצת ה-permissions לסינון payload בקשה/תגובה.
3. mustChangePassword אכיפה בפועל (guard שחוסם פעולות עד שינוי סיסמה) + Rate limiting (90.1).

## יומן דחיפות (Session Log)

| תאריך | מפתחת/סשן | מה נעשה | סטטוס בסיום |
|-------|-----------|---------|-------------|
| 2026-07-24 | Claude (Miryam) | סקיל שיטת עבודה + PROGRESS + תשתית common + Auth/Users/Institution בסיסי | ✅ נדחף |
| 2026-07-24 | Claude (Miryam) | CASL Ability Factory+Guard, Groups, Participants (+group/self scoping), Staff, ParticipantGroup, StaffGroup | ✅ נדחף |
| 2026-07-26 | Claude (Miryam) | RegistrationRequest — submit (public) + list/approve/reject (Admin), יצירת Participant+User אופציונלי באישור | ✅ נדחף |
