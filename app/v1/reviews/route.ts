// Guest credentials are scoped to /v1; keep the account API alias for older clients.
export { GET, POST } from '@/app/api/reviews/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
