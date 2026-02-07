import * as cheerio from 'cheerio';

export interface CheckResult {
  success: boolean;
  statusCode?: number;
  content?: string;
  plainText?: string;
  error?: string;
  latency?: number;
}

export async function fetchAndParse(url: string): Promise<CheckResult> {
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'PingMe/1.0 (URL Monitoring Service)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(30000), // 30s timeout
      redirect: 'follow',
    });

    const latency = Date.now() - startTime;
    const statusCode = response.status;

    if (!response.ok) {
      return {
        success: false,
        statusCode,
        error: `HTTP ${statusCode}: ${response.statusText}`,
        latency,
      };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove scripts and styles
    $('script, style, noscript').remove();

    // Get plain text
    const plainText = $('body').text()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 10000); // Limit to 10KB

    // Get excerpt
    const excerpt = $('body').text()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 2000);

    return {
      success: true,
      statusCode,
      content: excerpt,
      plainText,
      latency,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      latency,
    };
  }
}

export function extractSelectorText(html: string, selector: string): string | null {
  try {
    const $ = cheerio.load(html);
    const element = $(selector);
    return element.text()?.replace(/\s+/g, ' ').trim() || null;
  } catch {
    return null;
  }
}

export function normalizeContent(content: string): string {
  return content
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function generateHash(content: string): string {
  // Simple hash for content comparison
  let hash = 0;
  const normalized = normalizeContent(content);
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(16);
}

export interface ConditionEvaluation {
  triggered: boolean;
  reason: string;
  before?: string;
  after?: string;
}

export function evaluateCondition(
  condition: { type: string; config: Record<string, unknown> },
  previousSnapshot: { extracted_status?: string; extracted_selector_text?: string; extracted_plain_text_preview?: string } | null,
  currentContent: { plainText?: string; selectorText?: string }
): ConditionEvaluation {
  const { type, config } = condition;

  switch (type) {
    case 'STATUS_CHANGE':
      return evaluateStatusChange(config, previousSnapshot, currentContent);

    case 'TEXT_MATCH':
      return evaluateTextMatch(config, currentContent.plainText || '');

    case 'SELECTOR_CHANGE':
      return evaluateSelectorChange(config, previousSnapshot, currentContent);

    default:
      return { triggered: false, reason: 'Unknown condition type' };
  }
}

function evaluateStatusChange(
  config: Record<string, unknown>,
  previousSnapshot: { extracted_status?: string } | null,
  currentContent: { selectorText?: string }
): ConditionEvaluation {
  const mode = config.mode as string;
  const previousStatus = previousSnapshot?.extracted_status || null;
  const currentStatus = currentContent.selectorText || null;

  if (mode === 'match_any') {
    const keywords = config.status_keywords as string[];
    if (keywords && keywords.length > 0 && currentStatus) {
      const matched = keywords.some(keyword =>
        currentStatus.toLowerCase().includes(keyword.toLowerCase())
      );
      if (matched) {
        return {
          triggered: true,
          reason: `Status matched keyword: ${currentStatus}`,
          after: currentStatus,
        };
      }
    }
  } else if (mode === 'detect_transition') {
    const fromValue = config.from_value as string;
    const toValue = config.to_value as string;

    if (fromValue && toValue) {
      if (
        previousStatus?.toLowerCase() === fromValue.toLowerCase() &&
        currentStatus?.toLowerCase() === toValue.toLowerCase()
      ) {
        return {
          triggered: true,
          reason: `Status changed from "${fromValue}" to "${toValue}"`,
          before: previousStatus,
          after: currentStatus,
        };
      }
    }
  }

  return { triggered: false, reason: 'No status change detected' };
}

function evaluateTextMatch(
  config: Record<string, unknown>,
  currentText: string
): ConditionEvaluation {
  const textToMatch = config.text_to_match as string;
  const matchMode = config.match_mode as string;
  const triggerOn = config.trigger_on as string;

  const normalizedCurrent = currentText.toLowerCase();
  const normalizedMatch = textToMatch.toLowerCase();

  let matches = false;

  switch (matchMode) {
    case 'exact':
      matches = normalizedCurrent === normalizedMatch;
      break;
    case 'contains':
      matches = normalizedCurrent.includes(normalizedMatch);
      break;
    case 'regex':
      try {
        const regex = new RegExp(textToMatch, 'i');
        matches = regex.test(currentText);
      } catch {
        matches = false;
      }
      break;
  }

  if (triggerOn === 'appears' && matches) {
    return {
      triggered: true,
      reason: `Text "${textToMatch}" appeared`,
      after: textToMatch,
    };
  }

  if (triggerOn === 'disappears' && !matches) {
    return {
      triggered: true,
      reason: `Text "${textToMatch}" disappeared`,
      before: textToMatch,
    };
  }

  if (triggerOn === 'both') {
    return {
      triggered: true,
      reason: matches ? `Text "${textToMatch}" appeared` : `Text "${textToMatch}" disappeared`,
      after: matches ? textToMatch : undefined,
      before: matches ? undefined : textToMatch,
    };
  }

  return { triggered: false, reason: 'No text change detected' };
}

function evaluateSelectorChange(
  config: Record<string, unknown>,
  previousSnapshot: { extracted_selector_text?: string } | null,
  currentContent: { selectorText?: string }
): ConditionEvaluation {
  const previousText = previousSnapshot?.extracted_selector_text || null;
  const currentText = currentContent.selectorText || null;

  const triggerOn = config.trigger_on as string;

  if (triggerOn === 'any_change') {
    if (previousText !== currentText) {
      return {
        triggered: true,
        reason: 'Selector text changed',
        before: previousText || '(empty)',
        after: currentText || '(empty)',
      };
    }
  } else if (triggerOn === 'transition') {
    const fromValue = config.from_value as string;
    const toValue = config.to_value as string;

    if (fromValue && toValue) {
      if (
        previousText?.toLowerCase() === fromValue.toLowerCase() &&
        currentText?.toLowerCase() === toValue.toLowerCase()
      ) {
        return {
          triggered: true,
          reason: `Selector changed from "${fromValue}" to "${toValue}"`,
          before: previousText,
          after: currentText,
        };
      }
    }
  }

  return { triggered: false, reason: 'No selector change detected' };
}
