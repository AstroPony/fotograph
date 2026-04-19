import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="border border-black p-12 max-w-sm w-full text-center">
        <p className="text-xs uppercase tracking-widest font-medium text-black/40 mb-2">Fout 404</p>
        <h1 className="font-serif font-black text-6xl uppercase leading-none mb-6">
          Niet gevonden
        </h1>
        <p className="text-sm text-black/60 mb-8">
          Deze pagina bestaat niet of is verplaatst.
        </p>
        <Link
          href="/"
          className="border border-black px-6 py-2 text-xs uppercase tracking-widest font-medium hover:bg-black hover:text-white transition-colors"
        >
          Terug naar dashboard
        </Link>
      </div>
    </div>
  );
}
