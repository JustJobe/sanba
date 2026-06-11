"use client";

import { ReactNode, useEffect, useRef } from "react";
import clsx from "clsx";

interface ModalProps {
    open: boolean;
    onClose: () => void;
    label: string;
    children: ReactNode;
    className?: string;
}

export function Modal({ open, onClose, label, children, className }: ModalProps) {
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        panelRef.current?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={label}
                tabIndex={-1}
                ref={panelRef}
                onClick={(e) => e.stopPropagation()}
                className={clsx(
                    "bg-background border-2 border-foreground w-full text-center shadow-[8px_8px_0px_rgba(0,0,0,1)] focus:outline-none",
                    className ?? "p-10 max-w-md",
                )}
            >
                {children}
            </div>
        </div>
    );
}
