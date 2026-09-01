# CASL — מנוע ההרשאות (ABAC)

זה החלק ה"מוחי" ביותר בפרויקט. האפיון (סעיפים 20-21, 93) דורש מנוע הרשאות
מרכזי, לא בדיקות `if (role === 'ADMIN')` מפוזרות בכל הקוד.

## שלוש רמות הרשאה (ולא כולן קיימות באותה מידה עדיין)

| רמה | שאלה שנענית | איפה ממומש |
|-----|--------------|-------------|
| **Entity-level** | "האם התפקיד הזה בכלל יכול לגעת בישות מסוג X?" | `CaslAbilityFactory` + `CaslAbilityGuard` |
| **Context-aware** | "האם ה-STAFF הזה ספציפית מורשה לישות ה-**ספציפית** הזאת (למשל, האם המשתתף הזה בקבוצה שלו)?" | לוגיקת שירות ב-`ParticipantsService` |
| **Field-level** | "האם מותר לתפקיד הזה לראות/לערוך את **השדה** הספציפי הזה?" | `DynamicFieldsValidatorService` |

## Entity-level — `CaslAbilityFactory`

📄 [`src/modules/casl/casl-ability.factory.ts`](../src/modules/casl/casl-ability.factory.ts)

בונה "יכולות" (abilities) לכל role — מי מורשה `manage`/`create`/`read`/
`update`/`delete` על איזו ישות:

- **ADMIN**: `manage` (הכל) על כל הישויות במוסד שלו.
- **STAFF**: `read`/`update` על Participant, `read` על Group — **לא**
  FieldDefinition/User/Institution (אפיון סעיף 10).
- **PARTICIPANT**: `read`/`update` על Participant (הבעלות על הרשומה
  הספציפית נבדקת בשירות, לא כאן).
- **SUPER_ADMIN**: `manage` על Institution בלבד (ברמת פלטפורמה).

📄 [`src/modules/casl/guards/casl-ability.guard.ts`](../src/modules/casl/guards/casl-ability.guard.ts) —
Guard שבודק את `@CheckAbility(action, subject)` שמוגדר על route. רץ
**אחרי** `RolesGuard` (סינון גס), כך ש-CASL עונה על שאלה עדינה יותר.

## Context-aware — סינון לפי הקשר, לא רק תפקיד

זה **לא** ממומש כ"תנאי CASL" native, אלא כלוגיקת שירות מפורשת ב-
📄 [`src/modules/participants/participants.service.ts`](../src/modules/participants/participants.service.ts)
(שיטות `applyContextScope`/`assertAccessible`):

```
STAFF שולח GET /participants
        ↓
אם staffGroupManagementEnabled=false → רואה הכל (בהתאם להרשאת entity)
        ↓
אם staffGroupManagementEnabled=true:
        1. מוצא את כל ה-StaffGroup של אותו איש צוות
        2. מוצא את כל ה-ParticipantGroup הפעילים בקבוצות האלה
        3. מגביל את התוצאות רק למשתתפים האלה
```

**PARTICIPANT** מקבל טיפול דומה אבל פשוט יותר: מוצא את ה-`participantId`
המקושר ל-User שלו (דרך `UsersService.findByIdForAuth`) ורואה **רק** את
הרשומה הזו.

**למה לא CASL conditions?** כי הרשימה המותרת נגזרת משתי שאילתות DB
נפרדות (StaffGroup ואז ParticipantGroup) — לא ניתן לבטא את זה כתנאי CASL
סטטי בקלות. פישוט מכוון: לוגיקת שירות ברורה במקום לכפות מבנה לא טבעי.

## Field-level — `DynamicFieldsValidatorService`

זה הפירוט המלא בקובץ [`10-dynamic-schema-engine.md`](10-dynamic-schema-engine.md).
בקצרה: כל שדה דינמי (customFields entry) מוגדר עם מטריצת הרשאות
`{staff:{view,edit}, participant:{view,edit}}`. ADMIN תמיד רואה/עורך הכל.

- **בכתיבה (write):** ניסיון לכתוב שדה בלי הרשאת `edit` → **נדחה** בשגיאה
  (לא "נבלע בשקט" — החלטת עיצוב מתועדת).
- **בקריאה (read):** שדה בלי הרשאת `view` → **מוסתר לגמרי** מהתגובה.

## סדר ה-Guards הגלובלי (חשוב להבין את הסדר)

```
JwtAuthGuard  →  RolesGuard  →  CaslAbilityGuard
   (מי אתה?)      (תפקיד מותר?)   (מותר לך על הישות הזו?)
```

כל שלב "זול" יותר רץ קודם — לא משקיע ב-CASL (שבונה ability object) אם
המשתמש אפילו לא מאומת.

## מסמכים קשורים
- [`04-auth-and-users.md`](04-auth-and-users.md) — מי בכלל `AuthenticatedUser`
- [`10-dynamic-schema-engine.md`](10-dynamic-schema-engine.md) — פירוט מלא של field-level permissions
