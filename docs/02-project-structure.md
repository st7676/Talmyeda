# מבנה הפרויקט

## עץ התיקיות המלא (מה שרלוונטי)

```
talmyeda-backend/
├── .claude/skills/talmyeda-workflow/SKILL.md   ← שיטת העבודה של הצוות (חובה לקרוא!)
├── PROGRESS.md                                  ← מצב התקדמות חי, מה נעשה ומה נשאר
├── CLAUDE.md                                    ← כללי הברזל של הפרויקט
├── SPEC.md.DOC                                  ← האפיון המלא (מסמך Word)
├── docs/                                        ← אתם כאן :)
├── src/
│   ├── main.ts                                  ← נקודת הכניסה
│   ├── app.module.ts                            ← מודול השורש, מחבר הכל
│   ├── app.controller.ts / app.service.ts       ← health check בסיסי
│   ├── config/                                  ← קונפיגורציית סביבה
│   ├── database/                                ← חיבור MongoDB
│   ├── common/                                  ← תשתית משותפת לכל המודולים
│   └── modules/                                 ← כל המודולים העסקיים
│       ├── auth/
│       ├── users/
│       ├── institutions/
│       ├── casl/
│       ├── groups/
│       ├── participants/
│       ├── staff/
│       ├── participant-groups/
│       ├── staff-groups/
│       ├── registration-requests/
│       ├── field-definitions/
│       ├── field-options/
│       └── dynamic-fields/
└── test/                                        ← בדיקות e2e
```

## דפוס המודול (חוזר בכל תיקייה תחת `modules/`)

```
modules/participants/
├── schemas/
│   └── participant.schema.ts     מבנה הנתונים ב-MongoDB (Mongoose schema)
├── dto/
│   ├── create-participant.dto.ts מה מותר לשלוח ב-POST, עם ולידציה
│   ├── update-participant.dto.ts גרסה חלקית (PartialType) של ה-create
│   └── query-participants.dto.ts פרמטרים מותרים ב-GET (page, search, filters...)
├── participants.service.ts       הלוגיקה העסקית — היחיד שנוגע ב-DB
├── participants.controller.ts    ה-HTTP routes, דק, מעביר הכל ל-service
└── participants.module.ts        מגדיר imports/providers/exports של המודול
```

**כלל אצבע:** אם רוצים להבין "מה קורה כשמישהו קורא ל-API הזה" — תמיד
מתחילים ב-`xxx.controller.ts` (רואים את ה-route ואת ה-guards), ואז עוברים
ל-`xxx.service.ts` (שם הלוגיקה האמיתית).

## איך מודולים "מדברים" ביניהם

ב-NestJS, מודול לא יכול פשוט לייבא קלאס ממודול אחר — צריך:

1. המודול המספק (למשל `UsersModule`) חייב **לייצא** את השירות:
   ```ts
   @Module({
     providers: [UsersService],
     exports: [UsersService],   // ← בלי זה, אף אחד אחר לא יכול להשתמש בו
   })
   ```
2. המודול הצרכן (למשל `AuthModule`) חייב **לייבא** את המודול המספק:
   ```ts
   @Module({
     imports: [UsersModule],    // ← עכשיו אפשר להזריק UsersService
   })
   ```

### תלות מעגלית (circular dependency) — למה נזהרים מזה

אם מודול A מייבא את מודול B, ומודול B מייבא בחזרה את מודול A — NestJS
נתקע (או זורק שגיאה). זה קורה בקלות במערכת עם הרבה קשרי-גומלין (כמו
Participant↔Group↔ParticipantGroup). **הפתרון שנבחר בפרויקט הזה:** כשמודול
צריך רק לגשת ל-**סכימה** (schema) של ישות ממודול אחר (לא ללוגיקה העסקית
שלו), הוא נרשם ישירות ל-schema דרך `MongooseModule.forFeature([...])
במקום לייבא את המודול השני כולו. זה בטוח לגמרי כי NestJS/Mongoose מזהים
רישום כפול של אותה סכימה ולא יוצרים אותה פעמיים (ראו קוד ב-
`mongoose.providers.js` של הספרייה עצמה). כך `ParticipantsModule` יכול
"לדעת" על ה-schema של `StaffGroup` בלי לייבא את כל `StaffGroupsModule`
ולסכן מעגל.

דוגמה קונקרטית מהקוד: [`participants.module.ts`](../src/modules/participants/participants.module.ts)
רושם את הסכימות של `ParticipantGroup` ו-`StaffGroup` ישירות, לא מייבא את
המודולים המלאים שלהם.

## Guards, Interceptors, Filters — שלושת סוגי "האמצע"

NestJS מאפשר לחבר קוד שרץ **סביב** ה-controller, בלי לגעת בו:

| סוג | מתי רץ | תפקיד בפרויקט |
|-----|--------|----------------|
| **Guard** | לפני ה-handler | להחליט "מותר/אסור" (`JwtAuthGuard`, `RolesGuard`, `CaslAbilityGuard`) |
| **Pipe** | לפני ה-handler, אחרי ה-guards | לבצע טרנספורמציה/ולידציה על הקלט (`ValidationPipe` הגלובלי) |
| **Interceptor** | לפני **וגם** אחרי ה-handler | לעטוף/לשנות את הפלט (`ResponseInterceptor`) |
| **Filter** | רק כשיש שגיאה | לתפוס שגיאות ולהמיר לפורמט אחיד (`AllExceptionsFilter`) |

כולם רשומים **גלובלית** ב-[`app.module.ts`](../src/app.module.ts) עם
`APP_GUARD`/`APP_INTERCEPTOR`/`APP_FILTER` — כך שרצים אוטומטית על כל
route בלי צורך לחבר אותם ידנית בכל controller.

## מסמכים קשורים
- [`03-common-infrastructure.md`](03-common-infrastructure.md) — פירוט מלא של כל קובץ ב-`common/`
