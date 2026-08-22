/**
 * Emoji utility — uses Twemoji to parse Unicode emoji into consistent
 * cross-platform images (Twitter-style).
 *
 * twemoji.parse(element) converts all emoji inside a DOM element to <img> tags
 * pointing to the Twemoji CDN, ensuring identical rendering on all devices.
 */
import twemoji from "twemoji";

/**
 * Parse all emoji inside a DOM element using Twemoji.
 * Safe to call multiple times — re-parses only unparsed emoji.
 *
 * @example
 *   useEffect(() => { if (ref.current) parseEmoji(ref.current); }, [text]);
 */
export function parseEmoji(element: HTMLElement): void {
  twemoji.parse(element, {
    folder: "svg",
    ext: ".svg",
    base: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/",
    className: "emoji",
  });
}

/**
 * Get the CDN URL for a specific emoji character.
 * Useful for rendering emoji as <img> in places where DOM parsing isn't available.
 */
export function getEmojiUrl(emoji: string): string {
  const codePoints = Array.from(emoji)
    .map((char) => {
      const cp = char.codePointAt(0);
      if (cp === undefined) return "";
      return cp.toString(16);
    })
    .filter(Boolean)
    .join("-");
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codePoints}.svg`;
}
