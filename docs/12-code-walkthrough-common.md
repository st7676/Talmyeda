# הסבר שורה-שורה — `src/common/`

זהו העתק מורחב של הסברים שניתנו בצ'אט הפיתוח, שורה אחר שורה, לכל קובץ
בתשתית המשותפת. לתמצית קצרה יותר ראו [`03-common-infrastructure.md`](03-common-infrastructure.md).

---

## `common/enums/role.enum.ts`

```ts
1  /**
2   * User roles. Spec sections 8, 302.
3   * The three institution-scoped roles plus the platform-level SUPER_ADMIN,
4   * which is NOT scoped by institutionId (section 69.1, 302).
5   */
6  export enum Role {
7    SuperAdmin = 'SUPER_ADMIN',
8    Admin = 'ADMIN',
9    Staff = 'STAFF',
10   Participant = 'PARTICIPANT',
11 }
```

- **שורות 1-5:** תיעוד JSDoc — כל קובץ בפרויקט מתחיל בהערה שמצליבה לסעיף באפיון. זו לא סתם תרבות טובה — היא חלק מהסקיל: כל החלטה חייבת להיות ניתנת למעקב חזרה למקור.
- **שורה 6:** `enum Role` — TypeScript enum רגיל. בחרתי ב-enum ולא ב-union type string (`'ADMIN'|'STAFF'|...`) כי enum נותן גם ערך runtime (אפשר לבדוק `role === Role.Admin`) וגם אכיפת טיפוסים בזמן קומפילציה. (הרחבה מלאה על ההבדל: [`15-enum-vs-union-types.md`](15-enum-vs-union-types.md))
- **שורה 7:** `SuperAdmin = 'SUPER_ADMIN'` — המפתח ב-TS הוא `SuperAdmin` (camelCase לפי קונבנציית TS), אבל **הערך** שנשמר ב-DB ומוחזר ב-API הוא `'SUPER_ADMIN'` (עם קו תחתון, כמו שהאפיון כותב אותו). בקוד כותבים `Role.SuperAdmin`, אבל ב-JSON/DB רואים תמיד `"SUPER_ADMIN"`.
- **שורות 8-10:** אותו דבר לשלושת שאר התפקידים מסעיף 8 באפיון.

## `common/enums/status.enum.ts`

```ts
1  /** Institution lifecycle status. Spec sections 6.1, 46, 69.1. */
2  export enum InstitutionStatus {
3    Pending = 'Pending',
4    Active = 'Active',
5    Suspended = 'Suspended',
6    Rejected = 'Rejected',
7  }
```

- **שורות 2-7:** ארבעת המצבים שמוסד יכול להיות בהם. `Pending`/`Active`/`Suspended` מוזכרים במפורש בסעיף 6.1 באפיון, אבל **`Rejected` הוספתי בעצמי** כי סעיף 69.1 מתאר endpoint `POST /platform/institutions/:id/reject` שדורש איזשהו status סופי למוסד שנדחה — האפיון לא מציין את שם המצב במפורש, אז זו החלטת מימוש שלי.

```ts
9   /** Generic account status for User records. Spec section 48. */
10  export enum AccountStatus {
11    Active = 'Active',
12    Inactive = 'Inactive',
13    Rejected = 'Rejected',
14  }
```

- זה **enum נפרד** מ-`InstitutionStatus` בכוונה — status של Institution ו-status של User הם שני דברים שונים לגמרי, גם אם חלק מהערכים דומים. לא רציתי enum משותף "כללי מדי" ששני דברים לא קשורים ישתמשו בו, כי זה יוצר צימוד מלאכותי.
- **שורה 12:** `Inactive` משמש ב-soft delete של User (סעיף 59, 70) — כשמוחקים "רכה" משתמש, אני משנה גם את ה-status ל-`Inactive` (בנוסף ל-`isDeleted:true`), כדי שגם אם מישהו שוכח לסנן `isDeleted`, ה-status עדיין חוסם login.

## `common/enums/field-type.enum.ts`

```ts
1  /** Dynamic field data types supported in v1. Spec section 28. */
2  export enum FieldType {
3    Text = 'Text',
4    LongText = 'LongText',
5    Number = 'Number',
6    Boolean = 'Boolean',
7    Date = 'Date',
8    DateTime = 'DateTime',
9    Select = 'Select',
10   MultiSelect = 'MultiSelect',
11 }
```

