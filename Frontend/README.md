# Talmyeda Frontend

פרונטנד React + TypeScript + MUI עבור [talmyeda-backend](../talmyeda-backend) —
פלטפורמת SaaS רב-דיירותית לניהול מוסדות חינוך. ארוז גם כאפליקציית דסקטופ (Electron) —
נפתח מאייקון על שולחן העבודה, לא כאתר בדפדפן.

## מה יש כאן

- כניסה למערכת (JWT) + מסך חובת שינוי סיסמה בכניסה ראשונה
- לוח בקרה עם ניווט מותאם לפי תפקיד (ADMIN / STAFF / PARTICIPANT)
- ניהול משתתפים, צוות וקבוצות (CRUD מלא, כולל שדות מותאמים אישית — Dynamic Fields)
- ניהול בקשות הרשמה (אישור/דחייה)
- ניהול הגדרות שדות דינמיים (Field Definitions) ואפשרויות בחירה (Field Options)
- ניהול משתמשי מערכת
- הגדרות מוסד

הממשק כתוב מימין לשמאל (RTL) בעברית.

## הרצה מקומית

```bash
npm install
cp .env.example .env   # ולעדכן VITE_API_URL אם צריך
npm run dev
```

ברירת המחדל: השרת (talmyeda-backend) רץ בכתובת `http://localhost:3000`.

## פקודות

- `npm run dev` — שרת פיתוח (דפדפן, ל-hot reload מהיר בזמן עבודה על הקוד)
- `npm run build` — בדיקת טיפוסים (`tsc -b`) + build לפרודקשן
- `npm run lint` — oxlint
- `npm run preview` — הרצת build לוקאלית
- `npm run electron:dev` — מריץ את האפליקציה כחלון דסקטופ (Electron) מול קוד המקור, עם hot reload
- `npm run electron:build` — בונה קובץ התקנה (`.exe`, NSIS) לתיקיית `release/` — כולל אייקון על שולחן העבודה ותפריט Start

## התקנה כאפליקציית דסקטופ

```bash
npm run electron:build
```

זה מייצר מתקין ב-`release/` (למשל `תלמידה Setup 0.0.0.exe`). הרצת המתקין יוצרת קיצור דרך על
שולחן העבודה ובתפריט ההתחלה — פתיחה כמו כל תוכנה אחרת, לא דרך דפדפן. האפליקציה עדיין מתחברת
לבקאנד דרך הרשת (HTTP רגיל) בדיוק כמו בגרסת הדפדפן — רק החלון עצמו הוא native.
כתובת ה-API נקבעת לפי `VITE_API_URL` **בזמן ה-build**, כך שיש לוודא ש-`.env` מצביע לכתובת
הבקאנד הנכונה (production/staging/local) לפני `electron:build`.

## מבנה

```
electron/
  main.cjs      תהליך ה-Electron הראשי — פותח חלון דסקטופ שטוען את ה-React app
build/
  icon.png      אייקון האפליקציה (מומר אוטומטית ל-.ico ע"י electron-builder)
src/
  api/          קליינט axios + כל קריאות ה-API לפי מודול בבקאנד
  components/   קומפוננטות משותפות (טבלה, עורך שדות דינמיים, דיאלוג אישור, שלד אפליקציה)
  context/      Auth + Notifications (React context)
  hooks/        useFieldDefinitions, useDebouncedValue
  pages/        עמוד לכל מסך/מודול
  types/        טיפוסי TypeScript התואמים לסכימות ה-API של הבקאנד
```

## הערות טכניות

- ה-JWT נשמר ב-`localStorage` ומצורף אוטומטית לכל בקשה דרך axios interceptor.
- כל השדות המותאמים אישית (`customFields`) נשמרים כמערך `{ k, v }` בהתאם ל-Attribute
  Pattern של הבקאנד — ראו `CLAUDE.md` בריפו של הבקאנד.
- `institutionId` אף פעם לא נשלח מהפרונטנד — הוא תמיד נגזר מה-JWT בצד השרת.
- זהו MVP "מהיר ופשוט": אין ניהול state library כבד (Redux/Query) — fetch ישיר בכל עמוד.
  אפשר לשדרג ל-React Query בהמשך אם יידרש קאשינג/סנכרון מתקדם יותר.
