"use client";
import NewsFeedItem from './NewsFeedItem';
import { Button } from './ui/Button';
import { Text } from './ui/layout';
import { FiCheck } from 'react-icons/fi';
import styles from './personal-news-item.module.css';

export default function PersonalNewsItem({ item, onMarkRead, marking, ...props }) {
  return <NewsFeedItem item={item} {...props} className={styles.row} metadataAction={<>
    {item.readState?.status === 'read' ? <Text size="xs" tone="secondary">Läst</Text>
      : item.readState?.status === 'unread' && onMarkRead && <Button variant="ghost" size="sm"
        className={styles.readAction} data-pending={marking === item.id || undefined}
        disabled={Boolean(marking)} loading={marking === item.id} onClick={() => onMarkRead(item)}>
        <FiCheck aria-hidden="true" />
        Markera som läst
      </Button>}
  </>} />;
}
