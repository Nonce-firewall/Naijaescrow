import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertTriangle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface NotificationProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export default function Notification({ toasts, onClose }: NotificationProps) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              className={`p-4 rounded-xl border flex items-start gap-3 shadow-lg bg-white ${
                isSuccess 
                  ? 'border-emerald-100 text-emerald-950' 
                  : isError 
                    ? 'border-rose-100 text-rose-950' 
                    : 'border-slate-100 text-slate-950'
              }`}
            >
              <div className="mt-0.5">
                {isSuccess ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                ) : isError ? (
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-slate-100" />
                )}
              </div>
              <div className="flex-1 text-sm font-medium">{toast.message}</div>
              <button
                onClick={() => onClose(toast.id)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
