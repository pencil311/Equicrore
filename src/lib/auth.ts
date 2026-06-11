// To get Google credentials:
// 1. Go to https://console.cloud.google.com
// 2. Create a new project or select existing
// 3. Go to APIs & Services > Credentials
// 4. Click Create Credentials > OAuth 2.0 Client ID
// 5. Application type: Web application
// 6. Authorized redirect URIs: http://localhost:3000/api/auth/callback/google
// 7. Copy Client ID and Client Secret to .env.local

if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET must be set in production')
}

import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import Portfolio from '@/models/Portfolio'

/* In-memory rate limiter keyed by email — 5 failures = 15 min block */
const loginAttempts = new Map<string, { count: number; blockedUntil: number }>()
const RATE_MAX = 5
const RATE_WINDOW = 15 * 60 * 1000

function isBlocked(email: string): boolean {
  const entry = loginAttempts.get(email)
  if (!entry) return false
  if (Date.now() < entry.blockedUntil) return true
  loginAttempts.delete(email)
  return false
}

function recordFailure(email: string) {
  const entry = loginAttempts.get(email) ?? { count: 0, blockedUntil: 0 }
  entry.count += 1
  if (entry.count >= RATE_MAX) {
    entry.blockedUntil = Date.now() + RATE_WINDOW
    entry.count = 0
  }
  loginAttempts.set(email, entry)
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const email = credentials.email.toLowerCase()

        if (isBlocked(email)) return null

        await connectDB()
        const user = await User.findOne({ email })
        if (!user) { recordFailure(email); return null }

        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) { recordFailure(email); return null }

        loginAttempts.delete(email) // clear on success
        return { id: user._id.toString(), name: user.name, email: user.email }
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 24 * 60 * 60, updateAge: 60 * 60 },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        await connectDB()
        const existing = await User.findOne({ email: user.email })
        if (!existing) {
          const newUser = await User.create({
            name: user.name,
            email: user.email,
            password: 'google-oauth',
            createdAt: new Date(),
          })
          await Portfolio.create({
            userId: newUser._id,
            cash: 0,
            holdings: [],
            watchlist: [],
            transactions: [],
          })
        }
      }
      return true
    },
    async jwt({ token, user, account, trigger, session: updateData }) {
      if (trigger === 'update' && updateData?.name) {
        token.name = updateData.name
      }
      if (user) {
        if (account?.provider === 'google') {
          await connectDB()
          const dbUser = await User.findOne({ email: user.email })
          if (dbUser) token.id = dbUser._id.toString()
        } else {
          token.id = user.id
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error:  '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
