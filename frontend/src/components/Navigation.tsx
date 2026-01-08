"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, TrendingUp, BarChart3, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: "/prompts", label: "Prompts", icon: Home },
    { href: "/prompts/create", label: "Create", icon: FileText },
    { href: "/prompts/evaluate", label: "Evaluate", icon: BarChart3 },
    { href: "/prompts/improve", label: "Improve", icon: TrendingUp },
  ];

  return (
    <nav className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold text-white">PromptOps</span>
            </Link>
          </div>
          <div className="flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

