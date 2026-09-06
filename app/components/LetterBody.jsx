import { letterBlocks } from "../utils/editorial";
import { safeSourceUrl } from "../utils/newsroom";
import TickerLink from "./TickerLink";
import styles from "./editorial.module.css";

function inline(text, resolveSymbol) {
  return text
    .split(
      /(\[.*?\]\(.*?\)|&&[\s\S]*?&&|\*\*[^*]+\*\*|\/red\/[^/]+\/red\/|\/green\/[^/]+\/green\/)/g,
    )
    .map((part, index) => {
      if (part.startsWith("&&") && part.endsWith("&&")) {
        const name = part.slice(2, -2).trim();
        const symbol = resolveSymbol?.(name);
        return symbol ? (
          <TickerLink key={index} symbol={symbol}>
            {name}
          </TickerLink>
        ) : (
          <strong key={index}>{name}</strong>
        );
      }
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      if (part.startsWith("/red/") && part.endsWith("/red/"))
        return (
          <span key={index} className={styles.negative}>
            {part.slice(5, -5)}
          </span>
        );
      if (part.startsWith("/green/") && part.endsWith("/green/"))
        return (
          <span key={index} className={styles.positive}>
            {part.slice(7, -7)}
          </span>
        );
      const link = part.match(/^\[(.*?)\]\((.*?)\)$/);
      if (link)
        return safeSourceUrl(link[2]) ? (
          <a
            key={index}
            href={safeSourceUrl(link[2])}
            target="_blank"
            rel="noopener noreferrer"
          >
            {link[1]}
          </a>
        ) : (
          link[1]
        );
      return part;
    });
}

export default function LetterBody({ summary, resolveSymbol }) {
  return (
    <div className={styles.prose}>
      {letterBlocks(summary).map((block, index) =>
        block.type === "heading" ? (
          <h2 key={index}>{inline(block.text, resolveSymbol)}</h2>
        ) : (
          <p key={index}>{inline(block.text, resolveSymbol)}</p>
        ),
      )}
    </div>
  );
}
