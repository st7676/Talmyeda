# `src/common/` — התשתית המשותפת

זו התיקייה ש**כל** שאר המודולים תלויים בה. שום דבר כאן לא "עסקי" (לא נוגע
ב-Participant/Staff וכו') — הכל תשתית גנרית.

## `enums/` — קבועים משותפים

| קובץ | תוכן |
|------|------|
| `role.enum.ts` | `Role`: `SUPER_ADMIN`, `ADMIN`, `STAFF`, `PARTICIPANT` (אפיון סעיף 8, 302) |
| `status.enum.ts` | `InstitutionStatus` (Pending/Active/Suspended/Rejected), `AccountStatus` (Active/Inactive/Rejected) |
| `field-type.enum.ts` | `FieldType` (Text/LongText/Number/Boolean/Date/DateTime/Select/MultiSelect — סעיף 28), `FieldEntityType` (Participant/Staff/Group בלבד — סעיף 26) |

למה `enum` ולא סתם מחרוזות/union type? כי `enum` **קיים גם ב-runtime**
(לא רק בזמן קומפילציה) — Mongoose צריך את זה כדי לאכוף `enum: Role` ברמת
ה-DB, ו-`class-validator` צריך את זה בשביל `@IsEnum(Role)`. הסבר מורחב
יותר על ההבדל בין `enum` ל-union type זמין בהיסטוריית הצ'אט של הפרויקט
(לא תועד כאן במלואו כדי לא לחזור על עצמנו).

## `interfaces/`

- **`AuthenticatedUser`** — הטיפוס הכי חשוב בפרויקט: `{userId, institutionId, role}`.
  `institutionId` הוא `string | null` (null רק ל-SUPER_ADMIN). זה מה
  שמוצמד לכל בקשה מאומתת, ומה שכל controller מקבל דרך `@CurrentUser()`.
- **`SuccessResponse<T>` / `ErrorResponse`** — מבנה התגובה האחיד (אפיון סעיף 65).
- **`PaginatedResult<T>`** — `{items, page, limit, total}` (אפיון סעיף 86).

## `errors/app-error.ts`

מחלקת שגיאה מותאמת (`extends HttpException`) עם `code` יציב לצד `message`
קריא. יש factory methods נוחים: `AppError.notFound(...)`,
`AppError.forbidden(...)`, `AppError.unauthorized(...)`,
`AppError.conflict(...)`, `AppError.validation(...)` — כל אחד ממפה
לקוד HTTP הנכון. נזרק מכל מקום בקוד במקום `throw new Error(...)` גנרי.

## `filters/all-exceptions.filter.ts`

תופס **כל** שגיאה שנזרקת באפליקציה (`@Catch()` בלי פרמטר) וממיר אותה
למעטפת `{success:false, error:{code, message}}`. גם מטפל במקרה מיוחד
שבו `class-validator` מחזיר שגיאה כמערך מחרוזות (מאחד אותן למחרוזת אחת).
רק שגיאות 500+ נרשמות ל-log — שגיאות 400-499 הן חלק נורמלי מהזרימה.

## `interceptors/response.interceptor.ts`

עוטף **כל** תגובה מוצלחת ב-`{success:true, data:...}` — כך שה-controllers
פשוט מחזירים אובייקט רגיל בלי לדעת כלום על מבנה התגובה.

## `decorators/`

| Decorator | תפקיד |
|-----------|-------|
| `@Public()` | מסמן route שלא דורש אימות (login, register, submit registration) |
| `@Roles(Role.Admin, ...)` | מגביל route לתפקידים מסוימים — נבדק ע"י `RolesGuard` |
| `@CurrentUser()` | מזריק את `AuthenticatedUser` לפרמטר של ה-handler, **תמיד מה-JWT** ולעולם לא מגוף הבקשה |

זה בדיוק המקום שבו נאכף הכלל "לעולם לא institutionId מהקליינט" (אפיון
סעיף 91) — `@CurrentUser()` הוא הצינור היחיד שממנו מגיע institutionId
לכל controller.

## `dto/`

- **`pagination-query.dto.ts`** — `page`/`limit` עם ולידציה (`@Type(()=>Number)`
  כי query strings תמיד מגיעים כ-string, לא מספר), ותקרת `limit` מקסימלית
  100 (אפיון סעיף 98.1: "Never return unlimited records").
- **`custom-field-entry.dto.ts`** — ולידציה **מבנית** בלבד ל-`{k,v}` בודד
  בתוך מערך `customFields`. ולידציה **סמנטית** (סוג הערך תואם את הגדרת
  השדה) קורית במקום אחר לגמרי — ראו `10-dynamic-schema-engine.md`.

## `utils/`

- **`password.util.ts`** — `hashPassword`/`verifyPassword` (עטיפה סביב
  bcrypt, 12 salt rounds), `generateTempPassword` (משתמש ב-`crypto.randomBytes`,
  **לא** ב-`Math.random()` שאינו מאובטח קריפטוגרפית).
- **`field-value.util.ts`** — `isValueCompatibleWithType(fieldType, value, activeOptionValues?)`
  פונקציה משותפת שבודקת אם ערך תואם לסוג שדה דינמי (Text/Number/Boolean/
  Date/Select/MultiSelect). בשימוש **גם** בבדיקת שינוי סוג שדה (סעיף 32)
  **וגם** בולידציה של create/update (סעיף 36) — מקור אמת אחד לכלל הבדיקה.

## מסמכים קשורים
- [`06-casl-permissions.md`](06-casl-permissions.md) — איך `@Roles`/`@CurrentUser` מתחברים למנוע ההרשאות המלא
