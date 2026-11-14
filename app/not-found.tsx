import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 pt-24">
      <p className="text-xs tracking-[0.28em] text-lime">OFF THE MAP</p>
      <h1 className="mt-4 font-serif text-5xl text-ink">This page is not on the tile.</h1>
      <p className="mt-4 text-ink/70">The route you asked for is not part of gAIa.</p>
      <Link
        href="/"
        className="mt-8 w-fit rounded-full bg-lime px-5 py-3 text-sm font-semibold text-[#14210c]"
      >
        Back to Earth
      </Link>
    </main>
  );
}
