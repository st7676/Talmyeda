# RegistrationRequest — הרשמה עצמית

## הרעיון: לא כל מי שנרשם הופך אוטומטית למשתתף

אפיון סעיף 13: "A participant who registers himself is NOT immediately
added to the active system." מישהו שרוצה להצטרף למוסד שולח בקשה, שממתינה
לאישור מנהל לפני שהיא הופכת ל-Participant אמיתי.

## החריג היחיד בכל הפרויקט: institutionId מגיע מה-body

בכל שאר המערכת, `institutionId` **תמיד** מגיע מה-JWT (ראו `01-how-it-works.md`).
כאן זה **לא אפשרי** — השולח **עדיין לא קיים במערכת בכלל**, אין לו JWT.
לכן `SubmitRegistrationRequestDto` כן כולל `institutionId` בגוף הבקשה —
חריג מכוון ומתועד (לא באג!). ה-endpoint הזה יוצר **רק** רשומת Pending,
לא נוגע בדאטה עסקית — לכן הסיכון מוגבל.

📄 [`src/modules/registration-requests/dto/submit-registration-request.dto.ts`](../src/modules/registration-requests/dto/submit-registration-request.dto.ts)

## הזרימה המלאה

📄 [`src/modules/registration-requests/registration-requests.service.ts`](../src/modules/registration-requests/registration-requests.service.ts)

```
POST /registration-requests (ציבורי, בלי אימות) {institutionId, firstName, lastName, customFields?}
        ↓
בדיקות: המוסד קיים וב-Active? selfRegistrationEnabled דלוק?
        ↓
נוצרת RegistrationRequest בסטטוס Pending
        ↓
(אין בדיקת כפילויות — סעיף 13.1 אומר במפורש: v1 לא עושה dedup אוטומטי)

--- מאוחר יותר, מנהל בודק ---

GET /registration-requests (Admin) — רשימת בקשות ממתינות
        ↓
POST /:id/approve (Admin):
    1. יוצר Participant אמיתי (מעתיק firstName/lastName/customFields)
    2. בודק participantUserMode:
       - 'always' → תמיד יוצר User
       - 'never' → אף פעם לא
       - 'optional' → לפי dto.createUser (ברירת מחדל false)
    3. אם נוצר User — מייצר username אוטומטי (firstName.lastName.<סיומת>)
       וסיסמה זמנית שמוחזרת פעם אחת
    4. מסמן את הבקשה Approved

POST /:id/reject (Admin):
    רק מסמן Rejected — שום Participant/User לא נוצר
```

## נקודה חשובה: אימות דו-שכבתי של customFields

כשמאשרים בקשה, `RegistrationRequestsService.approve` קורא ל-
`ParticipantsService.create` הרגיל — כלומר ה-`customFields` שהוגשו על ידי
מבקש **לא-מאומת ולא-מהימן** עוברים עכשיו את אותה ולידציה מלאה (unknown
key / type / required) שכל Participant אחר עובר. זו הגנה טובה: גם אם
מישהו שלח דאטה שגויה בטופס ההרשמה, זה ייתפס בשלב האישור ולא ייכנס
למערכת כ-Participant תקין. (ראו `10-dynamic-schema-engine.md`.)

## מסמכים קשורים
- [`10-dynamic-schema-engine.md`](10-dynamic-schema-engine.md) — הולידציה שרצה על customFields באישור
- [`05-institutions.md`](05-institutions.md) — `selfRegistrationEnabled`, `participantUserMode`
