"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { HiCheckCircle, HiExclamationCircle, HiInformationCircle, HiXCircle, HiXMark } from "react-icons/hi2";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastProps {
  toast: ToastMessage;
  onDismiss: () => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!toast.duration) return;

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 300);
    }, toast.duration);

    return () => clearTimeout(timer);
  }, [toast.duration, onDismiss]);

  const icons = {
    success: <HiCheckCircle className="h-6 w-6 text-green-400" />,
    error: <HiXCircle className="h-6 w-6 text-red-400" />,
    warning: <HiExclamationCircle className="h-6 w-6 text-yellow-400" />,
    info: <HiInformationCircle className="h-6 w-6 text-blue-400" />,
  };

  const bgColors = {
    success: "bg-green-500/10 border-green-500/20",
    error: "bg-red-500/10 border-red-500/20",
    warning: "bg-yellow-500/10 border-yellow-500/20",
    info: "bg-blue-500/10 border-blue-500/20",
  };

  const textColors = {
    success: "text-green-200",
    error: "text-red-200",
    warning: "text-yellow-200",
    info: "text-blue-200",
  };

  return (
    <div
      className={clsx(
        "flex items-start gap-4 p-4 rounded-xl backdrop-blur-sm border transition-all duration-300",
        bgColors[toast.type],
        textColors[toast.type],
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
      )}
    >
      <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
      <div className="flex-1">
        <p className="font-semibold text-white">{toast.title}</p>
        {toast.message && <p className="text-sm opacity-90 mt-1">{toast.message}</p>}
      </div>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(onDismiss, 300);
        }}
        className={clsx(
          "flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors",
          textColors[toast.type]
        )}
      >
        <HiXMark className="h-5 w-5" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 flex flex-col gap-3 max-w-md pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} onDismiss={() => onDismiss(toast.id)} />
        </div>
      ))}
    </div>
  );
}

// Hook for using toast notifications
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (toast: Omit<ToastMessage, "id">) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: ToastMessage = {
      ...toast,
      id,
      duration: toast.duration ?? 3000,
    };
    setToasts((prev) => [...prev, newToast]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const success = (title: string, message?: string) =>
    addToast({ type: "success", title, message, duration: 3000 });
  const error = (title: string, message?: string) =>
    addToast({ type: "error", title, message, duration: 4000 });
  const warning = (title: string, message?: string) =>
    addToast({ type: "warning", title, message, duration: 3000 });
  const info = (title: string, message?: string) =>
    addToast({ type: "info", title, message, duration: 3000 });

  return {
    toasts,
    removeToast,
    success,
    error,
    warning,
    info,
  };
}
