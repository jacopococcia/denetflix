import {describe, expect, it} from 'vitest';
import {buildAmazonSearchUrl, lookupVerifiedAsin} from '../../services/amazonService';
import {
  isSafeAssetPath,
  sanitizeExternalUrl,
  sanitizeImageUrl,
  sanitizeYoutubeId,
} from '../urlSecurity';

describe('URL & Media Security Helpers', () => {
  describe('sanitizeExternalUrl', () => {
    it('allows valid https and http URLs', () => {
      expect(sanitizeExternalUrl('https://www.amazon.com/dp/B00005JMAH/')).toBe(
        'https://www.amazon.com/dp/B00005JMAH/',
      );
      expect(sanitizeExternalUrl('  http://example.com/watch?v=1  ')).toBe(
        'http://example.com/watch?v=1',
      );
    });

    it('blocks dangerous schemes, embedded credentials, relative URLs, and oversized values', () => {
      expect(sanitizeExternalUrl('javascript:alert(1)')).toBeNull();
      expect(sanitizeExternalUrl('JAVASCRIPT:alert(document.cookie)')).toBeNull();
      expect(sanitizeExternalUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
      expect(sanitizeExternalUrl('vbscript:msgbox(1)')).toBeNull();
      expect(sanitizeExternalUrl('file:///etc/passwd')).toBeNull();
      expect(sanitizeExternalUrl('//evil.com/phish')).toBeNull();
      expect(sanitizeExternalUrl('https://user:pass@example.com/')).toBeNull();
      expect(sanitizeExternalUrl(`https://example.com/${'a'.repeat(2100)}`)).toBeNull();
      expect(sanitizeExternalUrl(null)).toBeNull();
      expect(sanitizeExternalUrl('')).toBeNull();
    });
  });

  describe('sanitizeImageUrl', () => {
    it('allows valid relative asset paths and https URLs', () => {
      expect(sanitizeImageUrl('./assets/aistudio/ghoul.png')).toBe('./assets/aistudio/ghoul.png');
      expect(sanitizeImageUrl('/assets/poster.jpg')).toBe('/assets/poster.jpg');
      expect(sanitizeImageUrl('https://image.tmdb.org/t/p/w500/abc.jpg')).toBe(
        'https://image.tmdb.org/t/p/w500/abc.jpg',
      );
    });

    it('blocks protocol-relative URLs, path traversal, control chars, and dangerous schemes', () => {
      expect(sanitizeImageUrl('//evil.com/tracker.png')).toBeNull();
      expect(sanitizeImageUrl('/../../etc/passwd')).toBeNull();
      expect(sanitizeImageUrl('./assets/../secret.png')).toBeNull();
      expect(sanitizeImageUrl('/assets/poster.jpg\r\nX-Injected: 1')).toBeNull();
      expect(sanitizeImageUrl('javascript:alert(1)')).toBeNull();
      expect(sanitizeImageUrl('data:image/svg+xml,<svg onload=alert(1)>')).toBeNull();
    });
  });

  describe('isSafeAssetPath', () => {
    it('validates single-slash relative paths safely', () => {
      expect(isSafeAssetPath('/abc123.jpg')).toBe(true);
      expect(isSafeAssetPath('//evil.com/x.jpg')).toBe(false);
      expect(isSafeAssetPath('/../secret.jpg')).toBe(false);
      expect(isSafeAssetPath('relative.jpg')).toBe(false);
      expect(isSafeAssetPath('/bad\npath.jpg')).toBe(false);
      expect(isSafeAssetPath(`/${'a'.repeat(600)}`)).toBe(false);
    });
  });

  describe('sanitizeYoutubeId', () => {
    it('accepts strict 11-character YouTube IDs and rejects injection attempts', () => {
      expect(sanitizeYoutubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(sanitizeYoutubeId('  abc_DEF-123  ')).toBe('abc_DEF-123');
      expect(sanitizeYoutubeId('short')).toBeNull();
      expect(sanitizeYoutubeId('dQw4w9WgXcQ?autoplay=1&origin=evil')).toBeNull();
      expect(sanitizeYoutubeId('../evil1234')).toBeNull();
      expect(sanitizeYoutubeId('<script>123')).toBeNull();
    });
  });

  describe('prototype pollution & runtime safety', () => {
    it('does not leak prototype properties from verified ASIN map', () => {
      expect(lookupVerifiedAsin('constructor')).toBeNull();
      expect(lookupVerifiedAsin('toString')).toBeNull();
      expect(lookupVerifiedAsin('__proto__')).toBeNull();
    });

    it('does not throw when building fallback Amazon search URL for empty title', () => {
      const url = buildAmazonSearchUrl('   ', 1982, 'US');
      expect(url).toContain('https://www.amazon.com/s?');
      expect(url).toContain('tag=jr0605-20');
      expect(url).toContain('retro+cult+movie');
    });
  });
});
