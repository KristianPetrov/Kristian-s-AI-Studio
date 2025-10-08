import Link from "next/link";
import type { ReactNode } from "react";

export default function TabsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-red-100">
      <nav className="sticky top-0 z-10 bg-red-950/95 backdrop-blur border-b border-red-900">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-red-200 hover:text-red-100 transition-colors font-medium">
              Home
            </Link>
            <Link href="/studio" className="text-red-200 hover:text-red-100 transition-colors font-medium">
              Studio
            </Link>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
    </div>
  );
}


