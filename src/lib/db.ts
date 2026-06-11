// Atlas Security Checklist:
// 1. Network Access: restrict to your server IP only (not 0.0.0.0/0) in production
// 2. Database User: use a dedicated user with readWrite only on equicrore database
// 3. Enable Atlas encryption at rest
// 4. Enable audit logging in Atlas
// 5. Rotate database password every 90 days

import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is not defined in .env.local')
}

/** Global cache so Next.js hot-reload doesn't create new connections */
let cached = (global as any).mongoose as { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null }
}

export async function connectDB() {
  if (cached.conn) return cached.conn

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      // Direct connection avoids SRV DNS lookup (same fix as MoodSync)
      directConnection: MONGODB_URI.includes('directConnection') ? undefined : false,
    })
  }

  cached.conn = await cached.promise
  return cached.conn
}
