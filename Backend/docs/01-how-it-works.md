# איך המערכת עובדת — תמונה כללית

## מה זה בכלל הפרויקט הזה

Talmyeda הוא **שרת API** (backend) — אין לו ממשק גרפי משלו. תפקידו לקבל בקשות
HTTP (מאפליקציית פרונט-אנד עתידית, מ-Postman, מכל קליינט), לבדוק הרשאות,
לשמור/לשלוף נתונים ב-MongoDB, ולהחזיר תשובה בפורמט JSON.

**הטכנולוגיות המרכזיות:**
- **Node.js + TypeScript** — שפת התכנות. TypeScript הוא JavaScript עם טיפוסים
  (types) — כך שגיאות רבות נתפסות **לפני** שהקוד בכלל רץ, בזמן הקומפילציה.
- **NestJS** — framework שמארגן את הקוד למודולים, עם Dependency Injection
  (הזרקת תלויות) מובנית — ראו הסבר בהמשך.
- **MongoDB** — מסד נתונים "NoSQL" שמאחסן מסמכים (documents) בפורמט דמוי-JSON,
  לא טבלאות עם עמודות קבועות כמו SQL. זה מתאים במיוחד לפרויקט הזה כי הוא צריך
  **סכימה גמישה** (כל מוסד יכול להגדיר שדות משלו — ראו `10-dynamic-schema-engine.md`).
- **Mongoose** — ספרייה ש"מתווכת" בין הקוד ל-MongoDB, ומאפשרת להגדיר סכימות
  (schemas) גם למסד נתונים "בלי סכימה" מטבעו.

## מה זה Dependency Injection (DI) — המנגנון שחוזר בכל קובץ

זה אולי הרעיון הכי חשוב להבין ב-NestJS. במקום שקלאס ייצור בעצמו את התלויות שלו:

```ts
// ❌ בלי DI — הקלאס יוצר את התלות שלו בעצמו
class AuthService {
  constructor() {
    this.usersService = new UsersService(); // תלות "קשיחה"
  }
}
```

ב-NestJS עושים:

```ts
// ✅ עם DI — מישהו אחר "מזריק" את התלות
@Injectable()
class AuthService {
  constructor(private readonly usersService: UsersService) {}
}
```

NestJS **בעצמו** דואג ליצור מופע (instance) של `UsersService` ולהעביר אותו
ל-`AuthService` כשהוא נוצר. היתרון: אפשר להחליף תלויות בקלות (למשל בבדיקות —
tests — אפשר "להזריק" גרסת mock במקום השירות האמיתי), והקוד לא צריך לדעת
**איך** ליצור את התלויות שלו, רק **מה** הוא צריך.

כל קלאס עם `@Injectable()` נרשם ב"מיכל" (container) של NestJS, וכל `@Module()`
מגדיר אילו קלאסים זמינים לאילו מודולים אחרים (דרך `imports`/`exports`).

## זרימת בקשה טיפוסית — מקצה לקצה

נניח מנהל מוסד שולח `GET /participants?search=david`. הנה מה שקורה בפועל,
שלב אחר שלב (זה בדיוק תרשים הזרימה מסעיף 64 באפיון):

```
1. הבקשה מגיעה ל-main.ts (הכניסה לאפליקציה)
   ↓
2. ValidationPipe הגלובלי בודק שגוף הבקשה/query תואם ל-DTO
   ↓
3. JwtAuthGuard (גלובלי) — בודק את ה-Bearer token, מצמיד את המשתמש ל-request
   ↓
4. RolesGuard (גלובלי) — בודק אם התפקיד מורשה ל-route הזה (@Roles)
   ↓
5. CaslAbilityGuard (גלובלי) — בודק הרשאה ברמת-ישות (@CheckAbility)
   ↓
6. ה-Controller (ParticipantsController.findAll) מקבל את הבקשה
   ↓
7. מעביר ל-Service (ParticipantsService.findAll) — כאן כל הלוגיקה האמיתית:
   - סינון institutionId (מה-JWT, לא מהבקשה!)
   - חיפוש/סינון/מיון
   - הרשאות ברמת-שדה (הסתרת customFields שאין הרשאת view)
   - שאילתה ל-MongoDB דרך Mongoose
   ↓
8. ה-Service מחזיר תוצאה ל-Controller
   ↓
9. ResponseInterceptor (גלובלי) עוטף את זה ב-{success:true, data:...}
   ↓
10. אם קרתה שגיאה בכל שלב — AllExceptionsFilter (גלובלי) תופס אותה
    וממיר ל-{success:false, error:{code, message}}
```

כל השלבים "הגלובליים" (2, 3, 4, 5, 9, 10) **רצים אוטומטית על כל בקשה** —
מוגדרים פעם אחת ב-[`src/app.module.ts`](../src/app.module.ts) ולא צריך
להוסיף אותם ידנית בכל controller.

## המבנה הרב-דיירותי (Multi-Tenant) — העיקרון החשוב ביותר

המערכת משרתת **הרבה מוסדות שונים** על אותו שרת ואותו מסד נתונים. חובה
להבטיח שמוסד A **לעולם** לא רואה נתונים של מוסד B. הכלל: כל מסמך עסקי
(Participant, Staff, Group וכו') מכיל שדה `institutionId`, וכל שאילתה
חייבת לסנן לפיו:

```ts
this.participantModel.find({ institutionId, isDeleted: false })
```

**מאיפה מגיע ה-`institutionId`?** תמיד מה-JWT (Token) של המשתמש המאומת —
**אף פעם** לא מגוף הבקשה שהקליינט שולח. אחרת, משתמש זדוני היה יכול פשוט
לשלוח `{institutionId: "מוסד-של-מישהו-אחר"}` ולגנוב מידע. יש קובץ ייעודי
(`@CurrentUser()` decorator) שאחראי על זה — ראו `03-common-infrastructure.md`.

## איפה רואים את כל זה בקוד

- נקודת הכניסה: [`src/main.ts`](../src/main.ts)
- החיווט הגלובלי (guards/interceptors/filters + כל המודולים): [`src/app.module.ts`](../src/app.module.ts)
- הגדרות סביבה (`.env`): [`src/config/configuration.ts`](../src/config/configuration.ts), [`src/config/env.validation.ts`](../src/config/env.validation.ts)
