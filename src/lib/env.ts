const required = ['MONGODB_URI', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL'] as const

required.forEach(key => {
  if (!process.env[key]) throw new Error(`Missing required env var: ${key}`)
})

if (process.env.NEXTAUTH_SECRET!.length < 32) {
  throw new Error('NEXTAUTH_SECRET must be at least 32 characters')
}

export {}
