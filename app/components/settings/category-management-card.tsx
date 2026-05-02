'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Plus, Tags, Trash2 } from 'lucide-react'
import { Icon } from '@iconify/react'

const T = {
  brand: 'var(--color-brand)',
  card: 'var(--color-card)',
  border: 'var(--color-card-border)',
  ink: 'var(--color-ink)',
  inkMuted: 'var(--color-ink-muted)',
  page: 'var(--color-page)',
  display: 'var(--font-display)',
  text: 'var(--font-text)',
} as const

const CENTS = 100
const DEFAULT_COLOR = '#A3B18A'
const DEFAULT_EMOJI = 'mdi:tag-outline'

function isIconifyName(value: string): boolean {
  return /^[a-z0-9-]+:[a-z0-9-]+$/i.test(value.trim())
}

function CategoryIcon({ name, size = 20 }: { name: string; size?: number }) {
  if (isIconifyName(name)) {
    return <Icon icon={name} width={size} height={size} aria-hidden="true" />
  }
  return <span aria-hidden="true">{name}</span>
}

export interface CategoryItem {
  id: number
  name: string
  emoji: string
  color: string
  monthlyBudget: number
}

interface DraftValues {
  name: string
  emoji: string
  color: string
  budgetEur: string
}

function toDraft(c: CategoryItem): DraftValues {
  return {
    name: c.name,
    emoji: c.emoji,
    color: c.color,
    budgetEur: c.monthlyBudget ? String(Math.round(c.monthlyBudget / CENTS)) : '',
  }
}

const EMPTY_DRAFT: DraftValues = {
  name: '',
  emoji: DEFAULT_EMOJI,
  color: DEFAULT_COLOR,
  budgetEur: '',
}

export function CategoryManagementCard({
  categories,
}: {
  categories: CategoryItem[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draft, setDraft] = useState<DraftValues>(EMPTY_DRAFT)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = () => startTransition(() => router.refresh())

  function startEdit(cat: CategoryItem) {
    setError(null)
    setAdding(false)
    setEditingId(cat.id)
    setDraft(toDraft(cat))
  }

  function startAdd() {
    setError(null)
    setEditingId(null)
    setAdding(true)
    setDraft(EMPTY_DRAFT)
  }

  function cancel() {
    setError(null)
    setEditingId(null)
    setAdding(false)
    setDraft(EMPTY_DRAFT)
  }

  function buildPayload(): Record<string, unknown> | null {
    const name = draft.name.trim()
    const emoji = draft.emoji.trim()
    const color = draft.color.trim()
    if (!name) {
      setError('Name is required')
      return null
    }
    if (!emoji) {
      setError('Emoji is required')
      return null
    }
    if (!/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(color)) {
      setError('Color must be a hex like #A3B18A')
      return null
    }
    const budgetNum = draft.budgetEur.trim() === '' ? 0 : Number(draft.budgetEur)
    if (!Number.isFinite(budgetNum) || budgetNum < 0) {
      setError('Budget must be a positive number')
      return null
    }
    return {
      name,
      emoji,
      color,
      monthlyBudget: Math.round(budgetNum * CENTS),
    }
  }

  async function save() {
    const payload = buildPayload()
    if (!payload) return
    const isEdit = editingId !== null
    const res = await fetch(
      isEdit ? `/api/categories/${editingId}` : '/api/categories',
      {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    )
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      setError(body?.error ?? 'Failed to save')
      return
    }
    cancel()
    refresh()
  }

  async function remove(id: number) {
    if (!confirm('Delete this category? Existing transactions will be uncategorized.')) return
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      setError(body?.error ?? 'Failed to delete')
      return
    }
    cancel()
    refresh()
  }

  return (
    <div
      className="flex flex-col gap-4 p-5"
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 20,
      }}
    >
      <div className="flex items-center gap-2.5">
        <Tags size={22} strokeWidth={1.75} color={T.ink} />
        <h2
          className="text-[22px] leading-none"
          style={{
            fontFamily: T.display,
            fontWeight: 500,
            color: T.ink,
          }}
        >
          Category Management
        </h2>
      </div>

      <div className="flex flex-col gap-3">
        {categories.map((cat) => {
          const isEditing = editingId === cat.id
          if (isEditing) {
            return (
              <CategoryForm
                key={cat.id}
                draft={draft}
                setDraft={setDraft}
                onSave={save}
                onCancel={cancel}
                onDelete={() => remove(cat.id)}
                disabled={isPending}
                error={error}
              />
            )
          }
          return (
            <div
              key={cat.id}
              className="flex items-center justify-between px-4"
              style={{
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                height: 52,
              }}
            >
              <span
                className="flex items-center gap-2 text-[16px]"
                style={{ color: T.ink, fontFamily: T.text }}
              >
                <CategoryIcon name={cat.emoji} />
                {cat.name}
              </span>
              <button
                type="button"
                onClick={() => startEdit(cat)}
                disabled={isPending}
                className="text-[16px] transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{
                  color: T.brand,
                  fontFamily: T.text,
                  fontWeight: 500,
                }}
              >
                Edit
              </button>
            </div>
          )
        })}

        {adding ? (
          <CategoryForm
            draft={draft}
            setDraft={setDraft}
            onSave={save}
            onCancel={cancel}
            disabled={isPending}
            error={error}
          />
        ) : (
          <button
            type="button"
            onClick={startAdd}
            disabled={isPending}
            className="flex items-center justify-center gap-2 transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              height: 52,
              color: T.ink,
              fontFamily: T.text,
              fontSize: 16,
              fontWeight: 500,
            }}
          >
            <Plus size={18} strokeWidth={2} />
            Add Category
          </button>
        )}
      </div>
    </div>
  )
}

