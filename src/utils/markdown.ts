/**
 * Markdown utilities for Drift capture and moment viewing.
 * Supports:
 * - H1 (# Heading)
 * - H2 (## Heading)
 * - Bold (**bold**)
 * - Italic (*italic*)
 */

export interface TextSelection {
  start: number;
  end: number;
}

/**
 * Strips markdown symbols for plain-text search, previews in Home, and accessibility labels.
 * Symbols (#, ##, **, *) must never show in lists per DESIGN-capture.md §4b.
 */
export function stripMarkdown(markdown: string | null | undefined): string {
  if (!markdown) return '';
  return markdown
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

/**
 * Detects whether H1, H2, Bold, or Italic is active at the current cursor/selection.
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

  // Find line boundaries for the cursor
  const lastNewline = text.lastIndexOf('\n', safeStart - 1);
  const nextNewline = text.indexOf('\n', safeStart);
  const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
  const lineEnd = nextNewline === -1 ? text.length : nextNewline;
  const currentLine = text.slice(lineStart, lineEnd);

  const isH2 = /^##\s/.test(currentLine);
  const isH1 = !isH2 && /^#\s/.test(currentLine);
  const isHeading = isH1 || isH2;

  // Check if cursor is inside **bold**
  const textBeforeCursor = text.slice(0, safeStart);
  const textAfterCursor = text.slice(safeStart);

  const boldBeforeCount = (textBeforeCursor.match(/\*\*/g) || []).length;
  const boldAfterCount = (textAfterCursor.match(/\*\*/g) || []).length;
  const isBold = boldBeforeCount % 2 === 1 && boldAfterCount > 0;

  // For italic, count single asterisks that are not double asterisks
  const singleAsteriskRegex = /(?<!\*)\*(?!\*)/g;
  const italicBeforeCount = (textBeforeCursor.match(singleAsteriskRegex) || []).length;
  const italicAfterCount = (textAfterCursor.match(singleAsteriskRegex) || []).length;
  const isItalic = italicBeforeCount % 2 === 1 && italicAfterCount > 0;

  return { isH1, isH2, isBold, isItalic, isHeading };
}

/**
 * Toggles Heading 1 (# ) on the current paragraph.
 */
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
    // Current line is already H1: remove '# '
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
    // Current line is H2: swap '## ' to '# '
    const newLine = currentLine.replace(/^##\s/, '# ');
    const newText = text.slice(0, lineStart) + newLine + text.slice(lineEnd);
    const offset = 1; // reduced by 1 char
    return {
      text: newText,
      selection: {
        start: Math.max(lineStart, safeStart - offset),
        end: Math.max(lineStart, safeEnd - offset),
      },
    };
  } else {
    // Current line has no heading: add '# '
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

/**
 * Toggles Heading 2 (## ) on the current paragraph.
 */
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
    // Current line is already H2: remove '## '
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
    // Current line is H1: swap '# ' to '## '
    const newLine = currentLine.replace(/^#\s/, '## ');
    const newText = text.slice(0, lineStart) + newLine + text.slice(lineEnd);
    const offset = 1; // added 1 char
    return {
      text: newText,
      selection: {
        start: safeStart + offset,
        end: safeEnd + offset,
      },
    };
  } else {
    // Current line has no heading: add '## '
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

/**
 * Toggles bold (**text**) on the current selection or inserts **** at cursor.
 */
export function toggleBold(
  text: string,
  selection: TextSelection
): { text: string; selection: TextSelection } {
  const { start, end } = selection;
  const safeStart = Math.max(0, Math.min(start, text.length));
  const safeEnd = Math.max(0, Math.min(end, text.length));

  if (safeStart !== safeEnd) {
    const selectedText = text.slice(safeStart, safeEnd);

    // If already wrapped in **, unwrap
    if (selectedText.startsWith('**') && selectedText.endsWith('**') && selectedText.length >= 4) {
      const unwrapped = selectedText.slice(2, -2);
      const newText = text.slice(0, safeStart) + unwrapped + text.slice(safeEnd);
      return {
        text: newText,
        selection: { start: safeStart, end: safeStart + unwrapped.length },
      };
    }

    // Check if bounds outside selection have **
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

    // Otherwise wrap selection
    const wrapped = `**${selectedText}**`;
    const newText = text.slice(0, safeStart) + wrapped + text.slice(safeEnd);
    return {
      text: newText,
      selection: { start: safeStart, end: safeStart + wrapped.length },
    };
  } else {
    // Collapsed cursor: insert **** and position cursor in middle
    const newText = text.slice(0, safeStart) + '****' + text.slice(safeStart);
    return {
      text: newText,
      selection: { start: safeStart + 2, end: safeStart + 2 },
    };
  }
}

/**
 * Toggles italic (*text*) on the current selection or inserts ** at cursor.
 */
export function toggleItalic(
  text: string,
  selection: TextSelection
): { text: string; selection: TextSelection } {
  const { start, end } = selection;
  const safeStart = Math.max(0, Math.min(start, text.length));
  const safeEnd = Math.max(0, Math.min(end, text.length));

  if (safeStart !== safeEnd) {
    const selectedText = text.slice(safeStart, safeEnd);

    // If already wrapped in *, unwrap (making sure not **)
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

    // Check if characters immediately surrounding selection are *
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

    // Otherwise wrap selection
    const wrapped = `*${selectedText}*`;
    const newText = text.slice(0, safeStart) + wrapped + text.slice(safeEnd);
    return {
      text: newText,
      selection: { start: safeStart, end: safeStart + wrapped.length },
    };
  } else {
    // Collapsed cursor: insert ** and position cursor in middle
    const newText = text.slice(0, safeStart) + '**' + text.slice(safeStart);
    return {
      text: newText,
      selection: { start: safeStart + 1, end: safeStart + 1 },
    };
  }
}
