import { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import clsx from "clsx";

type Variant = "primary" | "outline" | "ghost" | "accent";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
    primary: "bg-foreground text-background hover:bg-primary border border-foreground",
    outline: "bg-transparent text-foreground border border-foreground hover:bg-foreground hover:text-background",
    ghost: "bg-transparent text-foreground/60 hover:text-foreground border border-transparent",
    accent: "bg-transparent text-accent border border-accent hover:bg-accent hover:text-background",
};

const sizeClasses: Record<Size, string> = {
    sm: "px-3 py-1.5 text-[10px]",
    md: "px-4 py-2.5 text-xs",
    lg: "px-6 py-4 text-sm",
};

function buttonClass(variant: Variant, size: Size, shadow: boolean, className?: string) {
    return clsx(
        "inline-flex items-center justify-center gap-2 font-mono font-bold uppercase tracking-widest transition-colors",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        shadow && "brutalist-shadow",
        className,
    );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    shadow?: boolean;
    children: ReactNode;
}

export function Button({ variant = "primary", size = "md", shadow = false, className, children, ...rest }: ButtonProps) {
    return (
        <button className={buttonClass(variant, size, shadow, className)} {...rest}>
            {children}
        </button>
    );
}

interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
    href: string;
    variant?: Variant;
    size?: Size;
    shadow?: boolean;
    external?: boolean;
    children: ReactNode;
}

export function ButtonLink({ href, variant = "primary", size = "md", shadow = false, external = false, className, children, ...rest }: ButtonLinkProps) {
    const cls = buttonClass(variant, size, shadow, className);
    if (external) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer" className={cls} {...rest}>
                {children}
            </a>
        );
    }
    return (
        <Link href={href} className={cls} {...rest}>
            {children}
        </Link>
    );
}
