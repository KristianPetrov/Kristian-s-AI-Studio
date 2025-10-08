import Image from "next/image";
import Link from "next/link";

export default function Home() {
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
      <main className="mx-auto max-w-6xl px-4 py-20 grid place-items-center text-center">
        <section>
          <div className="relative w-screen -mx-[calc(50vw-50%)] h-[50vh] sm:h-[60vh]">
            <Image
              src="/kristian-digital-ai-logo.png"
              alt="Kristian's Digital Studio Logo"
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
          </div>
          <div className="mt-10">
            <Link
              href="/studio"
              className="inline-flex items-center rounded-md bg-red-800 hover:bg-red-700 text-red-100 px-6 py-3 font-medium transition-colors border border-red-900"
            >
              Open Studio
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
