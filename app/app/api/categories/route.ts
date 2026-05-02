import { NextRequest, NextResponse } from 'next/server'
import { authedClient } from '@/lib/api-client'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const result = await authedClient(token)<unknown>('/categories', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error || 'Create category failed' },
      { status: result.status || 500 },
    )
  }
  return NextResponse.json(result.data, { status: 201 })
}
