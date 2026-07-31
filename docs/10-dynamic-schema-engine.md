# מנוע הסכימה הדינמית — הלב הגמיש של המערכת

זהו החלק המרכזי ביותר ב"סיפור" של Talmyeda: המערכת חייבת לשרת מוסדות
שונים לגמרי (בית ספר, חוג, קורס) בלי לדעת מראש אילו שדות כל אחד מהם
צריך. הפתרון: **לא** מוסיפים שדות ל-DB לכל מוסד — במקום זה, כל מוסד
**מגדיר** את השדות שלו בזמן ריצה.

## שלוש הישויות שמרכיבות את המנוע

```
FieldDefinition   → "מהו השדה" (שם, סוג, הרשאות, האם חובה, האם ניתן לחיפוש/מיון)
FieldOption       → "מה האפשרויות" (רק ל-Select/MultiSelect)
customFields       → "הערך בפועל" — מערך [{k,v}] שיושב על כל Participant/Staff/Group
```

## FieldDefinition

📄 [`src/modules/field-definitions/schemas/field-definition.schema.ts`](../src/modules/field-definitions/schemas/field-definition.schema.ts)

| שדה | הסבר |
|-----|------|
| `entityType` | Participant / Staff / Group (רק אלה נתמכים ב-v1, סעיף 26) |
| `displayName` | השם שהמנהל רואה, ניתן לשינוי |
| `internalKey` | מזהה **קבוע לנצח**, נוצר אוטומטית (`field_<hex אקראי>`), אף פעם לא מוצג למשתמש |
| `fieldType` | Text/LongText/Number/Boolean/Date/DateTime/Select/MultiSelect |
| `required` | האם חובה |
| `permissions` | `{staff:{view,edit}, participant:{view,edit}}` — **אין** מפתח `admin`, כי ADMIN תמיד רואה/עורך הכל (סעיף 21) |
| `displaySettings` | `{showInList, order}` |
| `searchSettings` | `{searchable, filterable, sortable}` |

### למה displayName נפרד מ-internalKey

אם המנהל משנה את שם התצוגה ("טלפון הורה" → "טלפון איש קשר"), הדאטה
שכבר נשמרה **לא** נשברת — כי היא מקושרת ל-`internalKey` היציב, לא לשם
שמוצג. זה בדיוק ההבדל שסעיף 27 באפיון מדגיש.

### שתי בדיקות בטיחות מיוחדות ב-`update()`

📄 [`src/modules/field-definitions/field-definitions.service.ts`](../src/modules/field-definitions/field-definitions.service.ts)

**1. שינוי `required: false → true` (סעיף 31):**
```
המנהל מנסה לסמן שדה כחובה
        ↓
המערכת סופרת כמה רשומות קיימות בלי ערך לשדה הזה
        ↓
אם 0 → משנה מיד
        ↓
אם >0 → חוסמת ומחזירה שגיאה עם המספר, עד שהמנהל:
    (א) שולח שוב עם confirmRequiredChange:true — required יאכף רק על רשומות
        חדשות/עתידיות, ישנות נשארות כמו שהן, או
    (ב) ממלא את הערכים החסרים ידנית קודם ואז שולח שוב — הבדיקה תעבור
        אוטומטית ברגע שהמספר מגיע ל-0
```

**2. שינוי סוג שדה (`fieldType`, סעיף 32):**
```
המנהל מנסה לשנות Text → Number (למשל)
        ↓
המערכת בודקת את כל הערכים הקיימים תחת אותו internalKey בכל הרשומות
        ↓
אם ולו ערך אחד לא תואם את הסוג החדש → כל הבקשה נדחית (INCOMPATIBLE_FIELD_TYPE_CHANGE)
        ↓
אין המרה חלקית/"best effort" — הכל-או-כלום, כמו שסעיף 32 דורש במפורש
```

### מחיקת FieldDefinition (סעיף 82.1)

מחיקה **מותרת** (בניגוד ל-FieldOption). כשמוחקים:
1. ה-FieldDefinition נמחק **מיד** (סינכרוני).
2. ניקוי customFields מכל הרשומות הקיימות (`$pull` להסרת האיבר עם אותו
   `k`) רץ **ברקע** ("fire-and-forget") — הבקשה לא מחכה לו, רק נרשם ללוג
   בסיום. אין עדיין תשתית job queue אמיתית (Bull/Redis) — זו ריצה ברקע
   של אותו תהליך Node, לא job עצמאי אמיתי.

## FieldOption

📄 [`src/modules/field-options/schemas/field-option.schema.ts`](../src/modules/field-options/schemas/field-option.schema.ts)

עבור שדות Select/MultiSelect: `{fieldId, institutionId, label, value, isActive, order}`.

