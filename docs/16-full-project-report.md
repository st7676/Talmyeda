# דוח מסכם מפורט — בניית מערכת Talmyeda Backend

> נכתב: 2026-08-16. מטרת המסמך: תמונה מלאה, כרונולוגית ומעמיקה, של כל תהליך
> הבנייה עד כה — לרבות הסברי קוד — כדי שמפתחת שלא הייתה מעורבת לאורך הדרך
> תוכל להבין תוך קריאה אחת מה נבנה, למה כך, מה נתגלה בדרך, ומה המצב היום.
>
> מסמך זה **לא מחליף** את [`PROGRESS.md`](../PROGRESS.md) (מקור האמת החי,
> מתעדכן בכל משימה) או את שאר קבצי `docs/` (הסברים ממוקדים לכל מודול) — הוא
> מסכם את כולם למסמך אחד קריא מההתחלה ועד הסוף.

---

## 1. מה זה הפרויקט הזה

**Talmyeda** היא פלטפורמת SaaS **גנרית ורב-דיירותית (multi-tenant)** לניהול
מוסדות חינוך — לא רק "בתי ספר": קורסים, חוגים, מסגרות הכשרה וכל צורה אחרת של
ארגון חינוכי. "גנרית" ו"רב-דיירותית" הן שתי המילים החשובות ביותר להבנת
כל החלטת עיצוב במערכת:

- **גנרית** — המערכת לא "יודעת" מראש אילו שדות מידע רלוונטיים למוסד נתון
  (גיל? מספר טלפון הורה? תעודת זהות? מספר רישיון נהיגה?). לכן נבנה **מנוע
  שדות דינמי** (ראו סעיף 6) שמאפשר לכל מוסד להגדיר לעצמו את השדות שהוא צריך,
  בלי לשנות קוד.
- **רב-דיירותית** — עשרות/מאות מוסדות שונים חולקים את **אותו** מסד נתונים
  ואת **אותו** קוד שרת, אבל כל מוסד רואה ומנהל **רק** את הנתונים שלו. כל
  שאילתה עסקית במערכת מסוננת לפי `institutionId` — זהו הכלל הכי חשוב בכל
  הפרויקט (ראו סעיף 5.2).

הטכנולוגיה: **NestJS + TypeScript** (Backend framework), **MongoDB +
Mongoose** (מסד נתונים + ODM), **JWT** לאימות, **CASL** להרשאות מבוססות-תכונה
(ABAC). כל הפרויקט נבנה על בסיס אפיון Word מפורט (`SPEC.md.DOC`, 105 סעיפים)
שסופק כ"חוזה" מלא לפני תחילת העבודה.

הפרויקט נבנה ע"י **שלוש מפתחות במקביל**, כולן עובדות על אותם קבצים בזמנים
שונים — ולכן מההתחלה הוקם **תהליך עבודה מובנה** (ראו סעיף 3) שמטרתו למנוע
דריסת עבודה אחת של השנייה.

---

## 2. תמונת מצב נוכחית

**~98% מהאפיון (105 סעיפים) מומש ומאומת** (נכון ל-2026-08-15, אחרי סקירת
אפיון מלאה שעברה על כל סעיף מול הקוד בפועל — ראו סעיף 10).

