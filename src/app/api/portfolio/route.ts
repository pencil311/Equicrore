import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Portfolio from '@/models/Portfolio'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const portfolio = await Portfolio.findOne({ userId: (session.user as any).id })
  if (!portfolio) return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })

  return NextResponse.json(portfolio)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  await connectDB()

  const portfolio = await Portfolio.findOneAndUpdate(
    { userId: (session.user as any).id },
    { ...body, updatedAt: new Date() },
    { new: true, upsert: true }
  )

  return NextResponse.json(portfolio)
}
