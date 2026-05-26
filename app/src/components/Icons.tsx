import type { ReactNode, CSSProperties } from 'react';

interface IconProps {
  size?: number;
  stroke?: number;
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
}

function Icon({ children, size = 18, stroke = 1.6, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconMenu         = (p: IconProps) => <Icon {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Icon>;
export const IconPlus         = (p: IconProps) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>;
export const IconMinus        = (p: IconProps) => <Icon {...p}><path d="M5 12h14" /></Icon>;
export const IconChevronDown  = (p: IconProps) => <Icon {...p}><path d="M6 9l6 6 6-6" /></Icon>;
export const IconChevronRight = (p: IconProps) => <Icon {...p}><path d="M9 6l6 6-6 6" /></Icon>;
export const IconMail         = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
  </Icon>
);
export const IconHelp = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5" />
    <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
  </Icon>
);
export const IconSearch = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
);
export const IconEye = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);
export const IconEyeOff = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 3l18 18" />
    <path d="M10.6 6.1A10.8 10.8 0 0 1 12 6c6.5 0 10 6 10 6a17.7 17.7 0 0 1-3.2 4.1M6.1 6.1C3.4 7.8 2 12 2 12s3.5 6 10 6c1.5 0 2.8-.3 4-.8" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </Icon>
);
export const IconUpload = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 16V4" />
    <path d="M6 10l6-6 6 6" />
    <path d="M4 20h16" />
  </Icon>
);
export const IconEllipsis = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="5"  cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </Icon>
);
export const IconCheck      = (p: IconProps) => <Icon {...p}><path d="M5 12l5 5L20 7" /></Icon>;
export const IconClose      = (p: IconProps) => <Icon {...p}><path d="M6 6l12 12M18 6L6 18" /></Icon>;
export const IconArrowUp    = (p: IconProps) => <Icon {...p}><path d="M12 19V5M5 12l7-7 7 7" /></Icon>;
export const IconArrowDown  = (p: IconProps) => <Icon {...p}><path d="M12 5v14M5 12l7 7 7-7" /></Icon>;
export const IconSortable   = (p: IconProps) => <Icon {...p}><path d="M8 9l4-4 4 4M8 15l4 4 4-4" /></Icon>;
export const IconCopy = (p: IconProps) => (
  <Icon {...p}>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </Icon>
);
export const IconArchive = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="4" width="18" height="4" rx="1" />
    <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
    <path d="M10 12h4" />
  </Icon>
);
export const IconShare = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="6"  cy="12" r="2.5" />
    <circle cx="18" cy="6"  r="2.5" />
    <circle cx="18" cy="18" r="2.5" />
    <path d="M8.2 10.8 15.8 7.2M8.2 13.2 15.8 16.8" />
  </Icon>
);
export const IconTrash = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16" />
    <path d="M10 11v6M14 11v6" />
    <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
    <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </Icon>
);
export const IconUnshare = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="6"  cy="12" r="2.5" />
    <circle cx="18" cy="6"  r="2.5" />
    <circle cx="18" cy="18" r="2.5" />
    <path d="M8.2 10.8 15.8 7.2M8.2 13.2 15.8 16.8" />
    <path d="M3 3l18 18" />
  </Icon>
);
export const IconCalendar = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 9h18M8 3v4M16 3v4" />
  </Icon>
);
export const IconFilter = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 5h16l-6 8v6l-4-2v-4z" />
  </Icon>
);
export const IconBasket = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 8l-3 13h16L17 8z" />
    <path d="M9 8l2-5M15 8l-2-5" />
    <path d="M10 13v4M14 13v4" />
  </Icon>
);
export const IconEdit = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 20h4l11-11-4-4L4 16z" />
    <path d="M14 6l4 4" />
  </Icon>
);
