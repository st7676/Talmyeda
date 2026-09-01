import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * Boots a real, standalone MongoDB engine in memory (not a mock) for
 * integration tests — spec section 102. This is what actually caught the
 * ObjectId/Mixed schema bug documented in PROGRESS.md: unlike unit tests
 * with mocked models, this exercises real Mongoose schema casting and real
 * BSON storage, without needing Docker running at test time (works
 * identically locally and in CI).
 */
let mongod: MongoMemoryServer | undefined;

export async function startTestMongo(): Promise<string> {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri('talmyeda_test');

  // env.validation.ts requires all of these to be set before ConfigModule
  // compiles — must happen before Test.createTestingModule({imports:[AppModule]}).
  process.env.NODE_ENV = 'test';
  process.env.PORT = '3000';
  process.env.MONGODB_URI = uri;
  process.env.JWT_SECRET = 'integration-test-secret-do-not-use-in-production';
  process.env.JWT_EXPIRES_IN = '1d';

  return uri;
}

export async function stopTestMongo(): Promise<void> {
  if (mongod) {
    await mongod.stop();
    mongod = undefined;
  }
}