- **שורות 2-10:** העתקה מדויקת של טבלת סוגי השדות מסעיף 28 באפיון. שמונה סוגים, בדיוק כמו שכתוב.

```ts
13  /** Entities that support dynamic FieldDefinitions in v1. Spec section 26 note. */
14  export enum FieldEntityType {
15    Participant = 'Participant',
16    Staff = 'Staff',
17    Group = 'Group',
18  }
```

- זה מגיע ישירות מההערה העריכתית בסעיף 26: "v1 supports dynamic fields (FieldDefinition) for entityType = Participant, Staff, and Group only." שלושה בלבד — לא Institution, לא User, לא RegistrationRequest.

## `common/enums/index.ts` — קובץ "ברצדת" (barrel file)

```ts
1  export * from './role.enum';
2  export * from './status.enum';
3  export * from './field-type.enum';
```

- זה pattern שחוזר על עצמו בכל תיקייה בפרויקט. במקום שכל קובץ אחר יעשה `import { Role } from '../../common/enums/role.enum'`, אפשר לכתוב פשוט `import { Role } from '../../common/enums'` — ה-`index.ts` "מאסוף" הכל למקום אחד. חוסך import ארוכים ומאפשר לפצל/למזג קבצים פנימיים בלי לשבור imports בשאר הפרויקט.

## `common/interfaces/authenticated-user.interface.ts`

```ts
1  import { Role } from '../enums';
2
3  /**
4   * The authenticated principal attached to every request by JwtAuthGuard.
5   * Mirrors the JWT payload (spec section 67). institutionId is null only for
6   * SUPER_ADMIN, which is not tenant-scoped (spec sections 69.1, 302).
7   */
8  export interface AuthenticatedUser {
9    userId: string;
10   institutionId: string | null;
11   role: Role;
12 }
```

זה אחד הטיפוסים **הכי חשובים** בכל הפרויקט — כי הוא מייצג "מי מבצע את הבקשה" בכל מקום בקוד.

- **שורה 9:** `userId: string` — ה-`_id` של ה-`User` מ-MongoDB (לא participantId/staffId!). זה תמיד מזהה את רשומת האימות.
- **שורה 10:** `institutionId: string | null` — כאן הטיפוס `| null` הוא **קריטי לתקינות**. אם הייתי מגדיר `institutionId: string` בלי null, כל מקום בקוד היה "חושב" שתמיד יש institutionId — אבל SUPER_ADMIN באמת לא שייך לאף מוסד. ה-`| null` מכריח כל controller שמשתמש בזה לטפל במפורש במקרה הזה (זה למה יש בכל controller פונקציית עזר `requireInstitution` שזורקת שגיאה אם null).
- **שורה 11:** `role: Role` — משתמש ב-enum, לא string חופשי.

## `common/interfaces/api-response.interface.ts`

```ts
1  /** Consistent API envelopes. Spec section 65. */
2  export interface SuccessResponse<T> {
3    success: true;
4    data: T;
5  }
```

- **שורה 2:** `<T>` — generic. "SuccessResponse של Participant" הוא `SuccessResponse<Participant>`, "SuccessResponse של רשימת Groups" הוא `SuccessResponse<Group[]>` וכו'. אותה מעטפת, כל תוכן.
- **שורה 3:** `success: true` — לא `success: boolean`! זהו **literal type** — הערך היחיד המותר הוא ממש `true`. יחד עם `ErrorResponse` למטה (ש-`success: false`), TypeScript יכול להסיק אוטומטית איזה טיפוס מדובר לפי ערך ה-`success` ("discriminated union") — לדוגמה `if (response.success)` נותן ל-TS לדעת שבתוך ה-`if` זה בטוח `SuccessResponse` ומותר לגשת ל-`.data`.

```ts
7  export interface ErrorResponse {
8    success: false;
9    error: {
10     code: string;
11     message: string;
12   };
13 }
```

- מראה מדויקת של מבנה השגיאה מסעיף 65: `{success:false, error:{code, message}}`.

```ts
15 /** Standard paginated payload. Spec section 86, 98.1. */
16 export interface PaginatedResult<T> {
17   items: T[];
18   page: number;
19   limit: number;
20   total: number;
21 }
```

- שוב generic `<T>`. מדויק למבנה מסעיף 86: `{items, page, limit, total}`.
- **הערה:** `PaginatedResult` **לא** עטוף אוטומטית בתוך `SuccessResponse` — הוא ה-`data` שבתוך `SuccessResponse<PaginatedResult<X>>`. שתי השכבות עצמאיות: interceptor עוטף ב-`{success,data}`, וה-service כבר מחזיר object שבנוי כ-`{items,page,limit,total}`.

