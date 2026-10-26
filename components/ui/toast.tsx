"use client";

import * as React from "react";
import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { CircleCheck, Info, LoaderCircle, OctagonX, TriangleAlert, X } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";

const toast = ToastPrimitive.createToastManager();

function ToastProvider({ ...props }: ToastPrimitive.Provider.Props) {
  return <ToastPrimitive.Provider {...props} />;
}

function ToastPortal({ ...props }: ToastPrimitive.Portal.Props) {
  return <ToastPrimitive.Portal data-slot="toast-portal" {...props} />;
}

function ToastViewport({ className, ...props }: ToastPrimitive.Viewport.Props) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      className={cn(
        // Top-left, under the sticky masthead (0.5px rule + brand row + nav row).
        "pointer-events-none fixed left-3 top-[5.75rem] z-[100] flex w-[calc(100vw-1.5rem)] max-w-sm flex-col gap-2.5 outline-none sm:left-6 sm:top-[6.5rem]",
        className,
      )}
      {...props}
    />
  );
}

function Toast({ className, ...props }: ToastPrimitive.Root.Props) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      className={cn(
        "group/toast pointer-events-auto relative w-full origin-top rounded-xl border border-border bg-popover text-popover-foreground shadow-lg shadow-foreground/5 outline-none select-none",
        "[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--toast-swipe-movement-y))]",
        "transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "data-starting-style:opacity-0 data-starting-style:[transform:translateY(-0.75rem)]",
        "data-ending-style:opacity-0",
        "data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
        "data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",
        "data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))]",
        "data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))]",
        "data-limited:hidden",
        className,
      )}
      {...props}
    />
  );
}

function ToastContent({ className, ...props }: ToastPrimitive.Content.Props) {
  return (
    <ToastPrimitive.Content
      data-slot="toast-content"
      className={cn("flex h-full items-start gap-3 p-3.5", className)}
      {...props}
    />
  );
}

function ToastTitle({ className, ...props }: ToastPrimitive.Title.Props) {
  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      className={cn("text-sm font-medium leading-snug", className)}
      {...props}
    />
  );
}

function ToastDescription({ className, ...props }: ToastPrimitive.Description.Props) {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      className={cn("text-[13px] leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  );
}

function ToastAction({
  className,
  render = <Button variant="outline" size="sm" />,
  ...props
}: ToastPrimitive.Action.Props) {
  return (
    <ToastPrimitive.Action
      data-slot="toast-action"
      render={render}
      className={cn("shrink-0", className)}
      {...props}
    />
  );
}

function ToastClose({
  className,
  children,
  render = <Button variant="ghost" size="icon-sm" />,
  ...props
}: ToastPrimitive.Close.Props) {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      aria-label="Close toast"
      render={render}
      className={cn(
        "relative shrink-0 text-muted-foreground after:absolute after:-inset-2 after:content-[''] hover:text-foreground",
        className,
      )}
      {...props}
    >
      {children ?? <X aria-hidden="true" />}
    </ToastPrimitive.Close>
  );
}

const iconTone: Record<string, string> = {
  success: "text-success",
  info: "text-info",
  warning: "text-warning",
  error: "text-destructive",
  loading: "text-muted-foreground animate-spin",
};

function ToastIcon({ type }: { type: string | undefined }) {
  if (!type) return null;

  let icon: React.ReactNode = null;

  if (type === "success") icon = <CircleCheck aria-hidden="true" />;
  if (type === "info") icon = <Info aria-hidden="true" />;
  if (type === "warning") icon = <TriangleAlert aria-hidden="true" />;
  if (type === "error") icon = <OctagonX aria-hidden="true" />;
  if (type === "loading") icon = <LoaderCircle aria-hidden="true" />;

  if (!icon) return null;

  return (
    <span
      data-slot="toast-icon"
      className={cn(
        "mt-0.5 shrink-0 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        iconTone[type],
      )}
    >
      {icon}
    </span>
  );
}

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager();

  // Base UI hands back newest-first, which is exactly how they should stack
  // in a top-left viewport: the latest toast sits closest to the corner.
  return toasts.map((toastItem) => (
    <Toast key={toastItem.id} toast={toastItem}>
      <ToastContent>
        <ToastIcon type={toastItem.type} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <ToastTitle />
          <ToastDescription />
        </div>
        <ToastAction />
        <ToastClose />
      </ToastContent>
    </Toast>
  ));
}

function Toaster({ children, toastManager = toast, ...props }: ToastPrimitive.Provider.Props) {
  return (
    <ToastProvider toastManager={toastManager} {...props}>
      {children}
      <ToastPortal>
        <ToastViewport>
          <ToastList />
        </ToastViewport>
      </ToastPortal>
    </ToastProvider>
  );
}

const createToastManager = ToastPrimitive.createToastManager;
const useToastManager = ToastPrimitive.useToastManager;

export {
  Toaster,
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastPortal,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  createToastManager,
  toast,
  useToastManager,
};
