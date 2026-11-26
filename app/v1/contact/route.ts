import { POST as submit } from '@/app/api/contact/route'
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function POST(request: NextRequest) { return submit(request) }
