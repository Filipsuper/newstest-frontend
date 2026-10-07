import { newsSummary } from "../utils/newsSummary";
import { newsCardExcerpt } from "../utils/newsCardPreview";
import { Text } from "./ui/layout";
import styles from "./news-summary.module.css";

export default function NewsSummary({ value, reading = false, preview = false, compact = false,
  label = "AI-sammanfattning", shortLabel = "Kort AI-sammanfattning" }) {
  const summary = newsSummary(value);
  if (!summary) return null;
  if (compact && !reading) return <p className={styles.excerpt} aria-label={shortLabel}>{newsCardExcerpt(value)}</p>;
  const bullets = preview ? summary.bullets.slice(0, summary.text ? 0 : 2) : summary.bullets;
  return (
    <div className={styles.summary} data-reading={reading || undefined} data-preview={preview || undefined}>
      <Text as="span" size="xs" tone="secondary">{label}</Text>
      {summary.text && <p>{summary.text}</p>}
      {bullets.length > 0 && (
        <ul aria-label="AI-sammanfattningens huvudpunkter">
          {bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
        </ul>
      )}
    </div>
  );
}