מה שנשאר **אינו** חוסר פונקציונלי — אלו החלטות מוצר פתוחות (למשל: מה קורה
כששדה חובה גם חסום לעריכה ע"י Participant? ראו סעיף 9) וסטיות טקסטואליות
קלות מהאפיון שתועדו ואושרו במכוון (למשל: אין endpoint נפרד `/participants/search`
כי `?search=` כפרמטר על ה-endpoint הרגיל מכסה את אותה דרישה).

**מה כן קיים ועובד, מאומת בפועל (לא רק "כתוב"):**

| תחום | מצב |
|------|-----|
| אימות + הרשאות (Auth, JWT, CASL, field-level permissions) | ✅ מלא |
| Multi-tenant isolation | ✅ מלא, מכוסה בטסטי אבטחה ייעודיים |
| CRUD מלא לכל הישויות (Institution, User, Participant, Staff, Group, RegistrationRequest) | ✅ מלא |
| מנוע שדות דינמי (FieldDefinition/FieldOption, ולידציה, הרשאות שדה) | ✅ מלא |
| חיפוש/סינון/מיון דינמי (כולל aggregation pipeline) | ✅ מלא, על Participants+Staff+Groups |
| Logging | ✅ מלא |
| Docker (הרצה אמיתית, לא רק קבצים) | ✅ מאומת מקצה-לקצה |
| בדיקות אוטומטיות מול MongoDB אמיתי | ✅ 38 טסטים, 7 קבצים |
| תיעוד (docs/, PROGRESS.md) | ✅ מקיף ומתעדכן |

---

## 3. תהליך העבודה — איך שלוש מפתחות עובדות על אותו קוד בלי להתנגש

לפני שורת קוד ראשונה נבנה סקיל (`​.claude/skills/talmyeda-workflow/SKILL.md`)
שמגדיר משמעת עבודה קבועה, וכל סשן פיתוח (כולל כל אחד מהסשנים שתועדו במסמך
הזה) מחויב לפעול לפיו:

1. **קריאת [`PROGRESS.md`](../PROGRESS.md) לפני כל שינוי** — מקור האמת היחיד
   למה כבר בנוי, מה בעבודה כרגע (מסומן `🔧 בעבודה` + שם + תאריך), ומה הבא
   בתור. אף אחת לא מתחילה משימה שכבר מסומנת כ"בעבודה" בלי לתאם.
2. **תיעוד לפני התחלה** — לפני נגיעה בקוד, מוסיפים שורה ל-PROGRESS.md עם
   סטטוס `🔧 בעבודה`, מה בונים, מאיזה סעיף אפיון זה נובע, ואילו קבצים ייגעו.
3. **אימות לפני push** — משימה נחשבת גמורה רק כשהיא **עובדת**:
   ```bash
   npm run build && npm run lint && npm test
   npm run test:integration   # חובה אם נגעו בschema/service/query
   ```
   `npm test` (unit, עם mocks) **לא** מספיק לבדוק באגים אמיתיים מול DB — זה
   בדיוק מה שקרה עם שלושת הבאגים הקריטיים (סעיף 8): כולם נתפסו רק דרך
   `test:integration` (MongoDB אמיתי) או בדיקה ידנית מול Docker, **לא**
   דרך unit tests עם mocks.
4. **דחיפה מלאה עם תיעוד** — עדכון PROGRESS.md לסטטוס `✅ הושלם` + מה נבנה
   ואיך + אילו החלטות אפיון יושמו, ואז commit תיאורי + push.
5. **בטיחות ב-90% טוקנים** — אם סשן מגיע ל-90% מצריכת הטוקנים שלו, הוא
   **עוצר ודוחף מיד**, גם אם המשימה לא הושלמה — מסמן `⏸️ חלקי` ב-PROGRESS.md
   עם פירוט מדויק של מה נעשה/מה נשאר/מאיפה להמשיך, כדי שאף עבודה לא תאבד
   ואף אחת אחרת לא תיתקע בלי הקשר.

**עיקרון-על נוסף שהוקפד עליו לאורך כל הפרויקט:** כל פעם שהתקבלה החלטת
מימוש לא-חד-משמעית מהאפיון (האפיון לא מפרט הכל עד הפרט האחרון — למשל: מה
עושים אם username לא ייחודי גלובלית אלא רק בתוך מוסד?) — ההחלטה **מתועדת
במפורש** בסעיף "החלטות פתוחות" ב-PROGRESS.md, במקום "להמציא" בשקט. נכון
להיום יש שם כ-20 החלטות כאלה, מתועדות עם נימוק.

---

## 4. ארכיטקטורה — התבנית החוזרת בכל מודול

NestJS מארגן קוד ב**מודולים** — כל תחום עסקי (Participants, Staff, Groups
וכו') הוא תיקייה עצמאית תחת `src/modules/` עם אותה תבנית קבועה בכל פעם:

```
src/modules/<שם>/
  schemas/<שם>.schema.ts   ← מבנה הנתונים במונגו (המחלקה + @Prop לכל שדה)
  dto/create-<שם>.dto.ts   ← מה מותר לשלוח ביצירה (עם class-validator)
  dto/update-<שם>.dto.ts   ← גרסה חלקית (הכל אופציונלי) ליצירה
  dto/query-<שם>.dto.ts    ← פרמטרי query ל-GET (עמוד, גודל עמוד, סינון, מיון...)
  <שם>.service.ts          ← הלוגיקה העסקית האמיתית — **כל שאילתה מסוננת institutionId**
  <שם>.controller.ts       ← ה-HTTP routes — דק, רק מתרגם בקשה↔קריאה ל-service
  <שם>.module.ts           ← מחבר הכל ומצהיר מה מיוצא לשאר האפליקציה
```

ברגע שמבינים את התבנית הזו, כל מודול חדש ברור מיידית — כי כולם בנויים אותו
דבר. שכבות ה-**Guards** (מי מורשה בכלל לגשת ל-route?) ו-**Interceptors**
(מה קורה סביב כל בקשה — לוגים, עטיפת תגובה) פועלות **גלובלית**, מוגדרות פעם
אחת ב-`src/app.module.ts`, ולא צריך לחזור עליהן בכל controller.

### מסע בקשת HTTP טיפוסית מקצה לקצה

בקשת `GET /participants?search=דוד&page=1` עוברת כך:

1. **`ThrottlerGuard`** — בודק אם ה-IP הזה חרג ממכסת הבקשות (rate limiting).
2. **`JwtAuthGuard`** — מוודא שיש JWT תקף ב-header `Authorization`, מפענח
   אותו, שם `{userId, role, institutionId}` על `request.user` (חוץ מ-routes
   שסומנו `@Public()`, כמו login/register/הרשמה עצמית).
3. **`MustChangePasswordGuard`** — אם המשתמש חייב להחליף סיסמה (סעיף 70.1),
   חוסם כל route חוץ ממי שסומן `@SkipMustChangePasswordCheck()`.
4. **`RolesGuard`** — בודק אם התפקיד (`role`) של המשתמש מורשה ל-route הזה
   (`@Roles(Role.Admin)` וכו').
5. **`CaslAbilityGuard`** — בודק הרשאה ברמת-ישות עדינה יותר (ABAC) — למשל
   "יכול לקרוא Participant" בהתאם ל-CASL ability שנבנתה מהתפקיד.
6. **`ParticipantsController.findAll()`** — מקבל את הבקשה, שולף `user`
   (דרך `@CurrentUser()`) ו-query params, מעביר ל-Service.
7. **`ParticipantsService.findAll()`** — כאן קורית הלוגיקה העסקית האמיתית:
   בונה פילטר Mongo שמתחיל **תמיד** מ-`{institutionId, isDeleted: false}`,
   מוסיף חיפוש/סינון/מיון (ראו סעיף 6.3), מסנן לפי היקף-קשר (STAFF רואה רק
   קבוצות ששויך אליהן — ראו סעיף 5.3), ומחזיר עמוד תוצאות.
8. **`LoggingInterceptor`** — רושם ללוג method+path+משך זמן+מי ביצע.
9. **`ResponseInterceptor`** — עוטף את התוצאה במעטפת אחידה
   `{success: true, data: {...}}`.
10. אם משהו זרק שגיאה בדרך — **`AllExceptionsFilter`** תופס אותה ומחזיר
    פורמט שגיאה אחיד (`{success: false, error: {code, message}}`).

---

## 5. אימות והרשאות — ארבע שכבות

### 5.1 אימות (Authentication)

- `User` (`src/modules/users/schemas/user.schema.ts`) הוא **אימות בלבד** —
  username + passwordHash (bcrypt) + role + institutionId. **מכוון**: לא
  מכיל פרטים עסקיים (שם, גיל וכו') — אלו חיים ב-`Participant`/`Staff` נפרדים
  (עיקרון "User↔Business separation", אפיון סעיף 7).
- `AuthService.login()` (`src/modules/auth/auth.service.ts`) — מקבל
  username+password, מוצא את כל המשתמשים הפעילים עם אותו username (כי
  username ייחודי רק **בתוך** מוסד, לא גלובלית — החלטה פתוחה מתועדת), מנסה
  `bcrypt.compare` על כל אחד עד שמוצא התאמה, ומחזיר JWT.
- **נעילת חשבון (סעיף 90.1):** 5 ניסיונות כושלים על אותו username → נעילה
  ל-15 דקות. חשבון נעול מדולג ישירות בלי אפילו לנסות bcrypt (מונע בזבוז
  CPU על חשבון שבין כה לא ייכנס).
- **הודעת שגיאה גנרית תמיד** — "Invalid username or password" בין אם
  ה-username שגוי, הסיסמה שגויה, או החשבון נעול — כדי לא לחשוף לתוקף אילו
  usernames קיימים במערכת.

### 5.2 היקף-מוסד (Tenant Scoping) — הכלל שאסור להפר

**כל שאילתה עסקית במערכת מתחילה מ-`institutionId` שמגיע מה-JWT של המשתמש
המאומת — לעולם לא מגוף הבקשה.** יוצא דופן מכוון אחד בלבד: `POST
/registration-requests` (הרשמה עצמית), כי השולח שם **לא מאומת בכלל** (אין לו
JWT) — ומתועד במפורש ב-DTO ולא יוצר סיכון כי הבקשה יוצרת רק רשומת "ממתין
לאישור", לא דאטה עסקית.

כל Service בפרויקט (Participants, Staff, Groups...) מוסיף `institutionId`
**ידנית** לתחילת כל פילטר. זו נקודת סטייה מתועדת מהאפיון (שמתאר
`TenantInterceptor` גלובלי אוטומטי) — Trade-off מכוון: פחות DRY, אבל כל
בדיקת סינון גלויה וקריאה בקוד עצמו של כל Service, לא "קורית איפשהו למעלה".
מכוסה ב-4 טסטי `tenant isolation` ייעודיים (`security.integration-spec.ts`).

### 5.3 CASL — הרשאות ברמת-ישות (ABAC)

**CASL** (`@casl/ability`) בונה, לכל בקשה, "יכולת" (Ability) דינמית מבוססת
זהות המשתמש: תפקיד, מוסד, הקשר. `CaslAbilityFactory`
(`src/modules/casl/casl-ability.factory.ts`) בונה חוקים כמו
`can('read', 'Participant')`/`cannot('update', 'Group')` לפי `Role`.
`CaslAbilityGuard` + דקורטור `@CheckAbility(...)` אוכפים את זה על ה-route.

**מעבר לזה — הרשאה מודעת-הקשר (Context-Aware Relationship Permissions,
סעיף 19/519/833):** STAFF רואה **רק** Participants בקבוצות שהוא משויך אליהן
(`StaffGroup`), כאשר הגדרת המוסד `staffGroupManagementEnabled=true`. זה
**לא** ממומש כחוק CASL רגיל — CASL בפרויקט אחראי רק לרמת-ישות ("יכול/לא
יכול לגעת ב-Participant בכלל"), לא ליחסים דינמיים בין רשומות. הלוגיקה
הזו חיה ב-`ParticipantsService.applyContextScope`/`assertAccessible`,
שמחשבת את קבוצות ה-Staff ואז מסננת את הפילטר לפי חברות פעילה
(`ParticipantGroup.active=true`).

### 5.4 הרשאות ברמת-שדה (Field-Level Permissions)

השכבה העדינה ביותר — לא "מי יכול לגעת ב-Participant" אלא "מי יכול
לקרוא/לכתוב **את השדה הספציפי** `phoneNumber`". זה חלק ממנוע השדות הדינמי —
מוסבר בהרחבה בסעיף 6.4.

---

## 6. מנוע השדות הדינמי — הלב הגמיש של המערכת

### 6.1 הבעיה שהמנוע פותר

מוסד A רוצה לעקוב אחרי "גיל" ו"שם הורה". מוסד B (חוג רובוטיקה למבוגרים)
לא רלוונטי לו "שם הורה" בכלל אלא "רמת ניסיון בתכנות". המערכת לא יכולה
"לדעת" מראש אילו שדות רלוונטיים — לכן `Participant`/`Staff`/`Group` לא
מכילים עמודות קבועות לכל שדה אפשרי. במקום זה:

- כל מוסד מגדיר לעצמו **FieldDefinition** — "יש לי שדה בשם 'גיל', מסוג
  Number, חובה, ניתן למיון".
- כל רשומה עסקית (`Participant` וכו') מכילה מערך `customFields: [{k, v}]` —
  **Attribute Pattern**: `k` הוא מפתח פנימי יציב (`internalKey`, נוצר
  אוטומטית, לא נגיש/ניתן לעריכה למשתמש), ו-`v` הוא הערך בפועל. **לעולם לא**
  אובייקט מקונן כמו `{age: 10}` — כי מבנה כזה לא יכול להיות מאונדקס בצורה
  יעילה ולא ניתן ל-validate גנרית.

### 6.2 FieldDefinition — מה מגדירים

`src/modules/field-definitions/schemas/field-definition.schema.ts` מגדיר לכל
שדה: `displayName` (מוצג למשתמש), `internalKey` (יציב, לא ניתן לשינוי אחרי
יצירה), `fieldType` (Text/LongText/Number/Boolean/Date/DateTime/Select/
MultiSelect), `required`, `permissions` (מטריצת view/edit ל-staff/participant
— ADMIN תמיד מלא), `displaySettings` (סדר תצוגה), ו-`searchSettings`
(searchable/filterable/sortable).

**בדיקות בטיחות בשינוי:** שינוי `fieldType` או הפיכת שדה ל-`required` אחרי
שכבר יש דאטה קיים — עוברים בדיקה מול **כל** הרשומות הקיימות של אותו מוסד +
סוג ישות לפני שהשינוי מתקבל. אם רשומה אחת לא תואמת — כל הבקשה נדחית עם קוד
שגיאה ברור (`INCOMPATIBLE_FIELD_TYPE_CHANGE`/`REQUIRED_CHANGE_NEEDS_CONFIRMATION`).

### 6.3 DynamicFieldsValidatorService — האכיפה בזמן כתיבה

`src/modules/dynamic-fields/dynamic-fields-validator.service.ts` — נקרא בכל
create/update (של Participant/Staff/Group, ומ-2026-08-13 גם ב-`submit()`
של הרשמה עצמית) שנוגע ב-`customFields`. מבצע, בסדר הזה:

1. **דחיית מפתח לא-מוכר** — `k` שלא קיים כ-FieldDefinition פעיל → שגיאה.
2. **בדיקת סוג/תקינות ערך** — לפי `fieldType` (מספר באמת מספר, תאריך באמת
   תאריך, Select/MultiSelect רק מול ערכים פעילים ב-FieldOption).
3. **הרשאת כתיבה** — אם ה-role אינו ADMIN, בודק `permissions.staff.edit`
   או `permissions.participant.edit` לפי התפקיד. **דוחה** (לא "משמיט
   בשקט") ניסיון כתיבה לשדה חסום — כדי שכשל הרשאה יהיה גלוי ללקוח, לא
   "יבלע" בלי הודעה.
4. **אכיפת required** — אם שדה מסומן חובה ולא הופיע במערך שנשלח → שגיאה.

### 6.4 קריאה — סינון ברמת-שדה

`getViewableKeys()`/`filterByViewableKeys()` באותו Service — לכל בקשת GET
(רשימה או רשומה בודדת), מחשבים **פעם אחת** (לא לכל רשומה — מונע N+1) איזה
מפתחות ה-role הנוכחי רשאי **לראות** (`view`), ומסננים כל `customFields`
שמוחזר בהתאם. ADMIN רואה תמיד הכל (מוחזר `null` = "אין סינון").

### 6.5 חיפוש, סינון ומיון דינמי — `DynamicQueryService`

זה החלק הכי מורכב טכנית במנוע כולו. שלוש יכולות שונות על אותו GET endpoint:

- **`?search=טקסט`** — regex `$or` case-insensitive על שדות מערכת (למשל
  firstName/lastName). קלט המשתמש עובר `escapeRegex()`
  (`src/common/utils/regex.util.ts`) כדי שלא יתפרש בטעות כפאטרן regex.
- **`?filters={"field_x":"y"}`** — JSON string ממפה `internalKey → ערך
  מדויק`. הופך ל-`$elemMatch`/`$all` על מערך ה-`customFields` — נאכף **רק**
  אם `searchSettings.filterable=true` על אותו שדה.
- **`?sortBy=&sortDir=`** — אם `sortBy` הוא שדה מערכת (firstName וכו'),
  מיון Mongo רגיל. אם זה `internalKey` של שדה דינמי — **חייב** aggregation
  pipeline, כי הערך יושב בתוך איבר מערך, לא כשדה עליון:
  ```ts
  const pipeline = [
    { $match: matchFilter },
    { $addFields: { __sortValue: { $let: {
        vars: { match: { $first: { $filter: {
          input: '$customFields', as: 'cf',
          cond: { $eq: ['$$cf.k', sortKey] },
        }}}},
        in: '$$match.v',
    }}}},
    { $sort: { __sortValue: direction } },
    { $skip: (page - 1) * limit }, { $limit: limit },
    { $unset: '__sortValue' },
  ];
  ```
  **קריטי:** `.aggregate()` **לא** עובר דרך שכבת ה-cast האוטומטי של Mongoose
  (בניגוד ל-`.find()`) — לכן `institutionId` חייב המרה ידנית מפורשת ל-
  `new Types.ObjectId(...)` **לפני** שהוא נכנס ל-`$match` (ראו באג קריטי #2,
  סעיף 8.2).

הלוגיקה הזו נבנתה תחילה ב-`ParticipantsService` בלבד, ואז (2026-08-13)
חולצה ל-`src/modules/dynamic-fields/dynamic-query.service.ts` — Service
גנרי (`findAll<TDoc>(model, institutionId, entityType, baseFilter, options)`)
שגם `StaffService` וגם `GroupsService` משתמשים בו, כדי לא לשכפל שוב את כלל
ה-cast הידני (וכל לוגיקת ה-filter/sort איתו).

---

## 7. הישויות העסקיות המרכזיות

| ישות | מה זה | נקודות מיוחדות |
|------|-------|-----------------|
| **Institution** | המוסד עצמו | נוצר ב-`register()` יחד עם Admin User + InstitutionSettings בפעולה אחת. מתחיל בסטטוס `Pending`, דורש אישור SUPER_ADMIN (פלטפורמה) ל-`Active`. |
| **InstitutionSettings** | הגדרות תצורה למוסד | `selfRegistrationEnabled`, `staffGroupManagementEnabled`, `participantUserMode` (always/optional/never — האם ליצור User אוטומטית ל-Participant). |
| **Participant** | "תלמיד"/משתתף | ה-entity המרכזי ביותר. תמיכה מלאה ב-search/filter/sort דינמי, group-scoping ל-STAFF, self-scoping ל-role PARTICIPANT (רואה רק את עצמו). |
| **Staff** | איש צוות | CRUD מלא, Admin-only ליצירה/עריכה. |
| **Group** | קיבוץ גנרי (לא בהכרח "כיתה" — יכול להיות חוג, קורס, כל דבר) | CRUD מלא. |
| **ParticipantGroup** | שיוך Participant↔Group, עם **היסטוריה** | לא נמחק פיזית בביטול שיוך — `active=false` + `endDate`, כדי לשמר תיעוד היסטורי. |
| **StaffGroup** | שיוך Staff↔Group | דומה, בסיס להיקף-קשר (סעיף 5.3). |
| **RegistrationRequest** | בקשת הרשמה עצמית ממתינה לאישור | ראו סעיף 7.1. |
| **FieldDefinition/FieldOption** | תשתית מנוע השדות הדינמי | ראו סעיף 6. |
| **User** | אימות בלבד (נפרד מדאטה עסקית) | ראו סעיף 5.1. |

### 7.1 RegistrationRequest — הרשמה עצמית

זרימה: מבקר לא-מאומת שולח `POST /registration-requests` (עם `institutionId`
בגוף הבקשה — היוצא-דופן היחיד לכלל "אף פעם לא institutionId מה-body", ראו
סעיף 5.2) → נוצרת רשומה `Pending` → Admin רואה ברשימה (`GET
/registration-requests`, Admin-only) → מאשר (`POST .../:id/approve`) —
פעולה שיוצרת `Participant` אמיתי מהדאטה שנשלחה, ואופציונלית גם `User` (לפי
`participantUserMode` של המוסד) — או דוחה (`reject`).

**עד 2026-08-13** ה-`submit()` לא הפעיל **בכלל** בדיקת שדות דינמית — מבקר
לא-מאומת יכול היה לשלוח מפתחות לא-מוכרות/ערכים משגויי-סוג/כתיבה לשדות
חסומים, וזה נתפס **רק** מאוחר יותר, בבלבול, כש-Admin ניסה לאשר. תוקן —
פירוט מלא בסעיף 8.3.

---

## 8. שלושת הבאגים הקריטיים — הפרק הכי חשוב לזיכרון

שלושתם משתייכים ל**אותה משפחת באגים**: הגדרת שדה ב-Mongoose שנראית תקינה
ל-TypeScript (מתקמפלת בלי שגיאה!) אבל גורמת ל-Mongoose ליפול **בשקט**
ל-`Mixed` (טיפוס גנרי לא-מטופל) בזמן ריצה — בלי warning, בלי exception.
שלושתם נתפסו **רק** דרך בדיקה אמיתית מול MongoDB (Docker או
`mongodb-memory-server`), **אף פעם לא** דרך unit tests עם mocks. זו הסיבה
שהפרויקט משקיע כל כך הרבה ב-integration tests אמיתיים (סעיף 9).

### 8.1 באג #1 — `Types.ObjectId` במקום `SchemaTypes.ObjectId` (2026-08-10)

**מה נכתב (שגוי):**
```ts
import { Types } from 'mongoose';
@Prop({ type: Types.ObjectId, ref: 'Institution', required: true })
institutionId: Types.ObjectId;
```
`Types.ObjectId` היא **מחלקת ה-BSON ObjectId עצמה** (המשמשת ליצירת instance
בפועל — `new Types.ObjectId('...')`), **לא** `SchemaTypes.ObjectId` שהוא
ה-**SchemaType** ש-Mongoose צריך כדי לדעת את סוג השדה בסכימה. Mongoose לא
זיהה את הערך, נפל בשקט ל-`Mixed`, ואיבד את ה-cast האוטומטי string↔ObjectId.

**איך זה התבטא:** שדה שנכתב עם string (למשל `institutionId` שמגיע מ-JWT,
תמיד string) נשמר כ-string; שדה שנכתב עם ObjectId אמיתי (`institution._id`
בקוד פנימי) נשמר כ-ObjectId — חוסר עקביות שקט. **נתפס** כי `GET
/institutions/me` החזיר `settings: null` אף שהמסמך קיים במסד — כי
`register()` יצר את ה-settings עם ObjectId אמיתי, אבל `getMe()` שאל עם
string מה-JWT → type mismatch → אפס תוצאות. רוב שאר המודולים "עבדו במקרה"
כי כתבו **וגם** קראו עם string בעקביות (שניהם מגיעים מ-JWT).

**תיקון:** בכל 10 קבצי ה-schema בפרויקט, `type: Types.ObjectId` →
`type: SchemaTypes.ObjectId` (עם `import { SchemaTypes } from 'mongoose'`).
`Types.ObjectId` נשאר בשימוש תקין **כטיפוס TypeScript** (`institutionId:
Types.ObjectId | null`) — זה לא קשור לבאג, הבעיה הייתה רק ב-`@Prop({type:...})`.

### 8.2 באג #2 — `.aggregate()` לא עובר cast אוטומטי (2026-08-13)

נתפס **בכתיבה הראשונה** של טסט אוטומטי למיון דינמי (`dynamic-field-sort-
filter.integration-spec.ts`) — לא בבדיקה ידנית הפעם. פירוט מלא בסעיף 6.5.
בקצרה: `.find()`/`.findOne()` עוברים cast אוטומטי string↔ObjectId לפי סוג
השדה בסכימה; **`.aggregate()` לא** — מועבר ישירות ל-MongoDB driver.
`institutionId` string ב-`$match` לא תאם ObjectId מאוחסן → תוצאה **ריקה
לגמרי**. תוקן עם המרה ידנית מפורשת לפני בניית ה-pipeline.

### 8.3 באג #3 — מחלקות מקוננות שלא הפכו ל-Schema אמיתי (2026-08-13)

נתפס תוך כדי כתיבת טסט ל-field-level permissions על RegistrationRequest:
ה-happy-path הכי בסיסי (הרשמה עם שדה רגיל, בלי permissions מפורש) נכשל
עם `403`, אף שברירת המחדל התיעודית היא ש-Participant **כן** יכול לערוך
שדות משלו כברירת מחדל.

**מה נכתב (שגוי):** `field-definition.schema.ts` הגדיר מחלקות מקוננות
(`FieldPermissions`, `DisplaySettings`, `SearchSettings`) עם `@Prop()` על
השדות שלהן — אבל **בלי** `@Schema()` ו**בלי** `SchemaFactory.createForClass()`.
כלומר, מעולם לא הפכו ל-Schema אמיתי:
```ts
// שגוי — FieldPermissions היא מחלקה רגילה, לא Schema:
export class FieldPermissions {
  @Prop({ type: RolePermission, default: () => ({ view: true, edit: false }) })
  staff: RolePermission;
  ...
}
@Prop({ type: FieldPermissions, default: () => ({}) })  // מעביר מחלקה, לא Schema!
permissions: FieldPermissions;
```
`@Prop({ type: FieldPermissions })` העביר את ה-**מחלקה עצמה**, וMongoose לא
מזהה מחלקה בלתי-מוכרת כ-SchemaType חוקי — נפל בשקט ל-`Mixed` (אומת ישירות:
`schema.path('permissions').instance === 'Mixed'`). תחת `Mixed`, אף אחת
מברירות המחדל המקוננות (`participant.edit: true` וכו') **מעולם לא הוחלה**.
`FieldDefinitionsService.create()` שולח תמיד `permissions: dto.permissions
?? {}` — ו-`{}` שנכנס ל-path מסוג `Mixed` בלי schema אמיתי גורם לכל השדה
`permissions` **להיעדר לגמרי** מהמסמך שנשמר (לא even `{}`). כל
FieldDefinition שנוצר בלי permissions מפורש קיבל בפועל "אין הרשאת edit לאף
אחד חוץ מ-ADMIN" — **ההפך הגמור** מברירת המחדל התיעודית.

**תיקון:** כל אחת מ-4 המחלקות המקוננות קיבלה `@Schema({ _id: false })` +
`SchemaFactory.createForClass()` משלה, וה-`@Prop({ type: ... })` בהורה
מפנה עכשיו ל-**Schema** האמיתי שנוצר (`FieldPermissionsSchema` וכו'), לא
למחלקה. סריקת `grep` ממוקדת אחרי התיקון מצאה עוד מופע אחד מאותו דפוס
בדיוק (`RequestedData` ב-`registration-request.schema.ts`) — תוקן באותה
צורה.

**כלל עומד חדש** (נוסף גם ל-`CLAUDE.md`): כל מחלקת TypeScript מקוננת
שמשמשת כ-`@Prop({ type: SomeClass })` **חייבת** `@Schema()` +
`SchemaFactory.createForClass()`, וה-`type:` בהורה **חייב** להצביע על
ה-Schema שנוצר — אחרת נפילה שקטה ל-`Mixed` בלי שום שגיאה.

---

## 9. אסטרטגיית בדיקות — שלוש שכבות

| שכבה | פקודה | מה בודקת | מגבלה |
|------|-------|----------|-------|
| Unit | `npm test` | לוגיקה מבודדת עם mocks | **לא** תופס באגי DB/schema אמיתיים |
| E2E-boot | `npm run test:e2e` | האפליקציה עולה בלי לקרוס | בלי DB אמיתי |
| Integration | `npm run test:integration` | הכל מול **MongoDB אמיתי** | חובה לפני push של שינוי ב-schema/query |

**למה `mongodb-memory-server` ולא Docker לטסטים:** בוחר להריץ MongoDB
אמיתי (לא mock) **בזיכרון**, בלי תלות ב-Docker daemon בזמן ריצת טסטים —
עובד זהה מקומית וב-CI, בלי הבעיות שנתקלנו בהן עם Docker Desktop (סעיף 11).

נכון להיום: **38 טסטי אינטגרציה, 7 קבצים** — כיסוי: רגרסיית באג #1
(Institution↔Settings), שרשרת Group+Participant+ParticipantGroup, אבטחה
(tenant isolation בין 2 מוסדות, גישה לא-מאומתת, RBAC, mustChangePassword),
מיון/סינון דינמי ל-Participants וגם ל-Staff/Groups, ולידציית שדות על
הרשמה עצמית, וחיפוש חופשי ל-Staff/Groups.

**שיטת אימות-הטסט (Regression-proving) שחזרה על עצמה פעמיים בפרויקט:**
כדי לוודא שטסט **באמת** תופס באג ולא "עובר במקרה" — מחזירים את הבאג
זמנית בקוד, מריצים את הטסט, מוודאים שהוא נכשל **בדיוק** בסימפטום הצפוי,
ואז משחזרים את התיקון. שיטה זו אימתה בפועל את כיסוי באג #1 וגם את הגנת
ה-tenant isolation ב-security tests.

---

## 10. Docker וסקירת אפיון מלאה

**Docker** (`Dockerfile` — multi-stage build; `docker-compose.yml` —
backend+mongo+healthcheck+volume) הורץ בפועל, לא רק "נכתב" — `docker
compose up` הורץ עד הסוף מול MongoDB אמיתי, ודרכו נתפס באג #1 (סעיף 8.1)
ואומת תיקון ה-Logging (`docker compose logs`).

**סקירת אפיון מלאה** (2026-08-14): עברתי שוב על **כל 105 הסעיפים** של
האפיון מול הקוד בפועל (לא רק מול PROGRESS.md, כדי לוודא שהתיעוד עצמו לא
"פספס" משהו). מסקנה: ~97-98% מומש. נמצאו ותועדו 3 סטיות קלות
לא-פונקציונליות (endpoint search נפרד/interceptor גלובלי/refresh token —
ראו PROGRESS.md סעיף "החלטות פתוחות") ופריט פונקציונלי אחד שהיה **חסר
בפועל** — `search` ל-Staff/Groups — שהושלם ב-2026-08-15.

---

## 11. אתגר טכני נוסף שתועד — Docker Desktop על Windows

לא באג בקוד, אבל תועד כי חזר על עצמו: Docker Desktop לפעמים לא עולה על
Windows כי ה-WSL distro הפנימי שלו (`docker-desktop`) נתקע במצב `Stopped`.
אבחון: `wsl -l -v`. פתרון: `wsl -d docker-desktop -- echo test` כדי
להעיר אותו ידנית. זו הסיבה הנוספת לבחירה ב-`mongodb-memory-server` לטסטים
האוטומטיים — כדי שהם לעולם לא יהיו תלויים ב-Docker daemon שיכול "לא
לעבוד" סתם כך על מכונת פיתוח.

---

## 12. החלטות פתוחות מרכזיות (תמצית — הרשימה המלאה ב-PROGRESS.md)

- **זיהוי מוסד ב-login:** אין institutionId בבקשת login, רק username+password
  (username ייחודי רק בתוך מוסד) — פותר ע"י ניסיון נגד כל המשתמשים הפעילים
  עם אותו username.
- **`participantUserMode='optional'`:** המנהל המאשר בוחר per-request דרך
  `createUser` בגוף בקשת ה-approve.
- **Edge case פתוח (לא נפתר, דורש החלטת מוצר):** שדה `required:true` **וגם**
  `permissions.participant.edit:false` יחד חוסם הרשמה עצמית לצמיתות — אין
  דרך למשתמש הציבורי למלא שדה חובה שאסור לו לגעת בו.
- **Rate limiting מבוסס-זיכרון:** מתאים לאינסטנס בודד; scale-out ידרוש
  Redis משותף.
- **`DynamicValidationPipe` — reject ולא strip:** האפיון מציע "strip or
  reject"; נבחר **reject** (שגיאה חוזרת ללקוח) במקום השמטה שקטה של הערך.

---

## 13. ציר זמן מלא (מהמשימה הראשונה עד היום)

| תאריך | מה נבנה |
|-------|---------|
| 2026-07-24 | סקיל שיטת עבודה, תשתית `common/`, Auth/Users/Institution בסיסי |
| 2026-07-24 | CASL, Groups, Participants (+group/self scoping), Staff, ParticipantGroup, StaffGroup |
| 2026-07-26 | RegistrationRequest — submit ציבורי + list/approve/reject ל-Admin |
| 2026-07-27 | FieldDefinition + FieldOption CRUD מלא, בדיקות בטיחות לשינוי סכימה |
| 2026-07-27 | DynamicValidationPipe (ולידציה בכתיבה) |
| 2026-07-27 | Field-level READ permissions |
| 2026-07-27 | Dynamic search/filter/sort ל-Participants (טרם נבדק מול DB אמיתי) |
| 2026-07-27 | תיעוד `docs/` — 11 קבצים ראשונים |
| 2026-07-27 | תיעוד מורחב — 4 קבצים נוספים (walkthrough שורה-שורה) |
| 2026-07-27 | אימות מ-clone נקי + תיקון חולשת אבטחה (`brace-expansion`) |
| 2026-08-03 | אכיפת mustChangePassword בפועל + Rate limiting |
| 2026-08-03 | תיקון חולשת אבטחה נוספת (`fast-uri`) + אימות clone-נקי חוזר |
| 2026-08-10 | Docker מלא, הרצה בפועל — **תפס באג קריטי #1** |
| 2026-08-10 | Integration tests אוטומטיים ראשונים (5 טסטים) |
| 2026-08-10 | Security integration tests (9 טסטים — tenant isolation/RBAC/mustChangePassword) |
| 2026-08-13 | Integration tests למיון דינמי — **תפס באג קריטי #2** |
| 2026-08-13 | Logging מובנה (`LoggingInterceptor` + לוג login) |
| 2026-08-13 | Dynamic search/filter/sort הורחב ל-Staff+Groups; `DynamicQueryService` משותף |
| 2026-08-13 | Field-level permissions על RegistrationRequest — **תפס באג קריטי #3** |
| 2026-08-14 | סקירת אפיון מלאה — 105/105 סעיפים, ~97% מומש |
| 2026-08-15 | `search` חופשי הורחב ל-Staff/Groups — הפריט הפעיל האחרון מהסקירה |

---

## 14. איפה למצוא עוד

- [`PROGRESS.md`](../PROGRESS.md) — מקור האמת החי: טבלאות סטטוס לכל תחום,
  שלושת הבאגים הקריטיים בפירוט מלא, ~20 החלטות פתוחות, יומן דחיפות מלא.
- [`docs/README.md`](README.md) — אינדקס ל-15 קבצי הסבר ממוקדים (מודול
  אחר מודול, כולל הסברי קוד שורה-שורה ל-common/auth/users, הסבר Docker
  מהיסוד, ומילון מונחים).
- [`CLAUDE.md`](../CLAUDE.md) — נקודת הכניסה: עקרונות שאסור להפר, כולל
  שלושת הכללים העומדים שנוספו בעקבות הבאגים הקריטיים.
- `.claude/skills/talmyeda-workflow/SKILL.md` — תהליך העבודה המחייב (סעיף 3
  כאן הוא תמצית שלו).
