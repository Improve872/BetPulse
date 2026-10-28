type IconProps = {
  className?: string;
};

function iconProps(className?: string) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function MenuIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function UserIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.7-3.4 3.2-5.5 7-5.5s6.3 2.1 7 5.5" />
    </svg>
  );
}

export function WalletIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a1 1 0 0 1 1 1v2" />
      <path d="M4 7.5V17a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 1 4 7.5z" />
      <path d="M16 13.5h.01" />
    </svg>
  );
}

export function TicketIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v2a2.5 2.5 0 0 0 0 5v2a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5v-2a2.5 2.5 0 0 0 0-5z" />
      <path d="M13 7v10" strokeDasharray="2 3" />
    </svg>
  );
}

export function TrophyIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M8 4h8v4a4 4 0 0 1-8 0z" />
      <path d="M8 5H5v2a3 3 0 0 0 3 3M16 5h3v2a3 3 0 0 1-3 3M12 12v4M9 20h6M10 16h4" />
    </svg>
  );
}

export function ClockIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function EyeIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M3 12s3.2-5.5 9-5.5S21 12 21 12s-3.2 5.5-9 5.5S3 12 3 12z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

export function EyeOffIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M4 4l16 16M9.8 6.8A9.8 9.8 0 0 1 12 6.5c5.8 0 9 5.5 9 5.5a15.4 15.4 0 0 1-2.3 2.8M6.2 8.4A16 16 0 0 0 3 12s3.2 5.5 9 5.5a9.9 9.9 0 0 0 3.1-.5" />
    </svg>
  );
}

export function LockIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

export function InfoIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}

export function UsersIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.6-3 2.6-4.8 5.5-4.8s4.9 1.8 5.5 4.8M16 5.5a3 3 0 0 1 0 5.8M17.5 14.4c1.7.6 2.7 2.1 3 4.6" />
    </svg>
  );
}

export function FilterIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  );
}