function CategoryForm({
  draft,
  setDraft,
  onSave,
  onCancel,
  onDelete,
  disabled,
  error,
}: {
  draft: DraftValues
  setDraft: (v: DraftValues) => void
  onSave: () => void
  onCancel: () => void
  onDelete?: () => void
  disabled: boolean
  error: string | null
}) {
  return (
    <div
      className="flex flex-col gap-3 p-4"
      style={{
        border: `1px solid ${T.border}`,
        borderRadius: 12,
      }}
    >
      <div className="flex gap-2">
        <div
          className="flex shrink-0 items-center justify-center"
          style={{
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            width: 56,
            height: 44,
            color: T.ink,
          }}
          aria-hidden="true"
        >
          <CategoryIcon name={draft.emoji} size={22} />
        </div>
        <input
          type="text"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="Name"
          aria-label="Name"
          className="flex-1 bg-transparent px-3 outline-none"
          style={{
            color: T.ink,
            fontFamily: T.text,
            fontSize: 16,
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            height: 44,
          }}
        />
      </div>

      <input
        type="text"
        value={draft.emoji}
        onChange={(e) => setDraft({ ...draft, emoji: e.target.value })}
        maxLength={64}
        placeholder="Icon (e.g. mdi:cart-outline)"
        aria-label="Icon name"
        spellCheck={false}
        autoCapitalize="none"
        autoCorrect="off"
        className="bg-transparent px-3 outline-none"
        style={{
          color: T.ink,
          fontFamily: T.text,
          fontSize: 14,
          border: `1px solid ${T.border}`,
          borderRadius: 10,
          height: 40,
        }}
      />

      <div className="flex items-center gap-2">
        <label
          className="flex items-center gap-2 px-3"
          style={{
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            height: 44,
          }}
        >
          <span
            style={{
              color: T.inkMuted,
              fontFamily: T.text,
              fontSize: 14,
            }}
          >
            Color
          </span>
          <input
            type="color"
            value={draft.color}
            onChange={(e) => setDraft({ ...draft, color: e.target.value })}
            aria-label="Color"
            className="cursor-pointer bg-transparent"
            style={{ width: 28, height: 28, border: 'none', padding: 0 }}
          />
        </label>
        <div
          className="flex flex-1 items-center gap-2 px-3"
          style={{
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            height: 44,
          }}
        >
          <span
            style={{
              color: T.inkMuted,
              fontFamily: T.text,
              fontSize: 14,
            }}
          >
            Budget €
          </span>
          <input
            type="number"
            min={0}
            step={1}
            value={draft.budgetEur}
            onChange={(e) => setDraft({ ...draft, budgetEur: e.target.value })}
            placeholder="0"
            aria-label="Monthly budget in euros"
            className="w-full bg-transparent text-right outline-none"
            style={{ color: T.ink, fontFamily: T.text, fontSize: 16 }}
          />
        </div>
      </div>

      {error ? (
        <span
          className="text-[13px]"
          style={{ color: '#C0392B', fontFamily: T.text }}
        >
          {error}
        </span>
      ) : null}

      <div className="flex items-center justify-between gap-2 pt-1">
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={disabled}
            aria-label="Delete category"
            className="flex items-center gap-1 transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{
              color: '#C0392B',
              fontFamily: T.text,
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            <Trash2 size={16} strokeWidth={1.75} />
            Delete
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={disabled}
            className="px-4 transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{
              color: T.ink,
              fontFamily: T.text,
              fontSize: 14,
              fontWeight: 500,
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              height: 36,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={disabled}
            className="px-4 transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{
              background: T.brand,
              color: T.page,
              fontFamily: T.text,
              fontSize: 14,
              fontWeight: 500,
              borderRadius: 10,
              height: 36,
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
