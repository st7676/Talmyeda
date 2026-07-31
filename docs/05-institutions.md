# Institutions — מוסדות ופלטפורמה

## שתי שכבות שונות לגמרי

1. **מוסד בודד** (`Institution` + `InstitutionSettings`) — הדייר (tenant) עצמו.
2. **ניהול פלטפורמה** (SUPER_ADMIN) — לא קשור לאף מוסד ספציפי, מנהל את **כל**
   המוסדות (אישור/השעיה/דחייה).

📄 [`src/modules/institutions/institutions.controller.ts`](../src/modules/institutions/institutions.controller.ts)
מטפל בשכבה 1. 📄 [`src/modules/institutions/platform.controller.ts`](../src/modules/institutions/platform.controller.ts)
מטפל בשכבה 2 — **בכוונה controller נפרד**, כדי שברור ויזואלית שזה API
שונה לגמרי (לא מוגן ב-tenant scoping רגיל, כי הוא לא שייך לאף tenant).

## Institution — סכימה

📄 [`src/modules/institutions/schemas/institution.schema.ts`](../src/modules/institutions/schemas/institution.schema.ts)

שדות: `name`, `status` (Pending/Active/Suspended/Rejected), soft delete.
`Rejected` הוא סטטוס שהוספתי (לא כתוב מפורשות באפיון) כדי לתמוך ב-
`POST /platform/institutions/:id/reject`.

## InstitutionSettings — איך מוסד מתאים את עצמו

📄 [`src/modules/institutions/schemas/institution-settings.schema.ts`](../src/modules/institutions/schemas/institution-settings.schema.ts)

| שדה | תפקיד |
|-----|-------|
| `participantUserMode` | `always`/`never`/`optional` — האם משתתפים מקבלים חשבון login (סעיף 12) |
| `selfRegistrationEnabled` | האם `POST /registration-requests` פתוח לציבור |
| `requireApproval` | (שמור לעתיד — הזרימה הנוכחית תמיד עוברת אישור ידני) |
| `allowMultipleGroups` | האם משתתף יכול להיות בכמה קבוצות בו-זמנית |
| `staffGroupManagementEnabled` | האם STAFF רואה רק את המשתתפים בקבוצות שהוא משויך אליהן |

## תהליך הרשמת מוסד

📄 [`src/modules/institutions/institutions.service.ts`](../src/modules/institutions/institutions.service.ts) → `register()`

```
POST /institutions/register {institutionName, adminUsername, adminPassword}
        ↓
1. יוצר Institution בסטטוס Pending
        ↓
2. יוצר User מנהל (role=ADMIN) עם הסיסמה שנבחרה
        ↓
3. יוצר InstitutionSettings עם ברירות מחדל
        ↓
אם שלב 2/3 נכשל → מוחק את ה-Institution (rollback ידני, כי MongoDB
standalone לא תומך ב-transactions אמיתיות — מתועד כהחלטה פתוחה)
```

## אישור/השעיה ע"י SUPER_ADMIN

📄 [`platform.controller.ts`](../src/modules/institutions/platform.controller.ts) —
כל ה-routes מוגנים ב-`@Roles(Role.SuperAdmin)`:

| Endpoint | מה קורה |
|----------|---------|
| `GET /platform/institutions?status=Pending` | רשימת מוסדות ממתינים |
| `POST /platform/institutions/:id/approve` | Pending → Active |
| `POST /platform/institutions/:id/suspend` | Active/Suspended → Suspended (חוסם login לכולם) |
| `POST /platform/institutions/:id/reactivate` | Suspended → Active |
| `POST /platform/institutions/:id/reject` | Pending → Rejected, כל המשתמשים מסומנים Rejected |

## מסמכים קשורים
- [`04-auth-and-users.md`](04-auth-and-users.md) — איך משתמש Suspended נחסם בפועל
- [`07-participants-staff-groups.md`](07-participants-staff-groups.md) — `staffGroupManagementEnabled` בפעולה
