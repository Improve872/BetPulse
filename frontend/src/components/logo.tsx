import Link from "next/link";
import { PulseMark } from "@/components/pulse-mark";

export function Logo() {
  return (
    <Link
      href="/"
      className="group inline-flex shrink-0 items-center gap-2.5"
      aria-label="BetPulse"
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-navy shadow-[0_8px_20px_-10px_rgba(249,115,22,0.9)] transition group-hover:bg-accent-bright">
        <PulseMark className="h-5 w-5" />
      </span>
      <span className="font-display text-[17px] font-semibold tracking-tight text-white">
        Bet<span className="text-accent">Pulse</span>
      </span>
    </Link>
  );
}
