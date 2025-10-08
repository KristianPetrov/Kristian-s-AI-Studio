import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="grid place-items-center gap-10">
      <section className="text-center py-20">
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
    </div>
  );
}


