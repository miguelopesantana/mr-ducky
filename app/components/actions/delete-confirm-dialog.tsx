'use client'

import { AlertDialog } from '@base-ui/react/alert-dialog'
import { T } from '@/lib/theme'

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (next: boolean) => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.55)' }}
        />
        <AlertDialog.Popup
          className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] outline-none rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(38, 38, 38, 0.96)',
            border: `1px solid ${T.border}`,
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="px-5 pt-5 pb-4 text-center flex flex-col gap-1.5">
            <AlertDialog.Title
              className="text-[16px] tracking-[-0.3px]"
              style={{ color: T.ink, fontWeight: 600, fontFamily: T.display }}
            >
              Delete Action
            </AlertDialog.Title>
            <AlertDialog.Description
              className="text-[13px] leading-[18px]"
              style={{ color: T.inkMuted }}
            >
              The action will be deleted and cannot be restored later.
            </AlertDialog.Description>
          </div>
          <div className="flex flex-col" style={{ borderTop: `1px solid ${T.border}` }}>
            <AlertDialog.Close
              className="py-3 text-[16px] tracking-[-0.3px] transition-opacity hover:opacity-80"
              style={{ color: '#3D8BFF', fontWeight: 600, fontFamily: T.display }}
            >
              Cancel
            </AlertDialog.Close>
            <button
              type="button"
              onClick={() => {
                onConfirm()
                onOpenChange(false)
              }}
              className="py-3 text-[16px] tracking-[-0.3px] transition-opacity hover:opacity-80"
              style={{
                color: T.danger,
                fontWeight: 500,
                borderTop: `1px solid ${T.border}`,
                fontFamily: T.display,
              }}
            >
              Delete
            </button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
