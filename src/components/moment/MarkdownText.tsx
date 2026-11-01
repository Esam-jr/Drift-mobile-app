import React from 'react';
import { Text, StyleSheet, TextStyle, StyleProp, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { type as typeTokens, fonts, spacing } from '@/theme/tokens';

interface MarkdownTextProps {
  content: string;
  style?: StyleProp<TextStyle>;
  baseTypeStyle?: { fontFamily: string; fontSize: number; lineHeight: number };
}

interface InlineSpan {
  text: string;
  isBold?: boolean;
  isItalic?: boolean;
}

/**
 * Parses inline markdown: **bold**, *italic*, ***bold italic***
 */
function parseInlineMarkdown(text: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  // Tokenize by ***...***, **...**, and *...*
  const regex = /(\*\*\*(.*?)\*\*\*|\*\*(.*?)\*\*|\*(.*?)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      spans.push({ text: text.slice(lastIndex, match.index) });
    }

    if (match[2] !== undefined) {
      // ***bold italic***
      spans.push({ text: match[2], isBold: true, isItalic: true });
    } else if (match[3] !== undefined) {
      // **bold**
      spans.push({ text: match[3], isBold: true });
    } else if (match[4] !== undefined) {
      // *italic*
      spans.push({ text: match[4], isItalic: true });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    spans.push({ text: text.slice(lastIndex) });
  }

  return spans.length > 0 ? spans : [{ text }];
}

/**
 * Renders Markdown content with serif heading, bold, and italic styling
 * per DESIGN-capture.md §4.
 */
export const MarkdownText: React.FC<MarkdownTextProps> = ({
  content,
  style,
  baseTypeStyle = typeTokens.momentDetail,
}) => {
  const { colors } = useTheme();

  if (!content) return null;

  // Split into paragraphs by newline
  const paragraphs = content.split('\n');

  return (
    <View style={styles.container}>
      {paragraphs.map((para, pIdx) => {
        // If empty line, render a spacing spacer
        if (!para.trim()) {
          return <View key={`p-${pIdx}`} style={styles.emptyLine} />;
        }

        const isH2 = /^##\s/.test(para);
        const isH1 = !isH2 && /^#\s/.test(para);
        const cleanText = isH2
          ? para.replace(/^##\s/, '')
          : isH1
          ? para.replace(/^#\s/, '')
          : para;

        if (isH1 || isH2) {
          const spans = parseInlineMarkdown(cleanText);
          const headingToken = isH2 ? typeTokens.heading2 : typeTokens.heading1;
          return (
            <Text
              key={`p-${pIdx}`}
              style={[
                headingToken,
                { color: colors.text },
                styles.paragraph,
                styles.headingMargin,
                style,
              ]}
            >
              {spans.map((span, sIdx) => {
                let fontFamily: string = fonts.serifSemiBold;
                if (span.isItalic) {
                  fontFamily = fonts.serifSemiBoldItalic;
                }
                return (
                  <Text key={`s-${sIdx}`} style={{ fontFamily }}>
                    {span.text}
                  </Text>
                );
              })}
            </Text>
          );
        }

        const spans = parseInlineMarkdown(cleanText);
        return (
          <Text
            key={`p-${pIdx}`}
            style={[
              baseTypeStyle,
              { color: colors.text },
              styles.paragraph,
              style,
            ]}
          >
            {spans.map((span, sIdx) => {
              let fontFamily: string = baseTypeStyle.fontFamily;
              if (span.isBold && span.isItalic) {
                fontFamily = fonts.serifSemiBoldItalic;
              } else if (span.isBold) {
                fontFamily = fonts.serifSemiBold;
              } else if (span.isItalic) {
                fontFamily = fonts.serifItalic;
              }

              return (
                <Text key={`s-${sIdx}`} style={{ fontFamily }}>
                  {span.text}
                </Text>
              );
            })}
          </Text>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  paragraph: {
    marginBottom: spacing.xs,
  },
  headingMargin: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  emptyLine: {
    height: spacing.md,
  },
});
