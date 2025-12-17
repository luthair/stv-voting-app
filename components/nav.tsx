"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import { SunIcon, MoonIcon } from "lucide-react";

export function Nav() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const isAdmin = (session?.user as { isAdmin?: boolean })?.isAdmin;

  const navItems = [
    { href: "/voting", label: "Voting" },
    { href: "/candidates", label: "Candidates" },
    { href: "/results", label: "Results" },
  ];

  if (isAdmin) {
    navItems.push({ href: "/admin", label: "Admin" });
    navItems.push({ href: "/test", label: "Test" });
  }

  return (
    <nav className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="container mx-auto flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/voting" className="text-xl font-bold text-gray-900 dark:text-white">
            Voting App
          </Link>
          <div className="flex gap-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "text-gray-900 dark:text-white"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            className="h-8 w-8 p-0 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            {theme === "dark" ? (
              <SunIcon className="h-4 w-4" />
            ) : (
              <MoonIcon className="h-4 w-4" />
            )}
          </Button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {session?.user?.name}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white"
          >
            Sign Out
          </Button>
        </div>
      </div>
    </nav>
  );
}

