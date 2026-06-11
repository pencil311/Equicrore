import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import { sanitizeString } from '@/lib/sanitize'

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await req.json()
  const cleanName = sanitizeString(name ?? '', 100)
  if (!cleanName) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  await connectDB()
  const userId = (session.user as any).id
  await User.findByIdAndUpdate(userId, { name: cleanName })

  return NextResponse.json({ ok: true, name: cleanName })
}
