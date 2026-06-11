import { ReactNode } from "react";

interface PageHeaderProps {
    title: ReactNode;
    subtitle?: ReactNode;
    aside?: ReactNode;
}

export function PageHeader({ title, subtitle, aside }: PageHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-12 sm:mb-16 gap-6 border-b border-foreground pb-8">
            <h1 className="font-syne font-bold text-4xl sm:text-6xl md:text-7xl text-primary leading-[0.9]">
                {title}
            </h1>
            <div className="md:text-right">
                {subtitle && <p className="font-mono text-sm max-w-xs text-foreground/70 md:ml-auto">{subtitle}</p>}
                {aside}
            </div>
        </div>
    );
}
