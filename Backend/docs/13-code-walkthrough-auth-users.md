# הסבר שורה-שורה — Auth ו-Users

המשך ל-[`12-code-walkthrough-common.md`](12-code-walkthrough-common.md), אותה שיטה: כל
שורה מוסברת. לתמצית קצרה יותר ראו [`04-auth-and-users.md`](04-auth-and-users.md).

---

## `auth/strategies/jwt.strategy.ts`

```ts
1  import { Injectable, UnauthorizedException } from '@nestjs/common';
2  import { ConfigService } from '@nestjs/config';
3  import { PassportStrategy } from '@nestjs/passport';
4  import { ExtractJwt, Strategy } from 'passport-jwt';
```

- **שורה 3-4:** `PassportStrategy`/`Strategy` הם מ-ecosystem חיצוני (Passport.js) ש-NestJS עוטף. `Strategy` מ-`passport-jwt` הוא ה"מנוע" שיודע לפענח ולאמת JWT.

```ts
8  interface JwtPayload {
9    sub: string;
10   institutionId: string | null;
11   role: Role;
12 }
```

- `sub` הוא שם השדה הסטנדרטי ב-JWT ל"נושא" הטוקן (Subject) — תקן JWT (RFC 7519), לכן לא נקרא `userId`. מייצג את ה-`_id` של ה-User.

```ts
14 @Injectable()
15 export class JwtStrategy extends PassportStrategy(Strategy) {
```

- `PassportStrategy(Strategy)` — פונקציה שיוצרת מחלקת בסיס דינמית שעוטפת את ה-`Strategy` של Passport בממשק ש-NestJS יודע להשתמש בו. `extends` על תוצאת פונקציה — mixin pattern.

```ts
16   constructor(config: ConfigService) {
17     const secret = config.get<string>('jwt.secret');
18     if (!secret) throw new Error('JWT_SECRET is not configured');
19     super({
20       jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
21       ignoreExpiration: false,
22       secretOrKey: secret,
23     });
24   }
```

- **שורה 17:** שולף את `JWT_SECRET` דרך `ConfigService` (לא ישירות מ-`process.env`) — שכבת הפשטה אחידה לכל הגדרות הפרויקט.
- **שורה 18:** **בדיקת "fail fast"** — אם ה-secret לא הוגדר, זורקים שגיאה **מיד באתחול השרת**, לא מחכים לבקשת login ראשונה שתיכשל בצורה מבלבלת.
- **שורה 20:** `ExtractJwt.fromAuthHeaderAsBearerToken()` — אומר ל-Passport לחפש את הטוקן ב-header `Authorization: Bearer <token>`.
- **שורה 21:** `ignoreExpiration: false` — **אוכף** תפוגה (סעיף 68: "Token validation. Expiration.").

```ts
27   validate(payload: JwtPayload): AuthenticatedUser {
28     if (!payload?.sub || !payload?.role) {
29       throw new UnauthorizedException('Invalid token payload');
30     }
31     return {
32       userId: payload.sub,
33       institutionId: payload.institutionId ?? null,
34       role: payload.role,
35     };
36   }
```

- **שורה 27:** `validate` הוא שם מיוחד — Passport **קורא לו אוטומטית** אחרי שהוא כבר וידא שהחתימה תקינה והטוקן לא פג. **לא** בודק את החתימה בעצמו — זה כבר נעשה.
- **שורות 28-30:** בדיקת "sanity" למקרה קיצון שהטוקן חתום נכון אבל חסר שדות.
- **שורות 31-35:** ממיר את ה-payload לטיפוס האחיד `AuthenticatedUser`. **מה ש-`validate` מחזיר, NestJS מצמיד אוטומטית ל-`request.user`** — זה בדיוק מה שקוראים ה-`CurrentUser` decorator ו-`RolesGuard`.

## `auth/guards/jwt-auth.guard.ts`

```ts
11 export class JwtAuthGuard extends AuthGuard('jwt') {
```

- `AuthGuard('jwt')` — פונקציה של `@nestjs/passport` שיוצרת Guard מוכן שמפעיל את ה-Passport strategy בשם `'jwt'`. השם `'jwt'` הוא ברירת המחדל שכל `PassportStrategy` מקבל — כלומר זה "מתחבר" אוטומטית ל-`JwtStrategy`, בלי קונפיגורציה מפורשת נוספת.