## `common/errors/app-error.ts`

```ts
1  import { HttpException, HttpStatus } from '@nestjs/common';

7  export class AppError extends HttpException {
8    readonly code: string;
```

- `HttpException` הוא מחלקת השגיאה הבסיסית של NestJS. `AppError` **מרחיב** אותה במקום להמציא מנגנון שגיאות חדש, כי NestJS כבר יודע לתפוס `HttpException` ולהחזיר את קוד ה-HTTP הנכון.
- **שורה 8:** `code` הוא שדה **בנוסף** למה ש-`HttpException` כבר נותן (status, message). `readonly` — אחרי שנוצר אובייקט השגיאה, אי אפשר לשנות את הקוד שלו.

```ts
10   constructor(
11     code: string,
12     message: string,
13     status: HttpStatus = HttpStatus.BAD_REQUEST,
14   ) {
15     super({ code, message }, status);
16     this.code = code;
17   }
```

- **שורה 13:** `status: HttpStatus = HttpStatus.BAD_REQUEST` — פרמטר עם ברירת מחדל. אם קוראים ל-`new AppError('X','Y')` בלי status שלישי, זה יהיה אוטומטית 400.
- **שורה 15:** `super({code, message}, status)` — קורא לבנאי של `HttpException` עם **אובייקט** כ-body (לא string), כדי שכשה-filter יקרא את `exception.getResponse()`, הוא יקבל בדיוק `{code, message}`.

```ts
19   static notFound(message: string, code = 'NOT_FOUND') {
20     return new AppError(code, message, HttpStatus.NOT_FOUND);
21   }
```

- **`static`** — לא צריך `new AppError(...)` עם 3 פרמטרים בכל מקום בקוד; אפשר לכתוב `AppError.notFound('Participant not found', 'PARTICIPANT_NOT_FOUND')`. זה **factory method pattern**.
- **`code = 'NOT_FOUND'`** — ברירת מחדל לקוד. אפשר לקרוא עם קוד גנרי, או לתת קוד ספציפי יותר כדי שהקליינט יוכל להבדיל בין סוגי שגיאות בלי לפרסר את ה-message.
- עוד ארבע שיטות דומות: `forbidden`(403)/`unauthorized`(401)/`conflict`(409)/`validation`(400) — ממפות לסעיף 95 באפיון (Authentication/Authorization/Validation/Not Found Errors).
- **שים לב:** אין `static internal()` — שגיאות 500 הן שגיאות תכנות בלתי צפויות, וה-filter תופס `Error` רגיל וממיר אותו ל-500 אוטומטית.

## `common/filters/all-exceptions.filter.ts`

```ts
16 @Catch()
17 export class AllExceptionsFilter implements ExceptionFilter {
```

- **שורה 16:** `@Catch()` **בלי פרמטר** — תופס **כל** סוג שגיאה (לא רק `HttpException`).
- **שורה 17:** `implements ExceptionFilter` — ממשק שמכריח מימוש מתודה בשם `catch`.

```ts
20   catch(exception: unknown, host: ArgumentsHost) {
```

- `exception: unknown` — לא `any`! מכריח בדיקת טיפוס לפני שימוש (type guard), בטוח יותר.

```ts
25   let status = HttpStatus.INTERNAL_SERVER_ERROR;
26   let code = 'INTERNAL_ERROR';
27   let message = 'An unexpected error occurred';
```

- **ברירות מחדל פסימיות** — אם השגיאה לא צפויה, ברירת המחדל היא 500 עם הודעה גנרית (לא חושפים למשתמש פרטים פנימיים על שגיאה לא מוכרת).

```ts
29   if (exception instanceof HttpException) {
30     status = exception.getStatus();
31     const res = exception.getResponse();
32     if (typeof res === 'string') {
33       message = res;
34       code = this.codeFromStatus(status);
35     } else if (typeof res === 'object' && res !== null) {
36       const body = res as Record<string, unknown>;
37       code = (body.code as string) ?? this.codeFromStatus(status);
38       // class-validator returns message as an array of strings.
39       const rawMessage = body.message;
40       message = Array.isArray(rawMessage)
41         ? rawMessage.join('; ')
42         : ((rawMessage as string) ?? exception.message);
43     }
```

