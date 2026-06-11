import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import Portfolio from '@/models/Portfolio'
import { holdings, watchlist } from '@/lib/mockData'
import { sanitizeString } from '@/lib/sanitize'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const name     = sanitizeString(body.name     ?? '', 100)
    const email    = sanitizeString(body.email    ?? '', 255).toLowerCase()
    const password = String(body.password ?? '')

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    if (!/\d/.test(password)) {
      return NextResponse.json({ error: 'Password must contain at least one number' }, { status: 400 })
    }

    await connectDB()

    const existing = await User.findOne({ email })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 12)
    const user = await User.create({ name, email, password: hashed })

    await Portfolio.create({
      userId:       user._id,
      cash:         7_399_000,
      holdings:     holdings,
      watchlist:    watchlist,
      transactions: [],
    })

    return NextResponse.json({ message: 'Account created successfully' }, { status: 201 })
  } catch (err: any) {
    console.error('[register]', err.message)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