```ts
12   constructor(private readonly reflector: Reflector) {
13     super();
14   }
```

- `Reflector` הוא הכלי של NestJS **לקרוא** metadata שהוצמד ע"י decorators (`@Public()`, `@Roles()`).

```ts
16   canActivate(context: ExecutionContext) {
17     const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
18       context.getHandler(),
19       context.getClass(),
20     ]);
21     if (isPublic) return true;
22     return super.canActivate(context);
23   }
```

- **שורה 17-20:** `getAllAndOverride` בודק את ה-metadata **גם על ה-method הספציפי** וגם על ה-class. "Override" — אם יש הגדרה ברמת ה-method, היא גוברת על רמת ה-class.
- **שורה 21:** אם ה-route מסומן `@Public()` — **מדלגים על כל האימות**.
- **שורה 22:** אחרת — `super.canActivate(context)` מפעיל את הבדיקה **האמיתית** של `AuthGuard('jwt')`.

## `auth/guards/roles.guard.ts`

```ts
16   canActivate(context: ExecutionContext): boolean {
17     const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [...]);
21     if (!required || required.length === 0) return true;
```

- אם אין `@Roles(...)` בכלל על ה-route — **כל תפקיד מורשה** (ברירת המחדל "פתוח לכל מאומת").

```ts
23   const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
24   const user = request.user;
25   if (!user || !required.includes(user.role)) {
26     throw AppError.forbidden('Insufficient role permissions', 'FORBIDDEN_ROLE');
27   }
28   return true;
```

- **שורה 25:** `!user` — הגנת "sanity" (אמור להיות בלתי אפשרי להגיע לכאן בלי user, כי `JwtAuthGuard` תמיד רץ קודם). `!required.includes(user.role)` — אם התפקיד לא ברשימת התפקידים המורשים — 403.

**סדר ה-Guards ב-`app.module.ts`:** `JwtAuthGuard` → `RolesGuard` — לכן ברגע שאנחנו כאן ב-`RolesGuard`, אנחנו **בטוחים** שהמשתמש כבר אומת.

## `auth/dto/login.dto.ts`

```ts
4  export class LoginDto {
5    @IsString()
6    username: string;
8    @IsString()
9    password: string;
10 }
```

- `@IsString()` בלבד — אין `@MinLength` על הסיסמה כאן (בניגוד ל-`CreateUserDto`). **למה:** ב-login לא רוצים להעניק רמז על מדיניות הסיסמה למי שמנחש — פשוט "string כלשהו", וההשוואה עצמה (bcrypt) תיכשל אם לא נכון.

## `auth/auth.service.ts`

```ts
9  export class AuthService {
10   constructor(
11     private readonly usersService: UsersService,
12     private readonly jwtService: JwtService,
13   ) {}
```

- **Dependency Injection** — `UsersService` ו-`JwtService` (מ-`@nestjs/jwt`) מוזרקים אוטומטית. `private readonly` — קיצור TS: מצהיר על property **וגם** ממלא אותו מהפרמטר, בשורה אחת.

```ts
23   async login(dto: LoginDto): Promise<{...}> {
24     const candidates = await this.usersService.findActiveByUsername(dto.username);
```

- **`candidates` ברבים בכוונה!** לא `findOne`. יכולים להיות **כמה** משתמשים עם אותו username במוסדות שונים (username ייחודי רק בתוך מוסד).

```ts
30     for (const user of candidates) {
31       if (await verifyPassword(dto.password, user.passwordHash)) {
```

- לולאה שעוברת על **כל** המועמדים ובודקת bcrypt compare מול כל אחד, עד שמוצאים התאמה. **Trade-off מתועד:** פשטות מול ביצועים (bcrypt הוא CPU-intensive, ~100ms כל בדיקה) — אם יש כמה מוסדות עם אותו username, מריצים כמה בדיקות.

```ts
32         const payload = {
33           sub: user._id.toString(),
34           institutionId: user.institutionId ? user.institutionId.toString() : null,
35           role: user.role,
36         };
```

