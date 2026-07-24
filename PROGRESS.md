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
| CASL Ability Factory + Guard (ABAC) | 20-21, 93 | ⬜ טרם התחיל | הבא בתור — entity + field level |
| mustChangePassword flow | 70.1 | ⬜ טרם התחיל | |
| Rate limiting (login, registration) | 90.1 | ⬜ טרם התחיל | |

## ישויות ליבה (Core Entities & CRUD)

| מודול | סעיף אפיון | סטטוס | הערות |
|-------|-----------|-------|-------|
| Institution + InstitutionSettings + register | 46-47, 69 | ✅ הושלם | register יוצר Institution+Admin User+Settings |
| Platform (SUPER_ADMIN) approve/suspend/reject | 69.1 | ⬜ טרם התחיל | |
| Users API (CRUD, soft delete, change-password) | 70, 70.1 | ✅ הושלם | controller מלא + temp password + mustChangePassword |
| Participants API (CRUD, pagination, search) | 71-75, 49 | ⬜ טרם התחיל | |
| Staff API | 76, 50 | ⬜ טרם התחיל | |
| Groups API | 77, 51 | ⬜ טרם התחיל | |
| ParticipantGroup (+ היסטוריה) | 78, 52, 18 | ⬜ טרם התחיל | |
| StaffGroup | 79, 53 | ⬜ טרם התחיל | |
| RegistrationRequest + approve/reject | 84, 13-15 | ⬜ טרם התחיל | |

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
| Soft delete (isDeleted/deletedAt) | 59 | 🔧 בעבודה | מיושם ב-User + Institution; להרחיב ל-Participant/Staff/Group |
| Pagination אחיד | 86, 98.1 | ⬜ טרם התחיל | `{items,page,limit,total}` |
| Logging | 96 | ⬜ טרם התחיל | |
| Docker (backend + mongo) | 101 | ⬜ טרם התחיל | |
| טסטים (unit/integration/security) | 102 | ⬜ טרם התחיל | |

---

## החלטות פתוחות / שאלות לבעל המוצר

- **זיהוי מוסד ב-login (סעיף 66):** בקשת ה-login מכילה `username`+`password` בלבד, אבל `username` ייחודי רק *בתוך* מוסד. הפתרון הזמני ל-v1: מחפשים את כל המשתמשים הפעילים עם אותו username ומקבלים את זה שהסיסמה שלו תואמת (`AuthService.login`). אם בעל המוצר ירצה — לשקול הוספת מזהה מוסד ל-login או username גלובלי (אימייל). ליישום ב-`src/modules/auth/auth.service.ts`.
- רישום מוסד (`register`) מבצע יצירה סדרתית ללא טרנזקציה (MongoDB standalone לא תומך ב-transactions). יש rollback ידני אם יצירת האדמין/הגדרות נכשלת. אם עוברים ל-replica set — כדאי לעטוף ב-session/transaction.

## מה הבא בתור (Next up)

1. השלמת Users controller מלא (CRUD + soft delete) — סעיף 70.
2. CASL Ability Factory + Guard — סעיפים 20-21, 93 (בסיס לכל בדיקות ההרשאה).
3. Participants module (CRUD בסיסי לפני חיבור לסכימה דינמית) — סעיפים 71-75.

## יומן דחיפות (Session Log)

| תאריך | מפתחת/סשן | מה נעשה | סטטוס בסיום |
|-------|-----------|---------|-------------|
| 2026-07-24 | Claude (Miryam) | סקיל שיטת עבודה + PROGRESS + תשתית common + Auth/Users/Institution בסיסי | ✅ נדחף |
