# ParticipantGroup ו-StaffGroup — טבלאות שיוך (many-to-many)

## למה בכלל צריך את זה

משתתף יכול להיות בכמה קבוצות בו-זמנית (למשל: כיתה + חוג העשרה + קורס
מיוחד — אפיון סעיף 17). MongoDB (כמו כל DB) לא יכול לבטא "many-to-many"
בתוך שדה אחד — צריך **ישות שיוך נפרדת** שמחזיקה את שני המזהים יחד.

## ParticipantGroup — עם שימור היסטוריה

📄 [`src/modules/participant-groups/schemas/participant-group.schema.ts`](../src/modules/participant-groups/schemas/participant-group.schema.ts)

שדות: `participantId`, `groupId`, `startDate`, `endDate`, `active`.

📄 [`participant-groups.service.ts`](../src/modules/participant-groups/participant-groups.service.ts):

- **`assign`** — יוצר שיוך חדש. קודם מוודא (דרך `assertExists`) ששני
  הצדדים שייכים לאותו מוסד (סעיף 58.1).
- **`deactivate`** (= `DELETE /participant-groups/:id`) — **לא מוחק פיזית!**
  רק מסמן `active:false` + `endDate:now`. זו דרישה מפורשת בסעיף 18:
  "The system should preserve history. Do not permanently delete old
  relationships." — כך אפשר תמיד לדעת שמשתתף **היה** בקבוצה מסוימת בעבר.

**החלטה מתועדת:** v1 לא אוכף ייחודיות בין כמה שיוכים פעילים (`active:true`)
לאותו participant+group בו-זמנית — כפילויות מותרות ומושארות לניהול ידני
של המוסד (סעיף 52 editorial note).

## StaffGroup — פשוט יותר, בלי היסטוריה

📄 [`src/modules/staff-groups/`](../src/modules/staff-groups/)

שדות: `staffId`, `groupId`, `roleDescription`. `DELETE` כאן **כן** מוחק
פיזית — האפיון לא דורש שימור היסטוריה לשיוך צוות (בניגוד למשתתפים).

## למה זה קריטי ל-CASL context-aware (ראו `06-casl-permissions.md`)

השילוב `StaffGroup` + `ParticipantGroup` הוא הבסיס לכל מנגנון "STAFF רואה
רק את המשתתפים בקבוצות שהוא משויך אליהן" (אפיון סעיף 19, 519, 833):

```
StaffGroup: מי אני משויך אליו (אילו קבוצות)
        +
ParticipantGroup: מי נמצא בקבוצות האלה (אילו משתתפים)
        =
הרשימה שה-STAFF הזה מורשה לראות
```

## מסמכים קשורים
- [`07-participants-staff-groups.md`](07-participants-staff-groups.md) — ישויות הבסיס
- [`06-casl-permissions.md`](06-casl-permissions.md) — איך זה מיושם בפועל בסינון
