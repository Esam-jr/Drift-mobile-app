/**
 * Markdown & HTML utilities for Drift capture, moment viewing, and export
 * per DESIGN-capture.md §4, §4b, and §4c.
 */

export interface TextSelection {
  start: number;
  end: number;
}

/**
 * Strips HTML tags and decodes common HTML entities to produce clean plain text.
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * Strips markdown or HTML symbols for plain-text search, previews in Home, and accessibility labels.
 * Symbols (#, ##, **, *, <tags>) must never show in lists per DESIGN-capture.md §4b.
 */
export function stripMarkdown(content: string | null | undefined): string {
  if (!content) return '';
  if (/<[a-z][\s\S]*>/i.test(content)) {
    return stripHtml(content);
  }
  return content
    // Remove H2 markers: ## Heading -> Heading
    .replace(/^##\s+/gm, '')
    // Remove H1 markers: # Heading -> Heading
    .replace(/^#\s+/gm, '')
    // Remove bold: **bold** -> bold
    .replace(/\*\*(.*?)\*\*/g, '$1')
    // Remove italic: *italic* -> italic
    .replace(/\*(.*?)\*/g, '$1')
    // Clean up multiple spaces
    .replace(/[ \t]+/g, ' ')
    .trim();
}

export const extractPlainText = stripMarkdown;

/**
 * Converts stored HTML to clean Markdown for export per DESIGN-capture.md §4b.
 * Only converts on export; stored content remains whatever format the chosen editor produces.
 */
export function htmlToMarkdown(html: string | null | undefined): string {
  if (!html) return '';
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    return html; // Already plain text or markdown
  }

  return html
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<(b|strong)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**')
    .replace(/<(i|em)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*')
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Detects whether H1, H2, Bold, or Italic is active at the current cursor/selection
 * for markdown strings.
 */
export function detectActiveFormats(
  text: string,
  selection: TextSelection
): { isH1: boolean; isH2: boolean; isBold: boolean; isItalic: boolean; isHeading: boolean } {
  if (!text) {
    return { isH1: false, isH2: false, isBold: false, isItalic: false, isHeading: false };
  }

  const { start } = selection;
  const safeStart = Math.max(0, Math.min(start, text.length));

  const lastNewline = text.lastIndexOf('\n', safeStart - 1);
  const nextNewline = text.indexOf('\n', safeStart);
  const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
  const lineEnd = nextNewline === -1 ? text.length : nextNewline;
  const currentLine = text.slice(lineStart, lineEnd);

  const isH2 = /^##\s/.test(currentLine);
  const isH1 = !isH2 && /^#\s/.test(currentLine);
  const isHeading = isH1 || isH2;

  const textBeforeCursor = text.slice(0, safeStart);
  const textAfterCursor = text.slice(safeStart);

  const boldBeforeCount = (textBeforeCursor.match(/\*\*/g) || []).length;
  const boldAfterCount = (textAfterCursor.match(/\*\*/g) || []).length;
  const isBold = boldBeforeCount % 2 === 1 && boldAfterCount > 0;

  const singleAsteriskRegex = /(?<!\*)\*(?!\*)/g;
  const italicBeforeCount = (textBeforeCursor.match(singleAsteriskRegex) || []).length;
  const italicAfterCount = (textAfterCursor.match(singleAsteriskRegex) || []).length;
  const isItalic = italicBeforeCount % 2 === 1 && italicAfterCount > 0;

  return { isH1, isH2, isBold, isItalic, isHeading };
}

export function toggleH1(
  text: string,
  selection: TextSelection
): { text: string; selection: TextSelection } {
  const { start, end } = selection;
  const safeStart = Math.max(0, Math.min(start, text.length));
  const safeEnd = Math.max(0, Math.min(end, text.length));

  const lastNewline = text.lastIndexOf('\n', safeStart - 1);
  const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
  const nextNewline = text.indexOf('\n', safeEnd);
  const lineEnd = nextNewline === -1 ? text.length : nextNewline;
  const currentLine = text.slice(lineStart, lineEnd);

  if (/^#\s/.test(currentLine) && !/^##\s/.test(currentLine)) {
    const newLine = currentLine.replace(/^#\s/, '');
    const newText = text.slice(0, lineStart) + newLine + text.slice(lineEnd);
    const offset = 2;
    return {
      text: newText,
      selection: {
        start: Math.max(lineStart, safeStart - offset),
        end: Math.max(lineStart, safeEnd - offset),
      },
    };
  } else if (/^##\s/.test(currentLine)) {
    const newLine = currentLine.replace(/^##\s/, '# ');
    const newText = text.slice(0, lineStart) + newLine + text.slice(lineEnd);
    const offset = 1;
    return {
      text: newText,
      selection: {
        start: Math.max(lineStart, safeStart - offset),
        end: Math.max(lineStart, safeEnd - offset),
      },
    };
  } else {
    const newLine = `# ${currentLine}`;
    const newText = text.slice(0, lineStart) + newLine + text.slice(lineEnd);
    const offset = 2;
    return {
      text: newText,
      selection: {
        start: safeStart + offset,
        end: safeEnd + offset,
      },
    };
  }
}

export function toggleH2(
  text: string,
  selection: TextSelection
): { text: string; selection: TextSelection } {
  const { start, end } = selection;
  const safeStart = Math.max(0, Math.min(start, text.length));
  const safeEnd = Math.max(0, Math.min(end, text.length));

  const lastNewline = text.lastIndexOf('\n', safeStart - 1);
  const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
  const nextNewline = text.indexOf('\n', safeEnd);
  const lineEnd = nextNewline === -1 ? text.length : nextNewline;
  const currentLine = text.slice(lineStart, lineEnd);

  if (/^##\s/.test(currentLine)) {
    const newLine = currentLine.replace(/^##\s/, '');
    const newText = text.slice(0, lineStart) + newLine + text.slice(lineEnd);
    const offset = 3;
    return {
      text: newText,
      selection: {
        start: Math.max(lineStart, safeStart - offset),
        end: Math.max(lineStart, safeEnd - offset),
      },
    };
  } else if (/^#\s/.test(currentLine)) {
    const newLine = currentLine.replace(/^#\s/, '## ');
    const newText = text.slice(0, lineStart) + newLine + text.slice(lineEnd);
    const offset = 1;
    return {
      text: newText,
      selection: {
        start: safeStart + offset,
        end: safeEnd + offset,
      },
    };
  } else {
    const newLine = `## ${currentLine}`;
    const newText = text.slice(0, lineStart) + newLine + text.slice(lineEnd);
    const offset = 3;
    return {
      text: newText,
      selection: {
        start: safeStart + offset,
        end: safeEnd + offset,
      },
    };
  }
}

export const toggleHeading = toggleH1;

export function toggleBold(
  text: string,
  selection: TextSelection
): { text: string; selection: TextSelection } {
  const { start, end } = selection;
  const safeStart = Math.max(0, Math.min(start, text.length));
  const safeEnd = Math.max(0, Math.min(end, text.length));

  if (safeStart !== safeEnd) {
    const selectedText = text.slice(safeStart, safeEnd);

    if (selectedText.startsWith('**') && selectedText.endsWith('**') && selectedText.length >= 4) {
      const unwrapped = selectedText.slice(2, -2);
      const newText = text.slice(0, safeStart) + unwrapped + text.slice(safeEnd);
      return {
        text: newText,
        selection: { start: safeStart, end: safeStart + unwrapped.length },
      };
    }

    if (
      safeStart >= 2 &&
      safeEnd <= text.length - 2 &&
      text.slice(safeStart - 2, safeStart) === '**' &&
      text.slice(safeEnd, safeEnd + 2) === '**'
    ) {
      const newText = text.slice(0, safeStart - 2) + selectedText + text.slice(safeEnd + 2);
      return {
        text: newText,
        selection: { start: safeStart - 2, end: safeEnd - 2 },
      };
    }

    const wrapped = `**${selectedText}**`;
    const newText = text.slice(0, safeStart) + wrapped + text.slice(safeEnd);
    return {
      text: newText,
      selection: { start: safeStart, end: safeStart + wrapped.length },
    };
  } else {
    const newText = text.slice(0, safeStart) + '****' + text.slice(safeStart);
    return {
      text: newText,
      selection: { start: safeStart + 2, end: safeStart + 2 },
    };
  }
}

export function toggleItalic(
  text: string,
  selection: TextSelection
): { text: string; selection: TextSelection } {
  const { start, end } = selection;
  const safeStart = Math.max(0, Math.min(start, text.length));
  const safeEnd = Math.max(0, Math.min(end, text.length));

  if (safeStart !== safeEnd) {
    const selectedText = text.slice(safeStart, safeEnd);

    if (
      selectedText.startsWith('*') &&
      selectedText.endsWith('*') &&
      !selectedText.startsWith('**') &&
      selectedText.length >= 2
    ) {
      const unwrapped = selectedText.slice(1, -1);
      const newText = text.slice(0, safeStart) + unwrapped + text.slice(safeEnd);
      return {
        text: newText,
        selection: { start: safeStart, end: safeStart + unwrapped.length },
      };
    }

    if (
      safeStart >= 1 &&
      safeEnd <= text.length - 1 &&
      text[safeStart - 1] === '*' &&
      text[safeStart - 2] !== '*' &&
      text[safeEnd] === '*' &&
      text[safeEnd + 1] !== '*'
    ) {
      const newText = text.slice(0, safeStart - 1) + selectedText + text.slice(safeEnd + 1);
      return {
        text: newText,
        selection: { start: safeStart - 1, end: safeEnd - 1 },
      };
    }

    const wrapped = `*${selectedText}*`;
    const newText = text.slice(0, safeStart) + wrapped + text.slice(safeEnd);
    return {
      text: newText,
      selection: { start: safeStart, end: safeStart + wrapped.length },
    };
  } else {
    const newText = text.slice(0, safeStart) + '**' + text.slice(safeStart);
    return {
      text: newText,
      selection: { start: safeStart + 1, end: safeStart + 1 },
    };
  }
}
