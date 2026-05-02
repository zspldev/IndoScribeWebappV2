/**
 * Preprocessing module for detecting and replacing spoken formatting commands
 * in transcribed text with actual formatting characters.
 * 
 * Commands are now loaded from FormattingCommandService (configurable via JSON file)
 * with fallback to hardcoded defaults for safety.
 */

import { getFormattingCommandService } from './services/FormattingCommandService.js';

/**
 * Apply preprocessing to transcribed text to replace spoken formatting commands
 * with actual formatting characters.
 * 
 * @param text - Raw transcribed text from STT
 * @param languageCode - Language code (en, hi, mr) to filter language-specific commands
 * @returns Formatted text with commands replaced
 * 
 * @example
 * const input = "ही पहिली ओळ आहे नवीन ओळ ही दुसरी ओळ आहे नवीन परिच्छेद आता नवीन परिच्छेद आहे";
 * const output = applyPreprocessing(input, 'mr');
 * // Result: "ही पहिली ओळ आहे\nही दुसरी ओळ आहे\n\nआता नवीन परिच्छेद आहे"
 */
export function applyPreprocessing(text: string, languageCode?: string): string {
  if (!text || text.trim().length === 0) {
    return text;
  }

  let processedText = text;

  // Get active commands from service, filtered by language code
  const commandService = getFormattingCommandService();
  const formattingCommands = commandService.getActiveCommands(languageCode);

  // Process each formatting command
  // Sort by length (descending) to match longer phrases first
  // This prevents "new line" from being replaced before "new paragraph"
  const sortedCommands = Object.entries(formattingCommands).sort(
    (a, b) => b[0].length - a[0].length
  );

  for (const [command, replacement] of sortedCommands) {
    // Create case-insensitive regex with Unicode-safe boundaries
    // Allow whitespace, ANY punctuation (including Devanagari danda ।), or string boundaries
    // This works with both ASCII (English) and Devanagari (Hindi/Marathi) characters
    // (?:^|\\s) - Start of string or whitespace before
    // (?=\\s|\\p{P}|$) - Whitespace, any Unicode punctuation (including । ॥), or end of string
    const regex = new RegExp(`(?:^|\\s)(${escapeRegex(command)})(?=\\s|\\p{P}|$)`, 'giu');
    processedText = processedText.replace(regex, (match, p1) => {
      // Replace with the captured group to preserve leading whitespace
      return match.replace(p1, replacement);
    });
  }

  // Clean up formatting (preserve intentional whitespace):
  // 1. Remove spaces before punctuation marks
  processedText = processedText.replace(/\s+([,.?!])/g, '$1');
  
  // 2. Ensure space after punctuation (if not followed by newline)
  processedText = processedText.replace(/([,.?!])(?=[^\s\n])/g, '$1 ');
  
  // 3. Only collapse excessive newlines (more than 3) to preserve paragraph/page breaks
  processedText = processedText.replace(/\n{4,}/g, '\n\n\n');
  
  // 4. Trim trailing whitespace from each line but preserve blank lines
  processedText = processedText
    .split('\n')
    .map(line => line.trimEnd()) // Only trim trailing spaces, preserve blank lines
    .join('\n');
  
  // 5. Only trim horizontal whitespace (spaces/tabs), preserve vertical whitespace (newlines)
  // Remove leading/trailing spaces but keep newlines for intentional paragraph/page breaks
  processedText = processedText.replace(/^[ \t]+|[ \t]+$/g, '');

  return processedText;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Check if text contains any page break markers
 */
export function hasPageBreaks(text: string): boolean {
  return text.includes('--- PAGE BREAK ---');
}

/**
 * Split text into pages based on page break markers
 * Preserves all whitespace including empty pages and intentional spacing
 */
export function splitIntoPages(text: string): string[] {
  const pages = text.split(/--- PAGE BREAK ---/g);
  // Return raw segments without trimming to preserve user-intended spacing
  return pages;
}
