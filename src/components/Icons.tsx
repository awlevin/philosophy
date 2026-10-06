import type { SVGProps } from "react";

const base = (props: SVGProps<SVGSVGElement>) => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...props,
});

export const ArrowLeft = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
);
export const ArrowRight = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const Search = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>
);
export const Close = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const Sun = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
  </svg>
);
export const Moon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /></svg>
);
export const Sliders = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>
);
export const Grid = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
  </svg>
);
/** A framed portrait: the Classic look. */
export const Frame = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="4" y="3.5" width="16" height="17" rx="1" />
    <circle cx="12" cy="10" r="3" />
    <path d="M7 18.5c.8-2.6 2.8-4 5-4s4.2 1.4 5 4" />
  </svg>
);
export const List = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="5.5" cy="6.5" r="1.3" />
    <circle cx="5.5" cy="12" r="1.3" />
    <circle cx="5.5" cy="17.5" r="1.3" />
    <path d="M10 6.5h10M10 12h10M10 17.5h10" />
  </svg>
);
export const Check = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="m5 12 5 5 9-10" /></svg>
);
export const ChevronDown = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="m6 9 6 6 6-6" /></svg>
);
