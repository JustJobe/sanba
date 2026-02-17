"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    // Avoid hydration mismatch
    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <button className="w-10 h-10 border border-black dark:border-white bg-transparent flex items-center justify-center brutalist-shadow" disabled>
                <span className="sr-only">Toggle theme</span>
            </button>
        )
    }

    return (
        <button
            className="w-10 h-10 border border-black dark:border-white bg-transparent hover:bg-accent/20 flex items-center justify-center transition-colors brutalist-shadow"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-foreground dark:text-foreground" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-foreground dark:text-foreground" />
            <span className="sr-only">Toggle theme</span>
        </button>
    )
}
