import type { CSSProperties } from 'react';

/** Product name shown while EOS Cloud 2 is in Alpha. Remove the suffix at Beta. */
export const PRODUCT_NAME = 'EOS Cloud 2';
/** Capitalised, never all caps. */
export const ALPHA_LABEL = 'Alpha';

export function AlphaBrand({ style, uppercase = false }: { style?: CSSProperties; uppercase?: boolean }) {
  return (
    <span style={style}>
      <span style={uppercase ? { textTransform: 'uppercase' } : undefined}>{PRODUCT_NAME}</span>
      {' - '}
      {ALPHA_LABEL}
    </span>
  );
}
