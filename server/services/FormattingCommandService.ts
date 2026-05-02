/**
 * Service for managing configurable formatting commands
 * Commands are stored in JSON file with in-memory caching
 */

import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';

/**
 * Zod schema for formatting command
 */
export const FormattingCommandSchema = z.object({
  id: z.string(),
  phrase: z.string().min(1),
  replacement: z.string(),
  isActive: z.boolean().default(true),
  language: z.enum(['en', 'hi', 'mr']).default('en'), // English, Hindi, Marathi
  description: z.string().optional(),
});

export const FormattingCommandsConfigSchema = z.object({
  commands: z.array(FormattingCommandSchema),
  updatedAt: z.string(),
});

export type FormattingCommand = z.infer<typeof FormattingCommandSchema>;
export type FormattingCommandsConfig = z.infer<typeof FormattingCommandsConfigSchema>;

/**
 * Service for managing formatting commands with file-based persistence
 * and in-memory caching
 */
export class FormattingCommandService {
  private static instance: FormattingCommandService;
  private commands: Map<string, FormattingCommand> = new Map();
  private configPath: string;
  private lastLoaded: Date | null = null;

  private constructor() {
    this.configPath = path.join(process.cwd(), 'server', 'config', 'formatting-commands.json');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): FormattingCommandService {
    if (!FormattingCommandService.instance) {
      FormattingCommandService.instance = new FormattingCommandService();
    }
    return FormattingCommandService.instance;
  }

  /**
   * Load commands from JSON file into memory
   */
  public async load(): Promise<void> {
    try {
      const fileContent = await fs.readFile(this.configPath, 'utf-8');
      const parsed = JSON.parse(fileContent);
      
      // Validate with Zod
      const config = FormattingCommandsConfigSchema.parse(parsed);
      
      // Clear and reload cache
      this.commands.clear();
      for (const cmd of config.commands) {
        // Convert escaped newlines to actual newlines
        const replacement = cmd.replacement
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t');
        
        this.commands.set(cmd.id, { ...cmd, replacement });
      }
      
      this.lastLoaded = new Date();
      console.log(`Loaded ${this.commands.size} formatting commands from config`);
    } catch (error) {
      console.error('Error loading formatting commands:', error);
      // Fall back to default hardcoded commands
      this.loadDefaults();
    }
  }

  /**
   * Load default hardcoded commands as fallback
   */
  private loadDefaults(): void {
    const defaults: FormattingCommand[] = [
      { id: 'new-line', phrase: 'new line', replacement: '\n', isActive: true, language: 'en' },
      { id: 'newline', phrase: 'newline', replacement: '\n', isActive: true, language: 'en' },
      { id: 'new-paragraph', phrase: 'new paragraph', replacement: '\n\n', isActive: true, language: 'en' },
      { id: 'new-para', phrase: 'new para', replacement: '\n\n', isActive: true, language: 'en' },
      { id: 'new-page', phrase: 'new page', replacement: '\n\n--- PAGE BREAK ---\n\n', isActive: true, language: 'en' },
      { id: 'next-page', phrase: 'next page', replacement: '\n\n--- PAGE BREAK ---\n\n', isActive: true, language: 'en' },
      { id: 'comma', phrase: 'comma', replacement: ',', isActive: true, language: 'en' },
      { id: 'period', phrase: 'period', replacement: '.', isActive: true, language: 'en' },
      { id: 'full-stop', phrase: 'full stop', replacement: '.', isActive: true, language: 'en' },
      { id: 'question-mark', phrase: 'question mark', replacement: '?', isActive: true, language: 'en' },
      { id: 'exclamation-mark', phrase: 'exclamation mark', replacement: '!', isActive: true, language: 'en' },
    ];

    this.commands.clear();
    for (const cmd of defaults) {
      this.commands.set(cmd.id, cmd);
    }
    console.log('Loaded default formatting commands (fallback)');
  }

  /**
   * Save current commands to JSON file
   */
  public async save(): Promise<void> {
    const commandsArray = Array.from(this.commands.values()).map(cmd => ({
      ...cmd,
      // Escape newlines for JSON
      replacement: cmd.replacement.replace(/\n/g, '\\n').replace(/\t/g, '\\t'),
    }));

    const config: FormattingCommandsConfig = {
      commands: commandsArray,
      updatedAt: new Date().toISOString(),
    };

    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
    console.log(`Saved ${commandsArray.length} formatting commands to config`);
  }

  /**
   * Get all active commands as a map (phrase -> replacement)
   * Optionally filter by language code
   */
  public getActiveCommands(languageCode?: string): Record<string, string> {
    const result: Record<string, string> = {};
    const commandsArray = Array.from(this.commands.values());
    for (const cmd of commandsArray) {
      if (cmd.isActive) {
        // If language filter is provided, only include commands for that language
        if (languageCode && cmd.language !== languageCode) {
          continue;
        }
        result[cmd.phrase] = cmd.replacement;
      }
    }
    return result;
  }

  /**
   * Get all commands (active and inactive)
   */
  public getAllCommands(): FormattingCommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get a specific command by ID
   */
  public getCommand(id: string): FormattingCommand | undefined {
    return this.commands.get(id);
  }

  /**
   * Add or update a command
   */
  public async upsertCommand(command: FormattingCommand): Promise<void> {
    // Validate with Zod
    const validated = FormattingCommandSchema.parse(command);
    this.commands.set(validated.id, validated);
    await this.save();
  }

  /**
   * Delete a command by ID
   */
  public async deleteCommand(id: string): Promise<boolean> {
    const deleted = this.commands.delete(id);
    if (deleted) {
      await this.save();
    }
    return deleted;
  }

  /**
   * Reload commands from file (invalidate cache)
   */
  public async reload(): Promise<void> {
    await this.load();
  }
}

/**
 * Initialize the service on module load
 */
let initialized = false;

export async function initializeFormattingCommandService(): Promise<void> {
  if (!initialized) {
    const service = FormattingCommandService.getInstance();
    await service.load();
    initialized = true;
  }
}

/**
 * Get the singleton instance
 */
export function getFormattingCommandService(): FormattingCommandService {
  return FormattingCommandService.getInstance();
}
