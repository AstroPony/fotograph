"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLinksProps {
  credits: number;
  showBatch: boolean;
}

export function NavLinks({ credits, showBatch }: NavLinksProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function active(href: string) {
    if (href === "/upload") return pathname === "/upload";
    return pathname === href || pathname.startsWith(href + "/");
  }

  const linkClass = (href: string) =>
    `hover:underline underline-offset-4 transition-opacity ${active(href) ? "underline" : "opacity-60 hover:opacity-100"}`;

  const links = (
    <>
      <Link href="/upload" className={linkClass("/upload")}>
        Nieuwe foto
      </Link>
      {showBatch && (
        <Link href="/upload/batch" className={linkClass("/upload/batch")}>
          Batch
        </Link>
      )}
      <Link
        href="/upgrade"
        className={`border px-2 py-0.5 transition-colors ${
          active("/upgrade")
            ? "border-black bg-black text-white"
            : "border-black hover:bg-black hover:text-white"
        }`}
      >
        {credits >= 99999 ? "∞ credits" : `${credits} credit${credits !== 1 ? "s" : ""}`}
      </Link>
      <Link href="/account" className={linkClass("/account")}>
        Account
      </Link>
    </>
  );

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden sm:flex items-center gap-8 text-xs uppercase tracking-widest font-medium">
        {links}
      </nav>

      {/* Mobile hamburger */}
      <div className="flex sm:hidden items-center">
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-xs uppercase tracking-widest font-medium border border-black px-2 py-1"
          aria-label="Menu"
        >
          {open ? "✕" : "☰"}
        </button>

        {open && (
          <div
            className="fixed inset-0 top-14 z-50 bg-white border-t border-black flex flex-col"
            onClick={() => setOpen(false)}
          >
            <nav className="flex flex-col text-xs uppercase tracking-widest font-medium">
              <Link href="/upload" className="px-6 py-4 border-b border-black/10 hover:bg-black/5">
                Nieuwe foto
              </Link>
              {showBatch && (
                <Link href="/upload/batch" className="px-6 py-4 border-b border-black/10 hover:bg-black/5">
                  Batch
                </Link>
              )}
              <Link href="/upgrade" className="px-6 py-4 border-b border-black/10 hover:bg-black/5">
                {credits >= 99999 ? "∞" : credits} credits
              </Link>
              <Link href="/account" className="px-6 py-4 hover:bg-black/5">
                Account
              </Link>
            </nav>
          </div>
        )}
      </div>
    </>
  );
}
