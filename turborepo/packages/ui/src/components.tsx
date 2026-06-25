"use client"

// ============================================================
// Shared UI primitives for Camp Planner.
// All components are unstyled-first; pass className to extend.
// ============================================================

import { type ReactNode, type ButtonHTMLAttributes, forwardRef } from "react"

// ── Button ───────────────────────────────────────────────────

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger"
  size?: "sm" | "md" | "lg"
  children: ReactNode
}

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300",
  secondary:
    "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50",
  ghost:
    "bg-transparent text-slate-600 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-40",
  danger:
    "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-red-300",
}

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "px-3 py-1.5 text-sm gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
  lg: "px-5 py-2.5 text-base gap-2",
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", className = "", children, ...props }, ref) => (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  ),
)
Button.displayName = "Button"

// ── Badge ────────────────────────────────────────────────────

interface BadgeProps {
  children: ReactNode
  className?: string
}

export function Badge({ children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      {children}
    </span>
  )
}

// ── Sheet (slide-over panel) ─────────────────────────────────

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  side?: "left" | "right"
  children: ReactNode
  width?: string
}

export function Sheet({ open, onClose, title, side = "right", children, width = "w-full max-w-md" }: SheetProps) {
  if (!open) return null
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        className={`fixed top-0 ${side === "right" ? "right-0" : "left-0"} h-full ${width} bg-white shadow-xl z-50 flex flex-col overflow-hidden`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </>
  )
}

// ── Modal ────────────────────────────────────────────────────

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  maxWidth?: string
}

export function Modal({ open, onClose, title, children, maxWidth = "max-w-4xl" }: ModalProps) {
  if (!open) return null
  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col overflow-hidden`}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">{children}</div>
        </div>
      </div>
    </>
  )
}

// ── Toggle Chip ──────────────────────────────────────────────

interface ChipProps {
  label: string
  selected: boolean
  onClick: () => void
  color?: string
}

export function Chip({ label, selected, onClick, color = "" }: ChipProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
        selected
          ? `bg-blue-600 text-white border-blue-600`
          : `bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600`
      } ${color}`}
    >
      {label}
    </button>
  )
}

// ── Field Row (detail view) ──────────────────────────────────

interface FieldRowProps {
  label: string
  value: ReactNode
}

export function FieldRow({ label, value }: FieldRowProps) {
  if (!value || value === "—") return null
  return (
    <div className="flex flex-col gap-0.5 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-slate-800">{value}</span>
    </div>
  )
}

// ── Empty State ──────────────────────────────────────────────

interface EmptyProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function Empty({ icon, title, description, action }: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-3">
      {icon && <div className="text-slate-300 mb-1">{icon}</div>}
      <p className="text-base font-semibold text-slate-700">{title}</p>
      {description && <p className="text-sm text-slate-400 max-w-xs">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

// ── Spinner ──────────────────────────────────────────────────

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin text-blue-500"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z"
      />
    </svg>
  )
}