- **זה החלק החשוב ביותר בקובץ.** `class-validator` (אחראי על ולידציית ה-DTOs) מחזיר שגיאות בתור **מערך** של מחרוזות — למשל `["username should not be empty", "password must be longer than 8 characters"]`. שורות 40-42 בודקות אם `message` הוא מערך, ואם כן — מאחדות אותו למחרוזת אחת מופרדת ב-`; `, כדי שהתגובה תמיד תעמוד בפורמט `message: string` שהאפיון דורש (סעיף 65).

```ts
48   if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
49     this.logger.error(...)
50   }
```

- **רק** שגיאות 500+ נרשמות ללוג כ-`error` (סעיף 96). שגיאות 400/403/404 הן חלק נורמלי מזרימת האפליקציה — לא רוצים להציף את הלוגים בהן.

```ts
59   private codeFromStatus(status: number): string {
60     const map: Record<number, string> = { ... };
61     return map[status] ?? 'ERROR';
62   }
```

- מיפוי status→code כללי (fallback). זה **אובייקט מיפוי**, לא switch/case, כי ESLint התלונן על switch עם `HttpStatus` (איחוד של כמה enum שונים ב-NestJS) — אובייקט מיפוי פותר את זה בקלות.

## `common/interceptors/response.interceptor.ts`

```ts
15 @Injectable()
16 export class ResponseInterceptor<T> implements NestInterceptor<T, SuccessResponse<T>> {
20   intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<SuccessResponse<T>> {
24     return next.handle().pipe(map((data) => ({ success: true, data })));
25   }
26 }
```

- **שורה 21:** `_context` — ה-underscore prefix מסמן "פרמטר לא בשימוש". מקבלים אותו כי הממשק דורש, אבל לא מתעניינים ב-request/response עצמם.
- **שורה 22:** `next: CallHandler<T>` — "הצינור" שמייצג את שאר שרשרת העיבוד. `next.handle()` **מפעיל** את ה-controller ומחזיר `Observable` (סטרים אסינכרוני של RxJS, לא Promise — NestJS משתמש ב-RxJS מתחת למכסה).
- **שורה 24:** `.pipe(map(...))` — כמו `.then()` ב-Promises, אבל ל-Observable. לוקח את מה שה-controller החזיר ועוטף: `{success:true, data}`. זה כל הקסם — לא צריך לגעת בכל controller בנפרד.

## `common/decorators/public.decorator.ts`

```ts
1  import { SetMetadata } from '@nestjs/common';
3  export const IS_PUBLIC_KEY = 'isPublic';
6  export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

- `IS_PUBLIC_KEY` מיוצא כדי ש-`JwtAuthGuard` יקרא **בדיוק** את אותו מפתח — אם היה כתוב פעמיים בנפרד, טעות הקלדה קטנה הייתה שוברת את כל מנגנון האימות בלי אזהרה.
- `SetMetadata(key, value)` — "מדביק תווית" על מחלקה/מתודה, שניתן לקרוא אח"כ עם `Reflector`. `Public()` היא decorator factory — פונקציה שמחזירה decorator. משתמשים בה כך: `@Public() @Get('login')`. זה "מסמן" בלבד — לא עושה שום דבר בפני עצמו, רק ה-Guard בהמשך קורא את התווית ומחליט לפיה.

## `common/decorators/roles.decorator.ts`

```ts
7  export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

- **`...roles: Role[]`** — rest parameter, כלומר `@Roles(Role.Admin, Role.Staff)` אוסף את שני הארגומנטים למערך. זה מה שמאפשר route שמורשה לכמה תפקידים בבת אחת.

## `common/decorators/current-user.decorator.ts`

```ts
9  export const CurrentUser = createParamDecorator(
10   (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
11     const request = ctx.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
14     const user = request.user;
15     return data ? user?.[data] : user;
16   },
17 );
```

זה שונה מהשניים הקודמים — `createParamDecorator` (לא `SetMetadata`) כי הוא לא "מתייג" route, אלא **מזריק ערך אמיתי** לפרמטר של פונקציה.

- **שורה 10:** `data: keyof AuthenticatedUser | undefined` — `keyof AuthenticatedUser` הוא `'userId' | 'institutionId' | 'role'`. זה מה שמאפשר להשתמש בדקורטור בשתי צורות: `@CurrentUser()` (מחזיר את כל האובייקט) או `@CurrentUser('role')` (מחזיר רק את השדה הזה) — עם type-safety מלא.
- **שורה 15:** `data ? user?.[data] : user` — טרנרי פשוט: אם ביקשו שדה ספציפי מחזירים רק אותו, אחרת מחזירים את כל האובייקט.

