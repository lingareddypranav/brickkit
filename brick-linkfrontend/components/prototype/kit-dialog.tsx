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
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  children: ReactNode;
  wide?: boolean;
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
          className={`kit-dialog ${wide ? "kit-dialog-wide" : ""}`}
        >
          <div className="kit-dialog-heading">
            <div>
              <Dialog.Title className="kit-dialog-title">{title}</Dialog.Title>
              <Dialog.Description className="kit-dialog-description">
                {description}
              </Dialog.Description>
            </div>
            <Dialog.Close className="kit-icon-button" aria-label="Close">
              <X size={22} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
