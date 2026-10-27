import Link from "next/link";

export function Logo() {
  return (
    <Link
      href="/"
      className="group inline-flex shrink-0 items-center gap-2.5"
      aria-label="BetPulse"
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-white shadow-[0_8px_20px_-10px_rgba(249,115,22,0.9)] transition group-hover:bg-accent-strong">
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M2.5 13h3.2l1.7-5.5 3.1 10.5 2.2-7.5 1.6 2.5h6.7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="font-display text-[17px] font-semibold tracking-tight text-white">
        Bet<span className="text-accent">Pulse</span>
      </span>
    </Link>
  );
}
