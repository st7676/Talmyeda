# אימות (Auth) וניהול משתמשים (Users)

## ההפרדה הבסיסית: User ≠ Participant/Staff

זה הכלל המחייב ביותר בכל המערכת (אפיון סעיף 7): `User` הוא **רק** אימות —
username, סיסמה (hash), role, וקישורים (`participantId`/`staffId`) לישות
העסקית. שום מידע אישי (שם, טלפון וכו') לא נמצא ב-User. הסיבה: מוסד יכול
להחליט שמשתתף **לא** מקבל חשבון התחברות בכלל (אפיון סעיף 12) — במקרה הזה
יש Participant בלי User מקושר בכלל.

📄 [`src/modules/users/schemas/user.schema.ts`](../src/modules/users/schemas/user.schema.ts)

שדות עיקריים: `institutionId` (null רק ל-SUPER_ADMIN), `username`,
`passwordHash`, `role`, `participantId`/`staffId` (אופציונליים),
`mustChangePassword` (ברירת מחדל `true`), `isDeleted`/`deletedAt` (soft delete).

**אינדקס ייחודי:** `{institutionId, username}` — כלומר username ייחודי
**בתוך מוסד**, לא גלובלית. שני מוסדות שונים יכולים שניהם לקבל משתמש בשם `david`.

## זרימת Login

📄 [`src/modules/auth/auth.service.ts`](../src/modules/auth/auth.service.ts)

```
POST /auth/login {username, password}
        ↓
מוצאים את כל המשתמשים הפעילים עם אותו username (יכולים להיות כמה, במוסדות שונים!)
        ↓
בודקים bcrypt.compare מול כל אחד, עד שנמצאת התאמה
        ↓
אם נמצאה: חותמים JWT עם {sub: userId, institutionId, role}
        ↓
מחזירים {accessToken, mustChangePassword}
```

**החלטה פתוחה מתועדת:** מכיוון שה-login לא כולל מזהה מוסד, ו-username
ייחודי רק בתוך מוסד — הפתרון הנוכחי בודק את **כל** המועמדים. זה trade-off
מתועד (ראו PROGRESS.md) — אולי בעתיד יתווסף שדה מוסד/slug ל-login.

**אבטחה:** אם ה-username לא קיים או הסיסמה שגויה — **אותה שגיאה בדיוק**
(`INVALID_CREDENTIALS`) בשני המקרים, כדי לא לחשוף לתוקף אילו usernames
קיימים במערכת (user enumeration attack).

## JWT — מה בפנים

לפי אפיון סעיף 67, ה-payload מוגבל בכוונה:
```json
{ "sub": "<userId>", "institutionId": "<id-or-null>", "role": "ADMIN" }
```
**בלי** הרשאות מלאות, בלי שדות דינמיים, בלי הגדרות שמשתנות הרבה — כי אלה
היו "מתיישנים" בתוך הטוקן (הטוקן לא מתעדכן עד שמתחברים מחדש).

📄 [`src/modules/auth/strategies/jwt.strategy.ts`](../src/modules/auth/strategies/jwt.strategy.ts) —
מגדיר איך Passport מאמת ומפענח את הטוקן, וממיר את ה-payload ל-`AuthenticatedUser`.

## Guards של האימות

📄 [`src/modules/auth/guards/jwt-auth.guard.ts`](../src/modules/auth/guards/jwt-auth.guard.ts) —
רץ **גלובלית** על כל בקשה. מדלג רק על routes שמסומנים `@Public()`.

📄 [`src/modules/auth/guards/roles.guard.ts`](../src/modules/auth/guards/roles.guard.ts) —
בודק אם התפקיד המאומת נמצא ברשימת `@Roles(...)` של ה-route. זו בדיקה
"גסה וזולה" — הבדיקה העדינה יותר (הרשאה ברמת-ישות ורמת-שדה) קורית ב-CASL,
ראו `06-casl-permissions.md`.

## ניהול משתמשים

📄 [`src/modules/users/users.service.ts`](../src/modules/users/users.service.ts)

- **`createRaw`** — יצירה פנימית "נמוכת-רמה" (בשימוש כשה-InstitutionsService
  יוצר את ה-Admin הראשון בהרשמת מוסד).
- **`create`** — יצירת STAFF/PARTICIPANT ע"י Admin (`POST /users`, אפיון
  סעיף 70). אם לא סופקה סיסמה — נוצרת סיסמה זמנית אקראית (`generateTempPassword`)
  ומוחזרת **פעם אחת בלבד** בתגובת ה-API (אפיון סעיף 70.1). כל משתמש חדש
  מקבל `mustChangePassword: true`.
- **`findActiveByUsername`** — לחיפוש ב-login. **רק** משתמשים עם `status:Active`
  ו-`isDeleted:false` — כך שהשעיית מוסד (`Suspended`) בפועל חוסמת login
  לכל המשתמשים שלו (אפיון סעיף 69.1).
- **`softDelete`** — לא מוחק פיזית, רק `isDeleted:true` + `status:Inactive`.
- **`changePassword`** — דורש את הסיסמה **הנוכחית** (לא מספיק JWT תקף) —
  הגנה מפני session גנוב. `userId` תמיד מגיע מה-JWT של המשתמש עצמו, אף
  פעם לא כפרמטר URL — כל אחד יכול לשנות **רק** את הסיסמה שלו.

## מסמכים קשורים
- [`05-institutions.md`](05-institutions.md) — איך נוצר ה-Admin הראשון בהרשמת מוסד
- [`06-casl-permissions.md`](06-casl-permissions.md) — מה קורה אחרי שהמשתמש מאומת