**`institutionId` כפול (denormalized)** — למרות שאפשר להגיע אליו דרך
`fieldId → FieldDefinition → institutionId`, שומרים אותו ישירות גם על
ה-FieldOption. כך שאילתות/guards של בידוד מוסדות **לא תלויות ב-join** —
פשוט מסננים ישירות. מכיוון ש-FieldOption אף פעם לא "עובר" בין שדות, הערך
נקבע פעם אחת ולא צריך סנכרון.

**`DELETE` = disable, לא מחיקה פיזית** (סעיף 34) — אם אופציה כבר בשימוש
ברשומות קיימות, מחיקה פיזית הייתה משאירה ערכים "יתומים". `isActive:false`
פותר את זה — האופציה נעלמת מרשימות חדשות אבל הדאטה הישנה נשארת תקינה.

## DynamicFieldsValidatorService — המקום שבו הכל מתחבר

📄 [`src/modules/dynamic-fields/dynamic-fields-validator.service.ts`](../src/modules/dynamic-fields/dynamic-fields-validator.service.ts)

זה ה-"DynamicValidationPipe" מסעיף 36 באפיון — מומש כשירות injectable
(לא כ-NestJS Pipe class) כדי שיוכל לקבל את סוג הישות ואת התפקיד הפועל
כפרמטרים. נקרא מתוך `ParticipantsService`/`StaffService`/`GroupsService`
בכל create/update.

### כתיבה (write) — `validate()`

```
לכל {k, v} שנשלח ב-customFields:
    1. k קיים כ-internalKey פעיל? אם לא → UNKNOWN_FIELD_KEY (סעיף 37)
    2. לתפקיד יש הרשאת edit לשדה הזה? (ADMIN תמיד כן) אם לא →
       FIELD_EDIT_FORBIDDEN — נדחה, לא נזרק בשקט (החלטה מתועדת: reject
       ולא strip, כדי שכשלי הרשאה יהיו גלויים)
    3. v תואם לסוג של השדה (isValueCompatibleWithType)? אם לא →
       INVALID_FIELD_VALUE

בסוף: כל שדה עם required:true שלא הופיע ב-payload → MISSING_REQUIRED_FIELDS
```

### קריאה (read) — `getViewableKeys()` + `filterByViewableKeys()`

```
getViewableKeys(institutionId, entityType, role):
    ADMIN → מחזיר null ("אין סינון, ראה הכל")
    STAFF/PARTICIPANT → מחזיר Set של internalKeys שמותר לראות
        (שדה בלי FieldDefinition תואם מוסתר כברירת מחדל בטוחה)

filterByViewableKeys(entries, viewableKeys):
    מסנן סינכרוני — entries עם k שלא ב-viewableKeys מוסרים
```

**חשוב לביצועים:** `getViewableKeys` נקרא **פעם אחת לכל בקשה** (גם אם
מחזירים 50 רשומות ב-list) — לא פעם לכל רשומה. זה נמנע מ-N+1 queries.

## Attribute Pattern — למה customFields הוא מערך ולא אובייקט

📄 כל schema רלוונטי (Participant/Staff/Group/RegistrationRequest)

```json
"customFields": [
  { "k": "field_a83kd9", "v": "Jerusalem" },
  { "k": "field_b92ks1", "v": 4 }
]
```

**לא** `{"field_a83kd9": "Jerusalem", ...}`. הסיבה (סעיף 35): MongoDB לא
יכול לבנות אינדקס יעיל על שדות שהמפתחות שלהם משתנים דינמית (כל מוסד עם
שדות שונים). עם מבנה מערך קבוע, אפשר להגדיר **אינדקס מורכב אחד** שמשרת
**כל** שדה דינמי:

```ts
Schema.index({ institutionId: 1, 'customFields.k': 1, 'customFields.v': 1 });
```

זה מונע את הבעיה של "אינדקס נפרד לכל שדה" (ש-MongoDB מגביל את הכמות
שלהם ממילא, סעיף 61).

**תיקון אגבי שבוצע:** גילינו ש-Mongoose הוסיף אוטומטית `_id` לכל איבר
במערך `customFields` (לא חלק מהמבנה הקנוני) — תוקן עם `_id:false` בהגדרת
כל השדות.

## חיפוש/סינון/מיון דינמי (סעיפים 38-40) — כרגע רק ב-Participants

ראו פירוט מלא ב-[`07-participants-staff-groups.md`](07-participants-staff-groups.md#למה-מיון-לפי-שדה-דינמי-דורש-aggregation).

## מסמכים קשורים
- [`06-casl-permissions.md`](06-casl-permissions.md) — איך field-level permissions מתחבר למנוע ה-CASL הכללי
- [`07-participants-staff-groups.md`](07-participants-staff-groups.md) — מי משתמש בכל זה בפועל
