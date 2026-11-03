export function PulseMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className ?? "h-5 w-5"}
    >
      <path
        d="M2.5 13h3.2l1.7-5.5 3.1 10.5 2.2-7.5 1.6 2.5h6.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
