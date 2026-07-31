# TypeScript: `enum` מול Union Type — מתי ולמה

(גרסה מלאה של ההסבר שניתן בצ'אט הפיתוח, בהקשר של `Role` enum בפרויקט.)

זו שאלה שנראית טריוויאלית אבל יש לה השלכות אמיתיות. בואי נשווה בין שתי
הדרכים לייצג את `Role`:

## אופציה א' — Union Type (מה שלא נבחר)

```ts
type Role = 'ADMIN' | 'STAFF' | 'PARTICIPANT' | 'SUPER_ADMIN';

const role: Role = 'ADMIN';
```

## אופציה ב' — `enum` (מה שנבחר בפועל)

```ts
enum Role {
  Admin = 'ADMIN',
  Staff = 'STAFF',
  Participant = 'PARTICIPANT',
  SuperAdmin = 'SUPER_ADMIN',
}

const role: Role = Role.Admin;
```

## ההבדל המרכזי: קיום בזמן ריצה (runtime)

זה ההבדל הכי חשוב.

### Union type — קיים רק בקומפילציה, נעלם ב-runtime

TypeScript מתקמפל ל-JavaScript, ו-JS **אין לו מושג** מה זה union types —
זו תכונה של TypeScript בלבד, שנמחקת לגמרי כשהקוד מתורגם ל-JS רגיל.

```ts
type Role = 'ADMIN' | 'STAFF';
const x: Role = 'ADMIN';
```

מתקמפל ל-JS פשוט:
```js
const x = 'ADMIN';  // Role "נעלם" לגמרי, אין לו קיום ב-JS
```

**המשמעות המעשית:** אין דרך לכתוב בקוד `Object.values(Role)` כדי לקבל את
**כל** הערכים האפשריים בזמן ריצה — כי `Role` לא באמת "קיים" כאובייקט,
הוא רק "רעיון" שה-compiler בודק ונעלם.

### `enum` — קיים גם ב-runtime, כאובייקט אמיתי

```ts
enum Role {
  Admin = 'ADMIN',
  Staff = 'STAFF',
}
```

מתקמפל ל-JS **אמיתי**:
```js
var Role;
(function (Role) {
  Role["Admin"] = "ADMIN";
  Role["Staff"] = "STAFF";
})(Role || (Role = {}));
```

זה יוצר **אובייקט JS ממשי** ששמו `Role`, עם ערכים שאפשר לגשת אליהם ב-runtime.

## למה זה קריטי בפרויקט הזה בפועל

### 1. שימוש ב-Mongoose `enum` validator

בקובץ `user.schema.ts`:
```ts
@Prop({ type: String, enum: Role, required: true })
role: Role;
```

Mongoose (בזמן ריצה, כשהשרת רץ ומקבל בקשות אמיתיות) צריך לדעת **אילו
ערכים מותרים** כדי לאכוף ולידציה ברמת ה-DB. הוא עושה את זה על ידי קריאת
`Object.values(Role)` מאחורי הקלעים. אם `Role` היה union type, **לא היה
שום אובייקט לקרוא** — Mongoose פשוט לא היה יכול לדעת מה הערכים המותרים,
כי ה-union type נעלם כבר בשלב הקומפילציה, הרבה לפני שהקוד בכלל רץ.

עם union type, היינו צריכים לכתוב את הרשימה **פעמיים** — פעם כטיפוס TS
ופעם כמערך JS נפרד לצורך Mongoose:
```ts
type Role = 'ADMIN' | 'STAFF' | 'PARTICIPANT' | 'SUPER_ADMIN';
const ROLE_VALUES = ['ADMIN', 'STAFF', 'PARTICIPANT', 'SUPER_ADMIN']; // כפילות!
```
זה בדיוק סוג הכפילות שרוצים להימנע ממנה — שני מקורות אמת שצריך לשמור מסונכרנים ידנית.

### 2. השוואות ב-runtime עם בטיחות

בכל הקוד כתוב דברים כמו:
```ts
if (user.role !== Role.Staff && dto.role !== Role.Participant) { ... }
```

זה עובד כי `Role.Staff` הוא **ביטוי JS אמיתי** שמחזיר את הערך `"STAFF"`
ב-runtime. עם union type, אין `Role.Staff` בכלל — היינו צריכים לכתוב
מחרוזות גולמיות:
```ts
if (user.role !== 'STAFF' && dto.role !== 'PARTICIPANT') { ... }
```
זה עובד, אבל מאבד הגנה: אם מישהי מקלידה `'STAF'` בטעות (חסר F),
TypeScript **לא יתפוס** את זה, כי זה סתם מחרוזת. עם `Role.Staff`, טעות
הקלדה כמו `Role.StafF` היא שגיאת קומפילציה מיידית (אין property כזה
על ה-enum).

### 3. Autocomplete ונראות

כשכותבים `Role.` בעורך קוד, ה-IDE מציג רשימת אפשרויות (`Admin`, `Staff`,
`Participant`, `SuperAdmin`) — כי זה namespace אמיתי עם members. עם union
type, אין "namespace" להשלים ממנו — רק כותבים מחרוזת חופשית ומקווים שהיא
נכונה.

## אז מתי כן משתמשים ב-union type?

זה לא ש-union types גרועים — הם **מצוינים** למקרים אחרים. למשל, בקובץ
`casl-ability.factory.ts`:

```ts
export type Action = 'manage' | 'create' | 'read' | 'update' | 'delete';
```

כאן נבחר union type **בכוונה**, לא enum. למה?
1. הספרייה `@casl/ability` עצמה מצפה למחרוזות גולמיות (`'read'`, לא
   `Action.Read`) — היא לא "יודעת" כלום על ה-enum שלנו.
2. אין צורך ב-Mongoose validation על הטיפוס הזה — הוא רק "מטייל" בין קוד
   TS פנימי (decorator → guard → factory), אף פעם לא נשמר ב-DB או מגיע
   מ-JSON חיצוני.
3. פחות "טקס" (boilerplate) כשלא צריך את יתרונות ה-runtime.

## כלל אצבע שנבחר לפרויקט

- אם הערך **נשמר ב-DB** (Mongoose schema) או **מגיע מקלט חיצוני שצריך
  אימות דינמי** (כמו `@IsEnum(Role)` ב-DTO) → **`enum`**.
- אם הערך **נשאר פנימי לגמרי בקוד TypeScript** בלי מגע עם DB/JSON חיצוני
  → **union type** מספיק ופשוט יותר.

זו בדיוק הסיבה ש-`Role`, `InstitutionStatus`, `AccountStatus`, `FieldType`
— כולם `enum` (הם ב-DB ובבקשות HTTP), אבל `Action`/`Subject` ב-CASL —
union types (הם רק "שפה פנימית" בין קבצי הקוד).

---
חזרה ל-[`README.md`](README.md).
