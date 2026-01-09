"use client";

import Link from "next/link";

export function Navigation() {
  return (
    <nav className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold text-white">PromptOps</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

