import { useEffect, useState } from "react";
import { Check, Share } from "./Icons";

/** Opens the system share sheet where there is one; otherwise copies the link and says so. */
export function ShareButton({ title, text, path }: { title: string; text: string; path: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  const share = async () => {
    const url = new URL(path, window.location.origin).href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        // Dismissed the sheet: nothing to do.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt("Copy this link", url);
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      aria-label={copied ? "Link copied" : "Share this page"}
      title={copied ? "Link copied" : "Share this page"}
      className="grid h-10 w-10 place-items-center rounded-full text-muted transition-colors hover:bg-chip hover:text-ink"
    >
      {copied ? <Check /> : <Share />}
      <span role="status" className="sr-only">
        {copied ? "Link copied" : ""}
      </span>
    </button>
  );
}
