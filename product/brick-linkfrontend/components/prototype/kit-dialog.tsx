"use client";

import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

export function KitDialog({
  open,
  onClose,
  title,
  description,
  children,
  wide = false,
  minimal = false,
  headingAction,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
  minimal?: boolean;
  headingAction?: ReactNode;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="kit-overlay" />
        <Dialog.Content
          className={`kit-dialog${wide ? " kit-dialog-wide" : ""}${minimal ? " kit-dialog-minimal" : ""}`}
          {...(description ? {} : { "aria-describedby": undefined })}
        >
          {minimal ? (
            <>
              <Dialog.Title className="sr-only">{title}</Dialog.Title>
              <Dialog.Description className="sr-only">
                {description}
              </Dialog.Description>
              <Dialog.Close className="kit-icon-button kit-dialog-close" aria-label="Close">
                <X size={20} />
              </Dialog.Close>
            </>
          ) : (
            <div className="kit-dialog-heading">
              <div>
                <Dialog.Title className="kit-dialog-title">{title}</Dialog.Title>
                {description ? (
                  <Dialog.Description className="kit-dialog-description">
                    {description}
                  </Dialog.Description>
                ) : null}
              </div>
              <div className="kit-dialog-tools">
                {headingAction}
                <Dialog.Close className="kit-icon-button" aria-label="Close">
                  <X size={22} />
                </Dialog.Close>
              </div>
            </div>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
