"use client";

import { useEffect, useRef, useState } from 'react';
import { companyInitials, companyLogoSrc } from '../../utils/companyLogo';
import { cx } from './layout';
import styles from './company-logo.module.css';

const SIZES = { sm: 24, md: 32, lg: 48 };

/** Decorative identity beside a readable company name; never a separate action. */
export default function CompanyLogo({ company, size = 'md', loading = 'lazy' }) {
  const src = companyLogoSrc(company);
  const [loaded, setLoaded] = useState(null);
  const [failed, setFailed] = useState(null);
  const imageRef = useRef(null);
  useEffect(() => {
    // SSR images can finish (or fail) before React attaches event handlers.
    const image = imageRef.current;
    if (src && image?.complete) {
      if (image.naturalWidth > 0) setLoaded(src);
      else setFailed(src);
    }
  }, [src]);
  const pixels = SIZES[size] ?? SIZES.md;
  const ready = Boolean(src && loaded === src && failed !== src);
  const showImage = Boolean(src && failed !== src);
  return (
    <span className={cx(styles.logo, styles[size], ready && styles.ready)} aria-hidden="true"
      data-company-logo={company?.symbol} data-logo-state={ready ? 'loaded' : 'fallback'}>
      <span className={styles.initials}>{companyInitials(company)}</span>
      {showImage && <img key={src} ref={imageRef} src={src} alt="" width={pixels} height={pixels}
        loading={loading} decoding="async" draggable={false} referrerPolicy="no-referrer" crossOrigin="anonymous"
        onLoad={() => setLoaded(src)} onError={() => setFailed(src)} />}
    </span>
  );
}

/** Keeps logo/name alignment identical in search, company selection and headers. */
export function CompanyIdentity({ company, children, size = 'md', loading, className }) {
  return <div className={cx(styles.identity, className)}>
    <CompanyLogo company={company} size={size} loading={loading} />
    <div className={styles.copy}>{children}</div>
  </div>;
}
