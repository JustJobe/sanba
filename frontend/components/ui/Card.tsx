import { ReactNode } from "react";
import clsx from "clsx";

interface CardProps {
    children: ReactNode;
    className?: string;
    shadow?: boolean;
    padding?: boolean;
}

export function Card({ children, className, shadow = true, padding = true }: CardProps) {
    return (
        <div className={clsx("border-2 border-foreground bg-background", shadow && "brutalist-shadow", padding && "p-5 sm:p-8", className)}>
            {children}
        </div>
    );
}
