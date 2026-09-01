/**
 * One-off local dev helper: SUPER_ADMIN is intentionally "provisioned out of
 * band" (see users/dto/create-user.dto.ts) — there is no in-app way to create
 * one, by design, since it's a platform-level role that sits outside any
 * institution. This script inserts one directly via Mongoose for local/demo
 * use only. Run with: npx ts-node scripts/seed-super-admin.ts
 */
import mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

async function main() {
  const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/talmyeda';
  const username = process.argv[2] ?? 'super-admin';
  const password = process.argv[3] ?? 'SuperAdmin123!';

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error('No DB connection');

  const existing = await db
    .collection('users')
    .findOne({ username, institutionId: null });
  if (existing) {
    console.log(`SUPER_ADMIN "${username}" already exists (id=${existing._id}).`);
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await db.collection('users').insertOne({
    institutionId: null,
    username,
    passwordHash,
    role: 'SUPER_ADMIN',
    participantId: null,
    staffId: null,
    status: 'Active',
    mustChangePassword: false,
    isDeleted: false,
    deletedAt: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`Created SUPER_ADMIN "${username}" (id=${result.insertedId}).`);
  console.log(`Login with: username=${username} password=${password}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
