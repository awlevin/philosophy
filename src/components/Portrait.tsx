import { m } from "framer-motion";
import type { Transition } from "framer-motion";
import type { Philosopher } from "../data/philosophers";
import { morph, portraitId } from "../lib/motion";
import { Monogram } from "./Monogram";

/** `sizes` for grid cards. Also used for the detail page's placeholder so it hits the same cached file. */
export const GRID_SIZES =
  "(min-width: 1280px) 15vw, (min-width: 1024px) 18vw, (min-width: 768px) 23vw, (min-width: 640px) 31vw, 46vw";

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
  layoutTransition?: Transition;
};

/** Square, face-centered, tinted portrait. Shares a layoutId between grid card and detail page. */
export function Portrait({
  p,
  sizes,
  eager,
  priority,
  decorative,
  defer,
  withGridPlaceholder,
  className = "",
  layoutTransition = morph,
}: Props) {
  const { src } = p.portrait;
  return (
    <m.div
      layoutId={portraitId(p.slug)}
      layoutCrossfade={false}
      transition={{ layout: layoutTransition }}
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
