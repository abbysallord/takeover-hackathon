import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, HelpCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info',
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="relative w-full max-w-md bg-[#1e1e21] border border-white/10 rounded-2xl p-6 shadow-2xl z-10 flex flex-col text-left"
          >
            {/* Header Icon & Title */}
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                type === 'danger' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
              }`}>
                {type === 'danger' ? <AlertTriangle className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-semibold text-white tracking-wide">{title}</h3>
                <p className="text-xs text-white/50 leading-relaxed mt-2">{message}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-xl text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                }}
                className={`px-4 py-2 rounded-xl text-xs font-medium text-white shadow-lg transition-all ${
                  type === 'danger' 
                    ? 'bg-red-500 hover:bg-red-600 shadow-red-500/10' 
                    : 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/10'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
