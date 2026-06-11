import clsx from "clsx";

const statusClasses: Record<string, string> = {
    completed: "bg-green-100 text-green-700 border-green-700 dark:bg-green-900/30 dark:text-green-300 dark:border-green-500",
    processing: "bg-yellow-100 text-yellow-700 border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-500",
    failed: "bg-destructive/10 text-destructive border-destructive",
    pending: "bg-yellow-100 text-yellow-700 border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-500",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
    return (
        <span
            className={clsx(
                "text-[10px] uppercase font-bold px-2 py-0.5 border",
                statusClasses[status.toLowerCase()] ?? "bg-foreground/5 text-foreground/60 border-foreground/20",
                className,
            )}
        >
            {status}
        </span>
    );
}