- `user._id.toString()` — ב-Mongoose, `_id` הוא אובייקט `ObjectId`, לא string. ה-JWT payload צריך שדות JSON-serializable, אז ממירים ל-string מפורשות. **בדיוק המבנה מסעיף 67:** `{userId(=sub), institutionId, role}` — בלי שום דבר נוסף.

```ts
39         return {
40           accessToken: await this.jwtService.signAsync(payload),
41           mustChangePassword: user.mustChangePassword,
42         };
```

- `mustChangePassword` **מוחזר בנפרד**, לא בתוך ה-JWT עצמו. **למה:** זה בדיוק סוג הדבר שסעיף 67 אומר לא לשים ב-JWT ("frequently changing settings") — אם היה בתוך הטוקן, ברגע שהמשתמש משנה סיסמה הטוקן הישן היה "משקר" עד שיתחבר מחדש.

```ts
46     // Same generic error whether the username or the password was wrong.
47     throw AppError.unauthorized('Invalid username or password', 'INVALID_CREDENTIALS');
```

- **הערה אבטחתית חשובה:** אותה שגיאה **בדיוק** בין "username לא קיים" ל"סיסמה שגויה" — כדי לא לאפשר לתוקף "לגלות" אילו usernames קיימים במערכת (user enumeration attack).

## `auth/auth.controller.ts`

```ts
6  @Controller('auth')
7  export class AuthController {
11   @Public()
12   @Post('login')
13   @HttpCode(HttpStatus.OK)
14   login(@Body() dto: LoginDto) {
15     return this.authService.login(dto);
16   }
17 }
```

- **שורה 6:** `@Controller('auth')` — כל route בקלאס מתחיל ב-`/auth`.
- **שורה 11:** `@Public()` — **חובה כאן!** אחרת `JwtAuthGuard` הגלובלי היה חוסם את בקשת ה-login עצמה (chicken-and-egg — אי אפשר לדרוש טוקן כדי לקבל טוקן).
- **שורה 13:** `@HttpCode(HttpStatus.OK)` — **דורס ברירת מחדל.** NestJS מחזיר `201 Created` כברירת מחדל ל-`POST`, אבל login לא "יוצר" משאב — `200 OK` מתאים יותר.
- **שורה 14:** `@Body() dto: LoginDto` — NestJS לוקח את גוף הבקשה, מריץ אותו דרך `ValidationPipe` הגלובלי, ורק אם עבר ולידציה מגיע לכאן.
- **שורה 15:** ה-controller **דק מאוד** בכוונה — אין כאן שום לוגיקה עסקית (סעיף 87).

## `auth/auth.module.ts`

```ts
10 @Module({
11   imports: [
12     UsersModule,
13     PassportModule,
14     JwtModule.registerAsync({
15       imports: [ConfigModule],
16       inject: [ConfigService],
17       useFactory: (config: ConfigService) => ({...}),
18     }),
19   ],
```

- **שורה 12:** `UsersModule` — כי `AuthService` צריך `UsersService`. חייבים לייבא את המודול כדי ש-DI יעבוד.
- **שורה 13:** `PassportModule` — מפעיל את תשתית Passport.js.
- **שורה 14:** `JwtModule.registerAsync(...)` — **אסינכרוני** (לא `register` הסינכרוני), כי צריך לחכות ל-`ConfigService` שיטען קודם.

```ts
27   controllers: [AuthController],
28   providers: [AuthService, JwtStrategy],
29   exports: [AuthService],
30 })
```

- **שורה 28:** `JwtStrategy` **חייב** להיות ב-`providers` (גם אם אף אחד לא מזריק אותו ידנית) — NestJS צריך ליצור אינסטנס כדי ש-Passport ירשום את ה-strategy.
- **שורה 29:** רק `AuthService` נחשף החוצה — אף אחד חוץ מ-`AuthModule` לא צריך לגעת ב-`JwtStrategy` ישירות.

## `users/schemas/user.schema.ts`

```ts
12 @Schema({ timestamps: true, collection: 'users' })
13 export class User {
```

- **`timestamps: true`** — Mongoose מוסיף אוטומטית `createdAt`/`updatedAt`.
- **`collection: 'users'`** — שם ה-collection הפיזי ב-MongoDB, מוגדר במפורש (לא תלוי בהיסק אוטומטי).

