import { TextRun, Paragraph, HeadingLevel, UnderlineType } from 'docx';

/**
 * Represents a text segment with formatting information
 */
export interface FormattedSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
}

/**
 * Represents a parsed line with formatting and heading level
 */
export interface ParsedLine {
  segments: FormattedSegment[];
  headingLevel?: typeof HeadingLevel[keyof typeof HeadingLevel];
  isPageBreak?: boolean;
}

/**
 * Parse Markdown-formatted text and convert to structured format for DOCX generation
 */
export class MarkdownParser {
  /**
   * Parse a single line of text with Markdown formatting
   * Supports: **bold**, *italic*, __underline__, ~~strikethrough~~, and # headings
   */
  static parseLine(line: string): ParsedLine {
    // Check for page break marker
    if (line.trim() === '--- PAGE BREAK ---') {
      return { segments: [], isPageBreak: true };
    }

    // Check for headings (must be at start of line)
    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      const [, hashes, text] = headingMatch;
      const headingLevel = 
        hashes.length === 1 ? HeadingLevel.HEADING_1 :
        hashes.length === 2 ? HeadingLevel.HEADING_2 :
        HeadingLevel.HEADING_3;
      
      // Headings don't have inline formatting in our implementation
      return {
        segments: [{ text }],
        headingLevel,
      };
    }

    // Parse inline formatting
    const segments = this.parseInlineFormatting(line);
    return { segments };
  }

  /**
   * Parse inline formatting (bold, italic, underline, strikethrough)
   * Handles nested formatting like **bold and *italic***
   */
  private static parseInlineFormatting(text: string): FormattedSegment[] {
    const segments: FormattedSegment[] = [];
    let currentText = '';
    let bold = false;
    let italic = false;
    let underline = false;
    let strikethrough = false;
    
    let i = 0;
    while (i < text.length) {
      // Check for formatting markers
      if (i < text.length - 1) {
        const twoChar = text.substring(i, i + 2);
        
        // Bold: **
        if (twoChar === '**') {
          if (currentText) {
            segments.push({ 
              text: currentText, 
              bold, 
              italic, 
              underline, 
              strikethrough 
            });
            currentText = '';
          }
          bold = !bold;
          i += 2;
          continue;
        }
        
        // Underline: __
        if (twoChar === '__') {
          if (currentText) {
            segments.push({ 
              text: currentText, 
              bold, 
              italic, 
              underline, 
              strikethrough 
            });
            currentText = '';
          }
          underline = !underline;
          i += 2;
          continue;
        }
        
        // Strikethrough: ~~
        if (twoChar === '~~') {
          if (currentText) {
            segments.push({ 
              text: currentText, 
              bold, 
              italic, 
              underline, 
              strikethrough 
            });
            currentText = '';
          }
          strikethrough = !strikethrough;
          i += 2;
          continue;
        }
      }
      
      // Italic: * (but not ** which is bold)
      if (text[i] === '*' && (i === 0 || text[i-1] !== '*') && (i === text.length - 1 || text[i+1] !== '*')) {
        if (currentText) {
          segments.push({ 
            text: currentText, 
            bold, 
            italic, 
            underline, 
            strikethrough 
          });
          currentText = '';
        }
        italic = !italic;
        i++;
        continue;
      }
      
      // Regular character
      currentText += text[i];
      i++;
    }
    
    // Add remaining text
    if (currentText || segments.length === 0) {
      segments.push({ 
        text: currentText, 
        bold, 
        italic, 
        underline, 
        strikethrough 
      });
    }
    
    return segments;
  }

  /**
   * Convert formatted segments to DOCX TextRun objects
   */
  static segmentsToTextRuns(segments: FormattedSegment[], fontName: string): TextRun[] {
    return segments.map(segment => 
      new TextRun({
        text: segment.text,
        font: { name: fontName },
        size: 24, // 12pt
        bold: segment.bold,
        italics: segment.italic,
        underline: segment.underline ? { type: UnderlineType.SINGLE } : undefined,
        strike: segment.strikethrough,
      })
    );
  }

  /**
   * Convert a parsed line to a DOCX Paragraph
   */
  static lineToParagraph(parsedLine: ParsedLine, fontName: string): Paragraph {
    const textRuns = this.segmentsToTextRuns(parsedLine.segments, fontName);
    
    return new Paragraph({
      children: textRuns,
      heading: parsedLine.headingLevel,
    });
  }
}
