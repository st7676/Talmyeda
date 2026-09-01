# תיעוד פרויקט Talmyeda Backend

תיקייה זו מסבירה **איך הפרויקט עובד** — מהתשתית הכללית ועד לכל מודול בנפרד — למי
שרוצה להבין את הקוד לעומק בלי לחפור בקובץ-קובץ מהתחלה.

> לפני שינויים בקוד — קראו קודם את [`.claude/skills/talmyeda-workflow/SKILL.md`](../.claude/skills/talmyeda-workflow/SKILL.md)
> ואת [`PROGRESS.md`](../PROGRESS.md) (מצב עדכני, מה בעבודה, מה נשאר).
> האפיון המלא: [`SPEC.md.DOC`](../SPEC.md.DOC).

## סדר קריאה מומלץ

| # | קובץ | על מה זה |
|---|------|----------|
| 1 | [`01-how-it-works.md`](01-how-it-works.md) | תמונה כללית: מה זה NestJS, איך בקשה HTTP עוברת דרך המערכת מקצה לקצה |
| 2 | [`02-project-structure.md`](02-project-structure.md) | מבנה התיקיות, דפוס המודול החוזר, איך מודולים מתחברים |
| 3 | [`03-common-infrastructure.md`](03-common-infrastructure.md) | `src/common/` — enums, decorators, guards גלובליים, טיפול בשגיאות |
| 4 | [`04-auth-and-users.md`](04-auth-and-users.md) | התחברות, JWT, ניהול משתמשים, סיסמאות |
| 5 | [`05-institutions.md`](05-institutions.md) | רישום מוסד, הגדרות, אישור/השעיה ע"י SUPER_ADMIN |
| 6 | [`06-casl-permissions.md`](06-casl-permissions.md) | מנוע ההרשאות (ABAC) — מי מותר לו לעשות מה |
| 7 | [`07-participants-staff-groups.md`](07-participants-staff-groups.md) | Participants, Staff, Groups — הישויות העסקיות המרכזיות |
| 8 | [`08-group-assignments.md`](08-group-assignments.md) | שיוך משתתפים/צוות לקבוצות |
| 9 | [`09-registration-requests.md`](09-registration-requests.md) | הרשמה עצמית ואישור מנהל |
| 10 | [`10-dynamic-schema-engine.md`](10-dynamic-schema-engine.md) | שדות דינמיים (FieldDefinition/FieldOption) — הלב של הגמישות במערכת |
| 11 | [`11-glossary.md`](11-glossary.md) | מילון מונחים למי שפחות מכיר: Docker, JWT, DTO, Guard ועוד |

## העמקה נוספת — תמלול מורחב מהצ'אט

הקבצים הבאים הם **גרסה מלאה ומפורטת יותר** (כולל דוגמאות קוד עם מספרי
שורות) של חלק מהנושאים למעלה — במקור נכתבו כמענה לשאלות "הסבר שורה
שורה" ו"הסבר מורחב" בצ'אט הפיתוח, ונשמרו כאן כדי שלא יאבדו בהיסטוריית
הצ'אט:

| # | קובץ | על מה זה |
|---|------|----------|
| 12 | [`12-code-walkthrough-common.md`](12-code-walkthrough-common.md) | `src/common/` שורה-שורה: כל enum, interface, decorator, filter, util |
| 13 | [`13-code-walkthrough-auth-users.md`](13-code-walkthrough-auth-users.md) | Auth ו-Users שורה-שורה: JWT strategy, guards, service, controller |
| 14 | [`14-docker-explained.md`](14-docker-explained.md) | Docker מהיסוד: container מול VM, image מול container, Dockerfile, docker-compose, volumes |
| 15 | [`15-enum-vs-union-types.md`](15-enum-vs-union-types.md) | TypeScript: מתי `enum` ומתי union type, ולמה זה משנה ב-runtime |

## דוח מסכם — למי שרוצה תמונה מלאה במסמך אחד

| # | קובץ | על מה זה |
|---|------|----------|
| 16 | [`16-full-project-report.md`](16-full-project-report.md) | **דוח מסכם מפורט** — כל תהליך הבנייה מההתחלה עד היום במסמך אחד: ארכיטקטורה, תהליך העבודה, מנוע השדות הדינמי, שלושת הבאגים הקריטיים בפירוט, אסטרטגיית בדיקות, ציר זמן מלא. מתאים למי שלא הייתה מעורבת ורוצה תמונה שלמה בלי לקפוץ בין קבצים. זמין גם כ-Word (`16-full-project-report.docx`). |

## עקרון-על שכדאי לזכור תוך כדי קריאה

כל מודול בפרויקט בנוי **באותה תבנית קבועה**:

```
schemas/xxx.schema.ts   → מבנה הנתונים ב-MongoDB
dto/create-xxx.dto.ts   → מה מותר לשלוח ביצירה (עם ולידציה)
dto/update-xxx.dto.ts   → גרסה חלקית של ה-create (הכל אופציונלי)
xxx.service.ts          → הלוגיקה העסקית האמיתית — כל שאילתה מסוננת institutionId!
xxx.controller.ts       → ה-HTTP routes, דק, רק מעביר ל-service
xxx.module.ts           → מחבר הכל ומגדיר מה מיוצא לשאר האפליקציה
```

ברגע שמבינים את התבנית הזו, קל להתמצא בכל מודול חדש — כי כולם בנויים אותו דבר.