**זה הקטע החשוב ביותר מבחינה אבטחתית בכל הפרויקט** — כי זה המקום היחיד שממנו מגיע `institutionId` בכל controller. הוא **תמיד** נגזר מה-JWT המאומת, **אף פעם** לא מה-body של הבקשה. זו האכיפה הישירה של סעיף 91 באפיון.

## `common/dto/pagination-query.dto.ts`

```ts
5  export class PaginationQueryDto {
6    @IsOptional()
7    @Type(() => Number)
8    @IsInt()
9    @Min(1)
10   page = 1;
```

- **שורה 6:** `@IsOptional()` — אם `page` לא נשלח, לא זורקים שגיאת ולידציה.
- **שורה 7:** `@Type(() => Number)` — decorator של `class-transformer` (לא `class-validator`!). **קריטי**: query string הוא תמיד string (`req.query.page === "2"`). ה-`@Type` הזה ממיר את המחרוזת למספר *לפני* שהולידציה רצה.
- **שורה 10:** `page = 1` — ערך ברירת מחדל ב-JS עצמו.

```ts
16   @Max(100)
17   limit = 20;
```

- `@Max(100)` — תקרה קשיחה (סעיף 98.1: "Never return unlimited records"). ברירת מחדל 20 (סעיף 86).

## `common/dto/custom-field-entry.dto.ts`

```ts
9  export class CustomFieldEntryDto {
10   @IsString()
11   k: string;
13   @IsDefined()
14   v: unknown;
15 }
```

- `k` תמיד string (ה-`internalKey` של FieldDefinition).
- `v` הוא `unknown` עם `@IsDefined()` בלבד — "משהו חייב להיות שם, אבל לא יודע איזה טיפוס". הטיפוס האמיתי תלוי ב-`fieldType` שמוגדר ב-`FieldDefinition`. זו רק **ולידציה מבנית** (יש `k` ו-`v`), לא ולידציה סמנטית — זה תפקידו של `DynamicFieldsValidatorService` (ראו [`10-dynamic-schema-engine.md`](10-dynamic-schema-engine.md)).

## `common/utils/password.util.ts`

```ts
1  import * as bcrypt from 'bcrypt';
2  import { randomBytes } from 'crypto';
4  const SALT_ROUNDS = 12;
```

- `bcrypt` — הספרייה שהאפיון מציע במפורש (סעיף 68).
- `randomBytes` מ-`crypto` המובנה של Node.js — **לא** `Math.random()`! `Math.random()` **אינו** מאובטח קריפטוגרפית (ניתן לחיזוי).
- `SALT_ROUNDS = 12` — כמה "סיבובי" חישוב bcrypt מבצע. סטנדרט תעשייתי נפוץ, מאזן אבטחה מול ביצועים.

```ts
7  export function hashPassword(plain: string): Promise<string> {
8    return bcrypt.hash(plain, SALT_ROUNDS);
9  }
```

- `bcrypt.hash` **אסינכרוני** (מחזיר Promise) — לא חוסם את ה-event loop, קריטי בשרת שמטפל בבקשות מרובות במקביל.

```ts
11 export function verifyPassword(plain: string, hash: string): Promise<boolean> {
12   return bcrypt.compare(plain, hash);
13 }
```

- `bcrypt.compare` — **לא** משווה סתם `hashPassword(plain) === hash`! bcrypt מטמיע "salt" רנדומלי בתוך ה-hash עצמו, כך שאותה סיסמה נותנת hash שונה בכל פעם. `compare` יודע לחלץ את ה-salt ולבדוק נכון, ועמיד בפני timing attacks.

```ts
16 export function generateTempPassword(): string {
18   return randomBytes(9).toString('base64url');
19 }
```

- `randomBytes(9)` — 9 בייטים = 72 ביט אנטרופיה אמיתית. `base64url` נותן טקסט קריא ובטוח-ל-URL (בלי `+`/`/`/`=` בעייתיים).

## `common/utils/field-value.util.ts`

פונקציה `isValueCompatibleWithType(fieldType, value, activeOptionValues?)` — בודקת התאמת ערך לסוג שדה דינמי, בשימוש כפול: גם בבדיקת שינוי סוג שדה (סעיף 32) וגם בולידציית create/update (סעיף 36). מקור אמת אחד, נמנע כפילות לוגיקה.

---
חזרה ל-[`README.md`](README.md).
