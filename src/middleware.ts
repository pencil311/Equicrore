export { default } from 'next-auth/middleware'

export const config = {
  matcher: ['/dashboard/:path*', '/api/userdata/:path*', '/api/portfolio/:path*'],
}