```ts
14   @Prop({
15     type: Types.ObjectId,
16     ref: 'Institution',
17     default: null,
18     index: true,
19   })
20   institutionId: Types.ObjectId | null;
```

- **שורה 15:** `type: Types.ObjectId` — אומר ל-Mongoose ששדה זה מזהה MongoDB, לא string רגיל.
- **שורה 16:** `ref: 'Institution'` — מגדיר "קשר" ל-collection `institutions`, מאפשר `.populate()` בעתיד. **לא** foreign key אמיתי — MongoDB לא אוכף שלמות רפרנציאלית.
- **שורה 17:** `default: null` — SUPER_ADMIN לא שייך למוסד.
- **שורה 18:** `index: true` — אינדקס על השדה בלבד, בנוסף לאינדקס המורכב בסוף הקובץ.

```ts
28   @Prop({ type: String, enum: Role, required: true })
29   role: Role;
```

- `type: String, enum: Role` — Mongoose שומר כ-string ב-DB (`"ADMIN"`), אבל **אוכף** שרק ערכי ה-enum מותרים — הגנה כפולה ברמת ה-DB layer, לא רק ברמת ה-DTO.

```ts
40   /** Forces a password change on first login. Spec section 70.1. */
41   @Prop({ default: true })
42   mustChangePassword: boolean;
```

- `default: true` — **כל** User חדש (כולל ה-Admin הראשון) מתחיל עם `mustChangePassword: true`. אצל ה-Admin הראשון בפועל דורסים את זה ל-`false` ב-`institutions.service.ts` כי הוא בוחר בעצמו את הסיסמה — אבל ברירת המחדל בסכימה עצמה היא "בטוחה" (true), וכל מקום שרוצה לשנות חייב לעשות זאת **במפורש**.

```ts
53 // Unique login per institution. Spec section 60.
55 UserSchema.index({ institutionId: 1, username: 1 }, { unique: true });
```

- אינדקס **מורכב** (compound) על שני שדות יחד, עם `unique:true`. המשמעות: "אין שני משתמשים עם אותו username **באותו** מוסד" — אבל **כן** מותר אותו username בשני מוסדות שונים (מפתח מורכב שונה = ערך שונה מבחינת MongoDB).

## `users/users.service.ts`

```ts
19   constructor(
20     @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
21   ) {}
```

- `@InjectModel(User.name)` — decorator שאומר ל-NestJS "הזרק לי את מודל Mongoose שנרשם ל-`User`". `User.name` הוא `"User"` (שם המחלקה כ-string).

```ts
27   async createRaw(data: {...}, session?: ClientSession): Promise<UserDocument> {
39     await this.assertUsernameFree(data.institutionId, data.username, session);
40     const docs = await this.userModel.create([{...}], { session });
53     return docs[0];
```

- **שורה 39:** בודק ידנית שאין כפילות username **לפני** יצירה — נותן שגיאה נקייה (`USERNAME_TAKEN`) במקום שגיאת MongoDB גולמית (`E11000 duplicate key`). **race condition תיאורטי קטן** — ה-unique index מגן ברמת ה-DB כרשת ביטחון אחרונה.
- **שורות 40, 53:** `userModel.create([{...}], {session})` — **מערך** עם איבר אחד, כי זו הצורה הבטוחה של Mongoose ליצירה **בתוך session** (לטרנזקציה). `docs[0]` — כי `create([...])` תמיד מחזיר מערך.

```ts
65     if (dto.role !== Role.Staff && dto.role !== Role.Participant) {
66       throw AppError.validation('Only STAFF or PARTICIPANT users can be created here');
67     }
```

- **הגנה כפולה** — ה-DTO כבר מגביל את הטיפוס, אבל `@IsEnum(Role,...)` בפועל מאפשר את **כל** ה-enum (רק ההודעה אומרת אחרת). הבדיקה כאן ב-service היא ה"רשת ביטחון" האמיתית שמונעת מ-Admin ליצור עוד Admin/SUPER_ADMIN דרך ה-endpoint הזה.

