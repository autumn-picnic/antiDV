import { POST as submit } from '@/app/api/feedback/failures/route'
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function POST(request: NextRequest) { return submit(request) }
