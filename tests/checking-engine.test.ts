import { describe, it, expect } from 'vitest';
import {
  fetchAndParse,
  extractSelectorText,
  normalizeContent,
  generateHash,
  evaluateCondition,
} from '@/lib/utils/checking-engine';

describe('checking-engine', () => {
  describe('normalizeContent', () => {
    it('should lowercase and normalize whitespace', () => {
      const input = 'Hello   WORLD\n\nTest';
      const result = normalizeContent(input);
      expect(result).toBe('hello world test');
    });

    it('should trim whitespace', () => {
      const input = '  test  ';
      const result = normalizeContent(input);
      expect(result).toBe('test');
    });
  });

  describe('generateHash', () => {
    it('should generate consistent hash for same content', () => {
      const content = 'Test Content';
      const hash1 = generateHash(content);
      const hash2 = generateHash(content);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different content', () => {
      const hash1 = generateHash('Content 1');
      const hash2 = generateHash('Content 2');
      expect(hash1).not.toBe(hash2);
    });

    it('should be case-insensitive', () => {
      const hash1 = generateHash('Test');
      const hash2 = generateHash('test');
      expect(hash1).toBe(hash2);
    });
  });

  describe('extractSelectorText', () => {
    it('should extract text from simple HTML', () => {
      const html = '<div class="status">Approved</div>';
      const result = extractSelectorText(html, '.status');
      expect(result).toBe('Approved');
    });

    it('should return null for non-existent selector', () => {
      const html = '<div>No status here</div>';
      const result = extractSelectorText(html, '.status');
      expect(result).toBeNull();
    });

    it('should handle ID selectors', () => {
      const html = '<div id="status">Pending</div>';
      const result = extractSelectorText(html, '#status');
      expect(result).toBe('Pending');
    });

    it('should handle tag selectors', () => {
      const html = '<h1>Page Title</h1>';
      const result = extractSelectorText(html, 'h1');
      expect(result).toBe('Page Title');
    });
  });

  describe('evaluateCondition', () => {
    describe('TEXT_MATCH', () => {
      it('should trigger when text appears', () => {
        const condition = {
          type: 'TEXT_MATCH',
          config: {
            text_to_match: 'Approved',
            match_mode: 'contains',
            trigger_on: 'appears',
          },
        };

        const result = evaluateCondition(
          condition,
          null,
          { plainText: 'Your application is Approved' }
        );

        expect(result.triggered).toBe(true);
        expect(result.reason).toContain('Approved');
      });

      it('should not trigger when text is missing', () => {
        const condition = {
          type: 'TEXT_MATCH',
          config: {
            text_to_match: 'Approved',
            match_mode: 'contains',
            trigger_on: 'appears',
          },
        };

        const result = evaluateCondition(
          condition,
          null,
          { plainText: 'Your application is Pending' }
        );

        expect(result.triggered).toBe(false);
      });

      it('should trigger when text disappears', () => {
        const condition = {
          type: 'TEXT_MATCH',
          config: {
            text_to_match: 'Pending',
            match_mode: 'contains',
            trigger_on: 'disappears',
          },
        };

        const result = evaluateCondition(
          condition,
          { extracted_plain_text_preview: 'Status: Pending' },
          { plainText: 'Status: Approved' }
        );

        expect(result.triggered).toBe(true);
        expect(result.reason).toContain('disappeared');
      });

      it('should handle exact match mode', () => {
        const condition = {
          type: 'TEXT_MATCH',
          config: {
            text_to_match: 'Approved',
            match_mode: 'exact',
            trigger_on: 'appears',
          },
        };

        const result = evaluateCondition(
          condition,
          null,
          { plainText: 'Approved' }
        );

        expect(result.triggered).toBe(true);
      });

      it('should reject partial match in exact mode', () => {
        const condition = {
          type: 'TEXT_MATCH',
          config: {
            text_to_match: 'Approved',
            match_mode: 'exact',
            trigger_on: 'appears',
          },
        };

        const result = evaluateCondition(
          condition,
          null,
          { plainText: 'Not Approved Yet' }
        );

        expect(result.triggered).toBe(false);
      });
    });

    describe('STATUS_CHANGE', () => {
      it('should detect status transition', () => {
        const condition = {
          type: 'STATUS_CHANGE',
          config: {
            mode: 'detect_transition',
            from_value: 'Pending',
            to_value: 'Approved',
          },
        };

        const result = evaluateCondition(
          condition,
          { extracted_status: 'Pending' },
          { selectorText: 'Approved' }
        );

        expect(result.triggered).toBe(true);
        expect(result.before).toBe('Pending');
        expect(result.after).toBe('Approved');
      });

      it('should not trigger if transition does not match', () => {
        const condition = {
          type: 'STATUS_CHANGE',
          config: {
            mode: 'detect_transition',
            from_value: 'Pending',
            to_value: 'Approved',
          },
        };

        const result = evaluateCondition(
          condition,
          { extracted_status: 'Approved' },
          { selectorText: 'Rejected' }
        );

        expect(result.triggered).toBe(false);
      });
    });

    describe('SELECTOR_CHANGE', () => {
      it('should detect any change', () => {
        const condition = {
          type: 'SELECTOR_CHANGE',
          config: {
            css_selector: '.price',
            trigger_on: 'any_change',
          },
        };

        const result = evaluateCondition(
          condition,
          { extracted_selector_text: '$100' },
          { selectorText: '$99' }
        );

        expect(result.triggered).toBe(true);
        expect(result.before).toBe('$100');
        expect(result.after).toBe('$99');
      });

      it('should not trigger if no change', () => {
        const condition = {
          type: 'SELECTOR_CHANGE',
          config: {
            css_selector: '.price',
            trigger_on: 'any_change',
          },
        };

        const result = evaluateCondition(
          condition,
          { extracted_selector_text: '$100' },
          { selectorText: '$100' }
        );

        expect(result.triggered).toBe(false);
      });
    });
  });
});
