import { NextRequest, NextResponse } from 'next/server'
import { authedClient } from '@/lib/api-client'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = req.cookies.get('auth_token')?.value
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const result = await authedClient(token)<unknown>(`/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error || 'Update category failed' },
      { status: result.status || 500 },
    )
  }
  return NextResponse.json(result.data)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = req.cookies.get('auth_token')?.value
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const result = await authedClient(token)<unknown>(`/categories/${id}`, {
    method: 'DELETE',
  })

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error || 'Delete category failed' },
      { status: result.status || 500 },
    )
  }
  return new NextResponse(null, { status: 204 })
}
