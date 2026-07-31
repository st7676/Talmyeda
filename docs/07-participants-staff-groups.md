# Participants, Staff, Groups — הישויות העסקיות המרכזיות

שלושת המודולים האלה בנויים **באותו דפוס בדיוק** (ראו `02-project-structure.md`),
ושלושתם תומכים ב-`customFields` (סעיף 26: רק Participant/Staff/Group תומכים
בשדות דינמיים ב-v1).

## Participant

📄 [`src/modules/participants/schemas/participant.schema.ts`](../src/modules/participants/schemas/participant.schema.ts) —
`firstName`, `lastName`, `customFields: [{k,v}]`, soft delete. **רק שדות
אוניברסליים** — כל שדה ספציפי-למוסד עובר דרך customFields (סעיף 24.1).

📄 [`src/modules/participants/participants.service.ts`](../src/modules/participants/participants.service.ts) —
המודול המורכב ביותר בפרויקט. חוץ מ-CRUD רגיל, הוא כולל:

- **סינון הקשרי (context-aware)** — ראו `06-casl-permissions.md`.
- **הרשאות שדה** — ולידציה בכתיבה + סינון בקריאה (ראו `10-dynamic-schema-engine.md`).
- **חיפוש/סינון/מיון דינמי** (סעיפים 38-40):
  - `?search=david` → regex על firstName/lastName
  - `?groupId=X` → רק משתתפים פעילים בקבוצה הזו
  - `?filters={"field_x":"Jerusalem"}` → סינון מדויק לפי שדה דינמי (רק אם `filterable`)
  - `?sortBy=field_x&sortDir=asc` → מיון לפי שדה דינמי (רק אם `sortable`) —
    **דורש aggregation pipeline** כי הערך יושב בתוך מערך, לא בשדה עליון
    (הסבר טכני מלא בהמשך הקובץ).

### למה מיון לפי שדה דינמי דורש aggregation

`customFields` הוא מערך `[{k,v}, {k,v}, ...]`. אי אפשר לבקש מ-MongoDB
"תמיין לפי הערך של השדה שמפתחו הוא X" עם `.sort()` רגיל, כי MongoDB לא
יודע **איזה** איבר במערך זה. הפתרון — pipeline של שלבים:

```
$match     → מסנן למסמכים שמתאימים לחיפוש
$addFields → מוסיף שדה זמני __sortValue = הערך (v) של האיבר עם k=השדה המבוקש
$sort      → ממיין לפי __sortValue
$skip/$limit → pagination
$unset     → מסיר את __sortValue הזמני
```

זה בדיוק העלות הארכיטקטונית שסעיף 40 באפיון מזהיר עליה: "an administrator
marking a field sortable is implicitly asking for a more expensive query path".

**⚠️ הערה חשובה:** נכון לכתיבת המסמך הזה, אין עדיין סביבת בדיקות עם
MongoDB אמיתי בפרויקט — ה-pipeline הזה עבר רק בדיקת קומפילציה, לא הורץ
בפועל מול דאטה. ראו PROGRESS.md.

## Staff

📄 [`src/modules/staff/`](../src/modules/staff/) — דומה ל-Participant אבל
פשוט יותר: **כל** הפעולות (כולל read) מוגבלות ל-`@Roles(Role.Admin)` בלבד
(אפיון סעיף 76 לא מזכיר STAFF כמורשה לגשת לרשומות staff אחרות).

## Group

📄 [`src/modules/groups/`](../src/modules/groups/) — ישות **גנרית לגמרי**
(`name` + `customFields`). האפיון מדגיש (סעיף 16): "The system must not
assume that a group means 'class'" — יכולה להיות כיתה, קורס, פעילות,
תוכנית, כל דבר שהמוסד מגדיר. יצירה/עדכון/מחיקה = Admin בלבד, אבל **קריאה
פתוחה לכל תפקיד מאומת** (staff/participant יכולים לראות קבוצות).

## דפוס משותף — `assertExists`

בכל שלושת ה-services יש מתודה `assertExists(id, institutionId)` שמוודאת
שהישות קיימת **ושייכת לאותו מוסד**. זו האכיפה בפועל של סעיף 58.1
("Forbidden: Participant from Institution A references Group from
Institution B") — נקראת ע"י `ParticipantGroupsService`/`StaffGroupsService`
לפני יצירת שיוך.

## מסמכים קשורים
- [`08-group-assignments.md`](08-group-assignments.md) — איך Participant/Staff משתייכים ל-Group
- [`10-dynamic-schema-engine.md`](10-dynamic-schema-engine.md) — customFields לעומק
