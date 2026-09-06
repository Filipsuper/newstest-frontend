import { newsSummary } from "../utils/newsSummary";
import { Text } from "./ui/layout";
import styles from "./news-summary.module.css";

export default function NewsSummary({ value, reading = false }) {
  const summary = newsSummary(value);
  if (!summary) return null;
  return (
    <div className={styles.summary} data-reading={reading || undefined}>
      <Text as="span" size="xs" tone="secondary">AI-sammanfattning</Text>
      {summary.text && <p>{summary.text}</p>}
      {summary.bullets.length > 0 && (
        <ul aria-label="AI-sammanfattningens huvudpunkter">
          {summary.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
        </ul>
      )}
    </div>
  );
}
