import React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import Button from './Button'

/**
 * ConfirmDialog — the one destructive-action confirmation used everywhere,
 * replacing native window.confirm(). Controlled: render it once per page
 * next to the trigger and drive `open` from local state.
 */
const ConfirmDialog = ({
  open,
  onOpenChange,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  danger = true,
}) => (
  <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <AnimatePresence>
      {open && (
        <Dialog.Portal forceMount>
          <Dialog.Overlay asChild forceMount>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />
          </Dialog.Overlay>
          <Dialog.Content asChild forceMount>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-surfaceSolid border border-glassBorder rounded-3xl shadow-2xl p-6"
            >
              <div className="flex items-start gap-3.5 mb-5">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    danger ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <Dialog.Title className="font-bold text-text text-base">{title}</Dialog.Title>
                  {description && (
                    <Dialog.Description className="text-muted text-xs mt-1.5 leading-relaxed">
                      {description}
                    </Dialog.Description>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2.5">
                <Dialog.Close asChild>
                  <Button variant="ghost" size="sm" shape="rounded">
                    {cancelLabel}
                  </Button>
                </Dialog.Close>
                <Button
                  variant={danger ? 'danger' : 'primary'}
                  size="sm"
                  shape="rounded"
                  onClick={() => {
                    onConfirm?.()
                    onOpenChange?.(false)
                  }}
                >
                  {confirmLabel}
                </Button>
              </div>
            </motion.div>
          </Dialog.Content>
        </Dialog.Portal>
      )}
    </AnimatePresence>
  </Dialog.Root>
)

export default ConfirmDialog