```ts
70     const plain = dto.password ?? generateTempPassword();
71     const passwordHash = await hashPassword(plain);
73     return { user, tempPassword: plain };
```

- `tempPassword: plain` — **הפעם היחידה בכל הקוד שסיסמה גולמית מוחזרת החוצה בכלל** (סעיף 70.1). אחרי הקריאה הזו, הסיסמה הגולמית "נעלמת" מהזיכרון של השרת, רק ה-hash נשאר ב-DB.

```ts
85   findActiveByUsername(username: string): Promise<UserDocument[]> {
87     return this.userModel.find({ username, status: AccountStatus.Active, isDeleted: false }).exec();
```

- `status: AccountStatus.Active` — **רק** משתמשים פעילים יכולים להתחבר. משתמש `Inactive`/`Rejected` **לא יוחזר בכלל** מהשאילתה — אפילו עם סיסמה נכונה, ה-login ייכשל כי הוא לא ברשימת המועמדים.

```ts
95   async findAll(...): Promise<PaginatedResult<UserDocument>> {
97     const filter = { institutionId, isDeleted: false };
98     const [items, total] = await Promise.all([
99       this.userModel.find(filter).select('-passwordHash')...
100      this.userModel.countDocuments(filter).exec(),
101    ]);
```

- **שורה 97:** `filter = {institutionId, isDeleted:false}` — **זו השאילתה שמממשת את בידוד המוסדות**. `institutionId` תמיד מגיע מ-`@CurrentUser()`.
- **שורה 99:** `.select('-passwordHash')` — ה-`-` לפני שם השדה אומר "החרג אותו" — לעולם לא מחזירים hash של סיסמה בתגובת API, גם אם הוא מוצפן (defense in depth).
- **שורה 98:** `Promise.all([...])` — מריץ את שאילתת ה-`find` ואת ה-`countDocuments` **במקביל**, לא בזה אחר זה.

```ts
128    const update: Record<string, unknown> = {};
129    if (dto.status !== undefined) update.status = dto.status;
132    if (dto.password !== undefined) {
133      update.passwordHash = await hashPassword(dto.password);
134      update.mustChangePassword = true;
135    }
```

- **דפוס "עדכון חלקי" (partial update)** — בונים אובייקט `update` **רק** עם השדות שבאמת נשלחו. מונע מ-Mongoose לפרש שדה לא-נשלח כ"תנקה את השדה".
- **שורה 133-134:** אם Admin מגדיר סיסמה חדשה למשתמש — גם מסמנים `mustChangePassword: true`, כי גם היא זמנית עד שהמשתמש יבחר סיסמה משלו.

```ts
155  async softDelete(id: string, institutionId: string): Promise<void> {
158        { _id: id, institutionId, isDeleted: false },
159        { isDeleted: true, deletedAt: new Date(), status: AccountStatus.Inactive },
```

- הפילטר כולל `isDeleted: false` — אם מנסים למחוק (רכה) משתמש שכבר נמחק, השאילתה **לא תמצא** אותו → שגיאת `USER_NOT_FOUND`. מונע "מחיקה כפולה" שקטה.
- `isDeleted:true` + `deletedAt` + **גם** `status:Inactive` — שלוש דגלים בבת אחת, הגנה כפולה גם אם מישהו טועה ומסנן רק לפי `status` במקום אחר.

```ts
171  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
174    const ok = await verifyPassword(currentPassword, user.passwordHash);
175    if (!ok) throw AppError.unauthorized('Current password is incorrect', 'INVALID_PASSWORD');
176    user.passwordHash = await hashPassword(newPassword);
177    user.mustChangePassword = false;
178    await user.save();
```

- `userId` מגיע **מה-JWT של המשתמש עצמו** — אין דרך לשלוח `changePassword` על user אחר, כל אחד יכול לשנות **רק** את הסיסמה שלו.
- בודק את הסיסמה **הנוכחית** מול ה-hash הקיים — לא מספיק JWT תקף.
- משנה את השדות **על האובייקט עצמו** ואז `.save()` — בניגוד ל-`findOneAndUpdate` (שאר המתודות), כי כבר יש לנו את המסמך בזיכרון (טענו אותו כדי לבדוק את הסיסמה).

---
חזרה ל-[`README.md`](README.md).
