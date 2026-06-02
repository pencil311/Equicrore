import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import Portfolio from '@/models/Portfolio'
import { holdings, watchlist } from '@/lib/mockData'

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    await connectDB()

    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 12)
    const user = await User.create({ name, email: email.toLowerCase(), password: hashed })

    // Create a fresh portfolio for the new user with default mock data
    await Portfolio.create({
      userId:       user._id,
      cash:         7_399_000,
      holdings:     holdings,
      watchlist:    watchlist,
      transactions: [],
    })

    return NextResponse.json({ message: 'Account created successfully' }, { status: 201 })
  } catch (err: any) {
    console.error('[register]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
