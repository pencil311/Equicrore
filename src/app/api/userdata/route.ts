import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import UserData from '@/models/UserData'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const key = req.nextUrl.searchParams.get('key')
  if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 })

  await connectDB()
  const userId = (session.user as any).id
  const doc = await UserData.findOne({ userId, key }).lean()
  return NextResponse.json({ value: (doc as any)?.value ?? null })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { key, value } = await req.json()
  if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 })

  await connectDB()
  const userId = (session.user as any).id
  await UserData.findOneAndUpdate(
    { userId, key },
    { $set: { value, updatedAt: new Date() } },
    { upsert: true },
  )
  return NextResponse.json({ ok: true })
}
