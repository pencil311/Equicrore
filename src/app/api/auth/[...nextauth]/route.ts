// Phase 4: NextAuth will be configured here
// import NextAuth from 'next-auth'
// import { authOptions } from '@/lib/auth'
// const handler = NextAuth(authOptions)
// export { handler as GET, handler as POST }

export async function GET() {
  return Response.json({ message: 'Auth not yet configured — Phase 4' })
}
