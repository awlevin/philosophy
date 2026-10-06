import { m } from "framer-motion";
import type { Transition } from "framer-motion";
import type { Philosopher } from "../data/philosophers";
import { eraVars } from "../lib/era";
import { morph, portraitId } from "../lib/motion";
import { Monogram } from "./Monogram";

/** `sizes` for grid cards. Also used for the detail page's placeholder so it hits the same cached file. */
export const GRID_SIZES =
  "(min-width: 1280px) 12vw, (min-width: 1024px) 14vw, (min-width: 768px) 16vw, (min-width: 640px) 19vw, 23vw";

type Props = {
  p: Philosopher;
  /** `sizes` attribute for responsive image selection. */
  sizes: string;
  eager?: boolean;
  /** Hint the browser to fetch this image first (likely LCP). */
  priority?: boolean;
  /** The name is already next to the image (grid cards). */
  decorative?: boolean;
  /** Render the frame but don't fetch the image yet. */
  defer?: boolean;
  /** Show the grid-sized image underneath while the larger one loads (no blank frame mid-morph). */
  withGridPlaceholder?: boolean;
  className?: string;
  /** Corner radius in px. Set as a style (not a class) so it morphs cleanly between shapes. */
  radius?: number;
  layoutTransition?: Transition;
  /** Morph to and from this philosopher's card. Off when there's no card to come from (quiz results). */
  shared?: boolean;
};

/** Square, face-centered portrait on its era's tint. Shares a layoutId between grid card and detail page. */
export function Portrait({
  p,
  sizes,
  eager,
  priority,
  decorative,
  defer,
  withGridPlaceholder,
  className = "",
  radius = 0,
  layoutTransition = morph,
  shared = true,
}: Props) {
  const { src } = p.portrait;
  return (
    <m.div
      layoutId={shared ? portraitId(p.slug) : undefined}
      layoutCrossfade={false}
      transition={{ layout: layoutTransition }}
      style={{ borderRadius: radius, ...eraVars(p.era) }}
      className={`portrait aspect-square ${className}`}
    >
      {!src ? (
        <Monogram name={p.name} />
      ) : defer ? null : (
        <>
          {withGridPlaceholder && <Img p={p} sizes={GRID_SIZES} alt="" />}
          <Img
            p={p}
            sizes={sizes}
            alt={decorative ? "" : `Portrait of ${p.name}`}
            loading={eager ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
          />
        </>
      )}
    </m.div>
  );
}

/** Small portrait with no shared layout (avatars, face piles), so it never steals a card's morph. */
export function Thumb({ p, className = "", sizes = "64px" }: { p: Philosopher; className?: string; sizes?: string }) {
  return (
    <div className={`portrait aspect-square ${className}`} style={eraVars(p.era)}>
      {p.portrait.src ? <Img p={p} sizes={sizes} alt="" /> : <Monogram name={p.name} />}
    </div>
  );
}

function Img({
  p,
  sizes,
  alt,
  loading = "lazy",
  fetchPriority = "auto",
}: {
  p: Philosopher;
  sizes: string;
  alt: string;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "auto";
}) {
  const { src, focus = "50% 22%", zoom } = p.portrait;
  return (
    <picture>
      <source type="image/avif" srcSet={srcSet(src, "avif")} sizes={sizes} />
      <img
        src={src}
        srcSet={srcSet(src, "jpg")}
        sizes={sizes}
        alt={alt}
        loading={loading}
        decoding="async"
        fetchPriority={fetchPriority}
        width={600}
        height={600}
        draggable={false}
        style={{
          objectPosition: focus,
          transform: zoom ? `scale(${zoom})` : undefined,
          transformOrigin: focus,
        }}
      />
    </picture>
  );
}

const srcSet = (src: string, ext: "avif" | "jpg") => {
  const base = src.replace(/\.jpg$/, "");
  return `${base}-320.${ext} 320w, ${base}-480.${ext} 480w, ${base}.${ext} 600w`;
};
