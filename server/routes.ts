import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { parseBuffer } from "music-metadata";
import { db } from "./db";
import { languages, transcriptions } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { Document, Paragraph, TextRun, Packer, PageBreak, Header, AlignmentType } from "docx";
import JSZip from "jszip";
import { generatePdf } from "./services/PdfExportService";
import { languageGroups, languageGroupLanguages } from "@shared/schema";
import { inArray } from "drizzle-orm";
import { SpeechClient, protos } from "@google-cloud/speech";
import { applyPreprocessing, splitIntoPages } from "./preprocessing";
import { getFormattingCommandService, FormattingCommandSchema } from "./services/FormattingCommandService";
import { convertToLinear16Wav, getMimeTypeFromFilename } from "./services/AudioConversionService";
import { uploadAudioToGCS, deleteAudioFromGCS } from "./services/GCSService";
import { MarkdownParser } from "./services/MarkdownParser";
import { requireAuth, requireAdmin } from "./auth";
import { storage } from "./storage";
import { uploadAudioToS3, downloadAudioFromS3, generateS3Key, isS3Configured } from "./services/S3AudioService";
import { transcribeWithSarvam, isSarvamConfigured } from "./services/SarvamSTTService";
import { translateText, isSarvamTranslateConfigured } from "./services/SarvamTranslateService";

// Initialize Google Cloud Speech client
let speechClient: SpeechClient | null = null;

function getSpeechClient(): SpeechClient {
  if (!speechClient) {
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!credentials) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS not configured');
    }
    
    // Parse JSON credentials from environment variable
    const credentialsJson = JSON.parse(credentials);
    
    speechClient = new SpeechClient({
      credentials: credentialsJson,
    });
  }
  return speechClient;
}

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max file size
  },
  fileFilter: (req, file, cb) => {
    const baseMime = file.mimetype.split(';')[0].trim().toLowerCase();
    const allowedMimeTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/x-wav',
      'audio/wave',
      'audio/mp4',
      'audio/x-m4a',
      'audio/webm',
      'audio/ogg',
      'video/webm',
      'application/octet-stream',
    ];
    
    const allowedExtensions = ['.mp3', '.wav', '.m4a', '.webm', '.ogg'];
    const fileExtension = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    
    if (allowedMimeTypes.includes(baseMime) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Only MP3, WAV, M4A, WebM, and OGG files are allowed'));
    }
  },
});

async function injectDocxDiagonalWatermark(buffer: Buffer): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer);
  const headerFiles = Object.keys(zip.files).filter(f => /^word\/header\d+\.xml$/.test(f));
  if (headerFiles.length === 0) return buffer;

  const vmlWatermark = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
       xmlns:o="urn:schemas-microsoft-com:office:office"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:v="urn:schemas-microsoft-com:vml"
       xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
       xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
       xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml"
       xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
       mc:Ignorable="w14 w15">
  <w:p>
    <w:pPr><w:pStyle w:val="Header"/></w:pPr>
    <w:r>
      <w:rPr/>
      <w:pict>
        <v:shape id="IndoScribeWatermark" o:spid="_x0000_s1025" type="#_x0000_t136"
          style="position:absolute;margin-left:0;margin-top:0;width:300pt;height:36pt;z-index:-251654144;mso-position-horizontal:center;mso-position-horizontal-relative:margin;mso-position-vertical:center;mso-position-vertical-relative:margin;rotation:315"
          fillcolor="#AAAAAA" stroked="f">
          <v:fill o:detectmouseclick="t"/>
          <v:textpath style="font-family:&quot;Arial&quot;;font-size:1pt;font-weight:bold;font-style:normal"
            string="Created by IndoScribe" trim="t" on="t"/>
        </v:shape>
      </w:pict>
    </w:r>
  </w:p>
</w:hdr>`;

  zip.file(headerFiles[0], vmlWatermark);
  return await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

async function userHasFeature(userId: number, featureKey: string): Promise<boolean> {
  const user = await storage.getUserById(userId);
  if (!user) return false;
  if (user.role === "admin") return true;
  const plan = await storage.getPlanById(user.planId || 1);
  const features = (plan?.features as string[]) ?? [];
  return features.includes(featureKey);
}

function getDocxFontName(scriptFamily?: string | null, script?: string | null): string {
  const fontMap: Record<string, string> = {
    devanagari: "Noto Sans Devanagari",
    bengali: "Noto Sans Bengali",
    gujarati: "Noto Sans Gujarati",
    tamil: "Noto Sans Tamil",
    telugu: "Noto Sans Telugu",
    kannada: "Noto Sans Kannada",
    malayalam: "Noto Sans Malayalam",
    gurmukhi: "Noto Sans Gurmukhi",
    latin: "Calibri",
  };
  if (scriptFamily && fontMap[scriptFamily]) return fontMap[scriptFamily];
  if (script === "Devanagari") return "Noto Sans Devanagari";
  return "Calibri";
}

export async function registerRoutes(app: Express): Promise<Server> {

  // Public: landing page config from JSON file
  app.get("/api/landing-config", async (_req, res) => {
    try {
      const configPath = path.join(process.cwd(), "Landing-Page-Config.json");
      const raw = fs.readFileSync(configPath, "utf8");
      res.json(JSON.parse(raw));
    } catch (e) {
      res.status(500).json({ error: "Could not load landing config" });
    }
  });

  // Public: live stats for landing page (user count + minutes transcribed)
  app.get("/api/landing-stats", async (_req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT
          COUNT(*)::int AS user_count,
          COALESCE(SUM(total_minutes_transcribed), 0)::int AS total_minutes,
          COUNT(CASE WHEN status = 'completed' THEN 1 END)::int AS documents_count
        FROM users
        LEFT JOIN projects ON projects.user_id = users.id
        WHERE users.role != 'admin'
      `);
      const row = result.rows[0] as any;
      res.json({
        users: row.user_count ?? 0,
        minutes: row.total_minutes ?? 0,
        documents: row.documents_count ?? 0,
      });
    } catch (e) {
      res.status(500).json({ error: "Could not load stats" });
    }
  });

  // Get languages filtered by the authenticated user's plan group
  app.get("/api/languages", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (userId) {
        const user = await storage.getUserById(userId);
        if (user) {
          // Admins see all active languages regardless of their own plan
          if (user.role === "admin") {
            const allActive = await db.select().from(languages).where(eq(languages.isActive, true)).orderBy(languages.name);
            return res.json(allActive);
          }
          const planId = user.planId || 1;
          const planLangs = await storage.getLanguagesByPlanId(planId);
          return res.json(planLangs);
        }
      }
      const allActive = await db.select().from(languages).where(eq(languages.isActive, true)).orderBy(languages.name);
      res.json(allActive);
    } catch (error) {
      console.error("Error fetching languages:", error);
      res.status(500).json({ error: "Failed to fetch languages" });
    }
  });

  // Get all languages (admin only, unfiltered)
  app.get("/api/admin/languages", requireAdmin, async (req, res) => {
    try {
      const allLangs = await db.select().from(languages).orderBy(languages.name);
      res.json(allLangs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch languages" });
    }
  });

  // Upload audio file and validate
  app.post("/api/upload", upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const languageId = parseInt(req.body.languageId);
      if (!languageId) {
        return res.status(400).json({ error: "Language ID is required" });
      }

      // Convert audio to LINEAR16 WAV format for Google STT
      try {
        console.log(`Converting audio file: ${req.file.originalname} (${req.file.mimetype})`);
        
        const conversionResult = await convertToLinear16Wav(
          req.file.buffer,
          req.file.originalname
        );

        const rawDur = conversionResult.metadata.duration;
        const duration = (rawDur && !isNaN(rawDur) && rawDur > 0) ? rawDur : 0;

        if (duration > 1800) { // 30 minutes = 1800 seconds
          return res.status(400).json({ 
            error: "Audio file exceeds maximum duration of 30 minutes" 
          });
        }

        // Store converted audio as base64
        const audioBase64 = conversionResult.buffer.toString('base64');

        // Create transcription record with normalized audio metadata
        const [transcription] = await db
          .insert(transcriptions)
          .values({
            languageId,
            audioFilename: req.file.originalname,
            audioData: audioBase64,
            sampleRate: conversionResult.metadata.sampleRate, // 16000
            audioChannels: conversionResult.metadata.channels, // 1 (mono)
            status: "uploaded",
          })
          .returning();

        console.log(`Audio converted successfully: ${conversionResult.metadata.sampleRate}Hz, ${conversionResult.metadata.channels} channel(s)`);

        res.json({
          id: transcription.id,
          filename: transcription.audioFilename,
          duration: Math.round(duration),
        });
      } catch (conversionError) {
        console.error("Error converting audio:", conversionError);
        return res.status(400).json({ 
          error: "Invalid audio file or unable to process audio. Please ensure the file is a valid MP3, WAV, or M4A file." 
        });
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // Background polling function for Google Speech-to-Text operations
  async function pollTranscriptionOperation(transcriptionId: number, operationName: string, languageCode: string, gcsUri?: string) {
    try {
      const client = getSpeechClient();
      
      let attempts = 0;
      const maxAttempts = 120; // 10 minutes max (5 second intervals)

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

        try {
          // Check operation status using the client library
          const operation = await client.checkLongRunningRecognizeProgress(operationName);

          if (operation.done) {
            if (operation.error) {
              // Update status to failed
              await db
                .update(transcriptions)
                .set({ status: "failed" })
                .where(eq(transcriptions.id, transcriptionId));
              console.error('Transcription operation failed:', operation.error);
              return;
            }

            // Extract transcribed text from completed operation
            const response = operation.result as protos.google.cloud.speech.v1.ILongRunningRecognizeResponse;
            
            // Debug logging to see what Google returns
            console.log('Operation response:', JSON.stringify({
              hasResults: !!response.results,
              resultsLength: response.results?.length || 0,
              firstResult: response.results?.[0] ? {
                hasAlternatives: !!response.results[0].alternatives,
                alternativesLength: response.results[0].alternatives?.length || 0,
                firstTranscript: response.results[0].alternatives?.[0]?.transcript || 'EMPTY'
              } : 'NO_RESULTS'
            }, null, 2));
            
            const rawText = response.results
              ?.map(result => result.alternatives?.[0]?.transcript || '')
              .join(' ')
              .trim() || '';

            if (rawText) {
              // Apply preprocessing to detect and replace formatting commands
              // Pass language code to get language-specific commands
              const formattedText = applyPreprocessing(rawText, languageCode);
              
              console.log(`Raw text length: ${rawText.length}, Formatted text length: ${formattedText.length}`);
              
              // Update with formatted transcribed text
              await db
                .update(transcriptions)
                .set({
                  transcribedText: formattedText,
                  editedText: formattedText,
                  status: "completed"
                })
                .where(eq(transcriptions.id, transcriptionId));
              console.log(`Transcription ${transcriptionId} completed successfully with preprocessing`);
            } else {
              await db
                .update(transcriptions)
                .set({ status: "failed" })
                .where(eq(transcriptions.id, transcriptionId));
              console.error('No transcription text generated');
            }
            
            // Clean up GCS file if it was uploaded
            if (gcsUri) {
              await deleteAudioFromGCS(gcsUri);
            }
            
            return;
          }
        } catch (error) {
          console.error('Error polling operation:', error);
        }

        attempts++;
      }

      // Timeout - mark as failed
      await db
        .update(transcriptions)
        .set({ status: "failed" })
        .where(eq(transcriptions.id, transcriptionId));
      console.error(`Transcription ${transcriptionId} timed out after ${maxAttempts} attempts`);
      
      // Clean up GCS file on timeout
      if (gcsUri) {
        await deleteAudioFromGCS(gcsUri);
      }
    } catch (error) {
      console.error('Background polling error:', error);
      await db
        .update(transcriptions)
        .set({ status: "failed" })
        .where(eq(transcriptions.id, transcriptionId));
      
      // Clean up GCS file on error
      if (gcsUri) {
        await deleteAudioFromGCS(gcsUri);
      }
    }
  }

  // Start transcription with Google Speech-to-Text API (returns immediately)
  app.post("/api/transcribe/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const [transcription] = await db
        .select()
        .from(transcriptions)
        .where(eq(transcriptions.id, id));

      if (!transcription) {
        return res.status(404).json({ error: "Transcription not found" });
      }

      // Verify language exists and is active
      const [language] = await db
        .select()
        .from(languages)
        .where(eq(languages.id, transcription.languageId));

      if (!language || !language.isActive) {
        return res.status(404).json({ error: "Language not found or inactive" });
      }

      // Update status to processing
      await db
        .update(transcriptions)
        .set({ status: "processing" })
        .where(eq(transcriptions.id, id));

      let gcsUri: string | undefined;
      
      try {
        // Use Google Speech-to-Text client library with service account
        const client = getSpeechClient();

        // Upload audio to GCS for reliable transcription (supports files up to 480 minutes)
        const audioBuffer = Buffer.from(transcription.audioData, 'base64');
        gcsUri = await uploadAudioToGCS(audioBuffer, transcription.audioFilename);

        // Configure long-running recognition request with audio metadata
        // All audio files are converted to LINEAR16 WAV by AudioConversionService
        const config: protos.google.cloud.speech.v1.IRecognitionConfig = {
          encoding: protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.LINEAR16,
          sampleRateHertz: transcription.sampleRate || 16000,
          audioChannelCount: transcription.audioChannels || 1,
          languageCode: language.code,
          enableAutomaticPunctuation: true,
        };

        const request: protos.google.cloud.speech.v1.ILongRunningRecognizeRequest = {
          audio: {
            uri: gcsUri, // Use GCS URI instead of inline audio
          },
          config,
        };

        // Start long-running operation
        console.log(`Starting transcription for ID ${id} with language ${language.code} from ${gcsUri}`);
        const [operation] = await client.longRunningRecognize(request);
        const operationName = operation.name;

        if (!operationName) {
          throw new Error('Failed to start transcription operation');
        }

        console.log(`Operation started: ${operationName}`);

        // Store operation name for tracking
        await db
          .update(transcriptions)
          .set({ operationName })
          .where(eq(transcriptions.id, id));

        // Start background polling (non-blocking) with language code
        // Extract short language code (e.g., "mr" from "mr-IN") for command filtering
        const languageCode = language.code.split('-')[0];
        pollTranscriptionOperation(id, operationName, languageCode, gcsUri).catch(error => {
          console.error('Background polling error:', error);
        });

        // Return immediately with processing status
        res.json({
          id,
          status: "processing",
        });
      } catch (apiError: any) {
        console.error("Google Speech-to-Text API error:", apiError);
        console.error("Error details:", {
          message: apiError.message,
          code: apiError.code,
          details: apiError.details,
        });
        
        // Clean up GCS file on error
        if (gcsUri) {
          await deleteAudioFromGCS(gcsUri);
        }
        
        // Update status to failed
        await db
          .update(transcriptions)
          .set({ status: "failed" })
          .where(eq(transcriptions.id, id));

        res.status(500).json({ 
          error: apiError.message || "Transcription failed. Please check your audio file and try again." 
        });
      }
    } catch (error) {
      console.error("Error transcribing:", error);
      res.status(500).json({ error: "Failed to transcribe audio" });
    }
  });

  // Check transcription status
  app.get("/api/transcriptions/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const [transcription] = await db
        .select()
        .from(transcriptions)
        .where(eq(transcriptions.id, id));

      if (!transcription) {
        return res.status(404).json({ error: "Transcription not found" });
      }

      res.json({
        id: transcription.id,
        status: transcription.status,
        transcribedText: transcription.transcribedText,
      });
    } catch (error) {
      console.error("Error checking status:", error);
      res.status(500).json({ error: "Failed to check status" });
    }
  });

  // Update edited text
  app.put("/api/transcriptions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Validate request body
      if (!req.body || typeof req.body.editedText !== 'string') {
        return res.status(400).json({ error: "Valid edited text is required" });
      }

      const { editedText } = req.body;

      if (editedText.trim().length === 0) {
        return res.status(400).json({ error: "Edited text cannot be empty" });
      }

      const [updated] = await db
        .update(transcriptions)
        .set({ editedText })
        .where(eq(transcriptions.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Transcription not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating transcription:", error);
      res.status(500).json({ error: "Failed to update transcription" });
    }
  });

  // Generate and download DOCX
  app.get("/api/download/docx/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const [transcription] = await db
        .select()
        .from(transcriptions)
        .where(eq(transcriptions.id, id));

      if (!transcription) {
        return res.status(404).json({ error: "Transcription not found" });
      }

      // Verify language exists and is active
      const [language] = await db
        .select()
        .from(languages)
        .where(eq(languages.id, transcription.languageId));

      if (!language || !language.isActive) {
        return res.status(404).json({ error: "Language not found or inactive" });
      }

      const text = transcription.editedText || transcription.transcribedText || "";
      
      if (!text) {
        return res.status(400).json({ error: "No text available for download" });
      }

      // Determine font based on script
      const fontName = language.script === "Devanagari" ? "Noto Sans Devanagari" : "Calibri";

      // Split text by page breaks
      const pages = splitIntoPages(text);
      
      // Create paragraphs for all pages with page breaks between them
      const children: Paragraph[] = [];
      
      pages.forEach((pageText, index) => {
        // Split page text into lines, preserving blank lines
        const lines = pageText.split('\n');
        
        // If page is completely empty, add one blank paragraph
        if (lines.length === 0 || lines.every(line => line.trim().length === 0)) {
          children.push(new Paragraph({ children: [new TextRun({ text: '', font: { name: fontName } })] }));
        } else {
          // Parse each line for Markdown formatting and create paragraphs
          lines.forEach(line => {
            const parsedLine = MarkdownParser.parseLine(line);
            
            // Skip page break markers (already handled at page level)
            if (parsedLine.isPageBreak) {
              return;
            }
            
            // Convert parsed line to paragraph with formatting
            const paragraph = MarkdownParser.lineToParagraph(parsedLine, fontName);
            children.push(paragraph);
          });
        }
        
        // Add page break after each page except the last one
        if (index < pages.length - 1) {
          children.push(
            new Paragraph({
              children: [new PageBreak()],
            })
          );
        }
      });

      // Create DOCX document with page break support
      const doc = new Document({
        sections: [{
          properties: {},
          children,
        }],
      });

      // Generate buffer
      const buffer = await Packer.toBuffer(doc);

      // Create filename: MyFirstAudio-<langcode>-<timestamp>-transcription.docx
      const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
      const filename = `MyFirstAudio-${language.code.split('-')[0]}-${timestamp}-transcription.docx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      console.error("Error generating DOCX:", error);
      res.status(500).json({ error: "Failed to generate document" });
    }
  });

  // Download audio file
  app.get("/api/download/audio/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const [transcription] = await db
        .select()
        .from(transcriptions)
        .where(eq(transcriptions.id, id));

      if (!transcription) {
        return res.status(404).json({ error: "Transcription not found" });
      }

      // Verify language exists and is active
      const [language] = await db
        .select()
        .from(languages)
        .where(eq(languages.id, transcription.languageId));

      if (!language || !language.isActive) {
        return res.status(404).json({ error: "Language not found or inactive" });
      }

      // Convert base64 back to buffer
      const audioBuffer = Buffer.from(transcription.audioData, 'base64');

      // Create filename: MyFirstAudio-<langcode>-<timestamp>-audio.mp3
      const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
      const filename = `MyFirstAudio-${language.code.split('-')[0]}-${timestamp}-audio.mp3`;

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(audioBuffer);
    } catch (error) {
      console.error("Error downloading audio:", error);
      res.status(500).json({ error: "Failed to download audio" });
    }
  });

  // ============ Admin API for Formatting Commands ============
  
  // Get all formatting commands
  app.get("/api/admin/commands", async (req, res) => {
    try {
      const commandService = getFormattingCommandService();
      const commands = commandService.getAllCommands();
      res.json(commands);
    } catch (error) {
      console.error("Error fetching commands:", error);
      res.status(500).json({ error: "Failed to fetch commands" });
    }
  });

  // Create or update a formatting command
  app.post("/api/admin/commands", async (req, res) => {
    try {
      const validated = FormattingCommandSchema.parse(req.body);
      const commandService = getFormattingCommandService();
      await commandService.upsertCommand(validated);
      res.json({ success: true, command: validated });
    } catch (error) {
      console.error("Error creating/updating command:", error);
      res.status(400).json({ error: "Invalid command data" });
    }
  });

  // Update a specific formatting command
  app.put("/api/admin/commands/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const commandService = getFormattingCommandService();
      
      // Verify command exists
      const existing = commandService.getCommand(id);
      if (!existing) {
        return res.status(404).json({ error: "Command not found" });
      }

      const validated = FormattingCommandSchema.parse({ ...req.body, id });
      await commandService.upsertCommand(validated);
      res.json({ success: true, command: validated });
    } catch (error) {
      console.error("Error updating command:", error);
      res.status(400).json({ error: "Invalid command data" });
    }
  });

  // Delete a formatting command
  app.delete("/api/admin/commands/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const commandService = getFormattingCommandService();
      const deleted = await commandService.deleteCommand(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Command not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting command:", error);
      res.status(500).json({ error: "Failed to delete command" });
    }
  });

  // Reload commands from file
  app.post("/api/admin/commands/reload", async (req, res) => {
    try {
      const commandService = getFormattingCommandService();
      await commandService.reload();
      const commands = commandService.getAllCommands();
      res.json({ success: true, count: commands.length, commands });
    } catch (error) {
      console.error("Error reloading commands:", error);
      res.status(500).json({ error: "Failed to reload commands" });
    }
  });

  app.get("/api/commands/active", requireAuth, async (req, res) => {
    try {
      const lang = req.query.language as string | undefined;
      const commandService = getFormattingCommandService();
      const all = commandService.getAllCommands();
      const active = all.filter((c) => c.isActive && (!lang || c.language === lang));
      res.json(active);
    } catch (error) {
      console.error("Error fetching active commands:", error);
      res.status(500).json({ error: "Failed to fetch commands" });
    }
  });

  // ============ Project API Routes ============

  // User-facing announcements (active, non-dismissed, matching target)
  app.get("/api/announcements", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const user = await storage.getUserById(userId);
      if (!user) return res.status(401).json({ error: "Not authenticated" });
      const items = await storage.getAnnouncementsForUser(userId, user.planId || 1);
      res.json(items);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      res.status(500).json({ error: "Failed to fetch announcements" });
    }
  });

  app.post("/api/announcements/:id/dismiss", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      await storage.dismissAnnouncement(userId, parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error dismissing announcement:", error);
      res.status(500).json({ error: "Failed to dismiss announcement" });
    }
  });

  app.get("/api/projects", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const userProjects = await storage.getProjectsByUserId(userId);
      res.json(userProjects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const user = await storage.getUserById(userId);
      if (!user) return res.status(401).json({ error: "User not found" });

      const { title, languageCode } = req.body;
      if (!title || !languageCode) {
        return res.status(400).json({ error: "Title and language code are required" });
      }

      const project = await storage.createProject({
        userId,
        title,
        languageCode,
        status: "created",
      });

      res.json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  app.get("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const project = await storage.getProjectById(parseInt(req.params.id));
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== userId) {
        const user = await storage.getUserById(userId);
        if (user?.role !== "admin") {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.put("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const project = await storage.getProjectById(parseInt(req.params.id));
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== userId) return res.status(403).json({ error: "Access denied" });

      const updated = await storage.updateProject(project.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  // ============ Project Audio/Transcription Routes ============

  app.post("/api/projects/:id/upload", requireAuth, (req, res, next) => {
    req.setTimeout(600000); // 10 minutes for large file uploads
    res.setTimeout(600000);
    next();
  }, upload.single("audio"), async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const project = await storage.getProjectById(parseInt(req.params.id));
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== userId) return res.status(403).json({ error: "Access denied" });

      if (!(await userHasFeature(userId, "audio_upload"))) {
        return res.status(403).json({ error: "Audio upload is not available on your current plan." });
      }

      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      try {
        const conversionResult = await convertToLinear16Wav(req.file.buffer, req.file.originalname);
        const rawDuration = conversionResult.metadata.duration;
        const duration = (rawDuration && !isNaN(rawDuration) && rawDuration > 0) ? rawDuration : 0;

        if (duration > 1800) {
          return res.status(400).json({ error: "Audio file exceeds maximum duration of 30 minutes" });
        }

        if (isS3Configured()) {
          const s3Key = generateS3Key(project.id, req.file.originalname);
          await uploadAudioToS3(conversionResult.buffer, s3Key);

          await storage.updateProject(project.id, {
            audioFilename: req.file.originalname,
            audioDurationSeconds: Math.round(duration),
            audioS3Key: s3Key,
            audioData: null,
            sampleRate: conversionResult.metadata.sampleRate,
            audioChannels: conversionResult.metadata.channels,
            status: "uploaded",
          });
        } else {
          const audioBase64 = conversionResult.buffer.toString("base64");
          await storage.updateProject(project.id, {
            audioFilename: req.file.originalname,
            audioDurationSeconds: Math.round(duration),
            audioData: audioBase64,
            sampleRate: conversionResult.metadata.sampleRate,
            audioChannels: conversionResult.metadata.channels,
            status: "uploaded",
          });
        }

        res.json({ success: true, filename: req.file.originalname, duration: Math.round(duration) });
      } catch (conversionError: any) {
        console.error("Audio conversion error:", conversionError?.message || conversionError);
        console.error("File details:", { name: req.file.originalname, type: req.file.mimetype, size: req.file.size });
        return res.status(400).json({ error: "Could not process this audio file. Please try a different file or format (MP3, WAV, M4A, WebM)." });
      }
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload audio" });
    }
  });

  app.post("/api/projects/:id/transcribe", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const project = await storage.getProjectById(parseInt(req.params.id));
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== userId) return res.status(403).json({ error: "Access denied" });
      const hasAudio = project.audioS3Key || project.audioData;
      if (!hasAudio) return res.status(400).json({ error: "No audio uploaded" });

      const currentUser = await storage.getUserById(userId);
      if (currentUser) {
        const plan = await storage.getPlanById(currentUser.planId || 1);

        if (currentUser.role !== 'admin') {
          const daysLimit = plan?.daysLimit ?? null;
          if (daysLimit) {
            const trialEndsAt = currentUser.trialEndsAt || new Date(currentUser.createdAt.getTime() + daysLimit * 24 * 60 * 60 * 1000);
            if (new Date() > trialEndsAt) {
              return res.status(403).json({ error: `Your ${daysLimit}-day trial has expired. Transcription services are no longer available. Please upgrade your plan to continue.` });
            }
          }
        }

        const totalMinutes = plan?.totalMinutes || 0;
        const minutesUsed = parseFloat(currentUser.totalMinutesTranscribed || "0");
        const minutesRemaining = Math.max(0, totalMinutes - minutesUsed);
        if (minutesRemaining <= 0) {
          return res.status(403).json({ error: "You have used all your transcription minutes. Please upgrade your plan." });
        }
      }

      await storage.updateProject(project.id, { status: "transcribing" });

      const allLangs = await storage.getLanguages();
      const lang = allLangs.find(l => l.code === project.languageCode);
      if (!lang) return res.status(400).json({ error: "Language not found" });

      let audioBuffer: Buffer;
      if (project.audioS3Key) {
        audioBuffer = await downloadAudioFromS3(project.audioS3Key);
      } else {
        audioBuffer = Buffer.from(project.audioData!, "base64");
      }

      const providerCfg = await storage.getProviderConfigByLanguage(project.languageCode);
      const selectedProvider = providerCfg?.primaryProvider || "sarvam";

      if (selectedProvider === "sarvam" && isSarvamConfigured()) {
        try {
          console.log(`[Transcribe] Using Sarvam for project ${project.id}, lang: ${project.languageCode}, audioSize: ${audioBuffer.length} bytes`);
          const result = await transcribeWithSarvam(
            audioBuffer,
            project.languageCode,
            project.audioFilename || "audio.wav"
          );
          console.log(`[Transcribe] Sarvam result for project ${project.id}:`, JSON.stringify(result));

          const shortLangCode = project.languageCode.split("-")[0];
          const formattedText = result.transcript ? applyPreprocessing(result.transcript, shortLangCode) : "";
          const hasTranscript = !!result.transcript && result.transcript.trim().length > 0;
          const finalStatus = hasTranscript ? "transcribed" : "transcribed";

          await storage.updateProject(project.id, {
            rawTranscript: result.transcript || "",
            formattedTranscript: formattedText,
            editedContent: formattedText,
            sttProvider: "sarvam",
            status: finalStatus,
          });

          const durationSecs = project.audioDurationSeconds || 0;
          await storage.logUsage({
            userId,
            projectId: project.id,
            action: hasTranscript ? "transcription" : "transcription_no_speech",
            provider: "sarvam",
            durationSeconds: durationSecs,
            costInr: "0",
          });

          if (hasTranscript && durationSecs > 0) {
            const currentUser = await storage.getUserById(userId);
            if (currentUser) {
              const currentMinutes = parseFloat(currentUser.totalMinutesTranscribed || "0");
              const addedMinutes = durationSecs / 60;
              await storage.updateUser(userId, {
                totalMinutesTranscribed: (currentMinutes + addedMinutes).toFixed(2),
              });
            }
          }

          if (!hasTranscript) {
            console.log(`[Transcribe] No speech detected in project ${project.id}`);
          }

          res.json({ status: finalStatus, transcript: result.transcript || "", noSpeechDetected: !hasTranscript });
        } catch (sarvamError: any) {
          console.error("Sarvam STT error:", sarvamError.message, sarvamError.stack);
          await storage.updateProject(project.id, { status: "failed" });
          res.status(500).json({ error: sarvamError.message || "Sarvam transcription failed" });
        }
      } else {
        let gcsUri: string | undefined;
        try {
          const client = getSpeechClient();
          gcsUri = await uploadAudioToGCS(audioBuffer, project.audioFilename || "audio.wav");

          const config: protos.google.cloud.speech.v1.IRecognitionConfig = {
            encoding: protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.LINEAR16,
            sampleRateHertz: project.sampleRate || 16000,
            audioChannelCount: project.audioChannels || 1,
            languageCode: project.languageCode,
            enableAutomaticPunctuation: true,
          };

          const request: protos.google.cloud.speech.v1.ILongRunningRecognizeRequest = {
            audio: { uri: gcsUri },
            config,
          };

          const [operation] = await client.longRunningRecognize(request);
          const operationName = operation.name;

          if (!operationName) throw new Error("Failed to start transcription");

          await storage.updateProject(project.id, { sttJobId: operationName, sttProvider: "google" });

          const shortLangCode = project.languageCode.split("-")[0];
          pollProjectTranscription(project.id, operationName, shortLangCode, userId, gcsUri).catch(console.error);

          res.json({ status: "transcribing" });
        } catch (apiError: any) {
          console.error("STT API error:", apiError);
          if (gcsUri) await deleteAudioFromGCS(gcsUri);
          await storage.updateProject(project.id, { status: "failed" });
          res.status(500).json({ error: apiError.message || "Transcription failed" });
        }
      }
    } catch (error) {
      console.error("Transcription error:", error);
      res.status(500).json({ error: "Failed to start transcription" });
    }
  });

  async function pollProjectTranscription(projectId: number, operationName: string, languageCode: string, userId: number, gcsUri?: string) {
    try {
      const client = getSpeechClient();
      let attempts = 0;
      const maxAttempts = 120;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        try {
          const operation = await client.checkLongRunningRecognizeProgress(operationName);
          if (operation.done) {
            if (operation.error) {
              await storage.updateProject(projectId, { status: "failed" });
              console.error("Transcription failed:", operation.error);
              return;
            }

            const response = operation.result as protos.google.cloud.speech.v1.ILongRunningRecognizeResponse;
            const rawText = response.results
              ?.map(r => r.alternatives?.[0]?.transcript || "")
              .join(" ")
              .trim() || "";

            if (rawText) {
              const formattedText = applyPreprocessing(rawText, languageCode);
              await storage.updateProject(projectId, {
                rawTranscript: rawText,
                formattedTranscript: formattedText,
                editedContent: formattedText,
                status: "editing",
              });

              const project = await storage.getProjectById(projectId);
              const durationSeconds = project?.audioDurationSeconds || 0;
              await storage.logUsage({
                userId,
                projectId,
                action: "transcription",
                provider: "google",
                durationSeconds,
                characterCount: rawText.length,
              });

              if (durationSeconds > 0) {
                const currentUser = await storage.getUserById(userId);
                if (currentUser) {
                  const currentMinutes = parseFloat(currentUser.totalMinutesTranscribed || "0");
                  const addedMinutes = durationSeconds / 60;
                  await storage.updateUser(userId, {
                    totalMinutesTranscribed: (currentMinutes + addedMinutes).toFixed(2),
                  });
                }
              }

              console.log(`Project ${projectId} transcription completed`);
            } else {
              await storage.updateProject(projectId, { status: "failed" });
            }

            if (gcsUri) await deleteAudioFromGCS(gcsUri);
            return;
          }
        } catch (err) {
          console.error("Poll error:", err);
        }
        attempts++;
      }

      await storage.updateProject(projectId, { status: "failed" });
      if (gcsUri) await deleteAudioFromGCS(gcsUri);
    } catch (error) {
      console.error("Poll error:", error);
      await storage.updateProject(projectId, { status: "failed" });
      if (gcsUri) await deleteAudioFromGCS(gcsUri);
    }
  }

  app.get("/api/projects/:id/audio", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const project = await storage.getProjectById(parseInt(req.params.id));
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== userId) {
        const u = await storage.getUserById(userId);
        if (u?.role !== "admin") return res.status(403).json({ error: "Access denied" });
      }
      const hasAudio = project.audioS3Key || project.audioData;
      if (!hasAudio) return res.status(404).json({ error: "No audio" });

      let audioBuffer: Buffer;
      if (project.audioS3Key) {
        audioBuffer = await downloadAudioFromS3(project.audioS3Key);
      } else {
        audioBuffer = Buffer.from(project.audioData!, "base64");
      }
      res.setHeader("Content-Type", "audio/wav");
      res.setHeader("Content-Disposition", `inline; filename="${project.audioFilename || "audio.wav"}"`);
      res.send(audioBuffer);
    } catch (error) {
      res.status(500).json({ error: "Failed to serve audio" });
    }
  });

  // ============ Translation API Routes ============

  app.get("/api/projects/:id/translations", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const project = await storage.getProjectById(parseInt(req.params.id));
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== userId) {
        const u = await storage.getUserById(userId);
        if (u?.role !== "admin") return res.status(403).json({ error: "Access denied" });
      }
      const translations = await storage.getTranslationsByProjectId(project.id);
      res.json(translations);
    } catch (error) {
      console.error("Error fetching translations:", error);
      res.status(500).json({ error: "Failed to fetch translations" });
    }
  });

  app.post("/api/projects/:id/translations", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const project = await storage.getProjectById(parseInt(req.params.id));
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== userId) return res.status(403).json({ error: "Access denied" });

      if (!(await userHasFeature(userId, "translation"))) {
        return res.status(403).json({ error: "Translation is not available on your current plan." });
      }

      const currentUser = await storage.getUserById(userId);
      if (currentUser && currentUser.role !== 'admin') {
        const plan = await storage.getPlanById(currentUser.planId || 1);
        const daysLimit = plan?.daysLimit ?? null;
        if (daysLimit) {
          const trialEndsAt = currentUser.trialEndsAt || new Date(currentUser.createdAt.getTime() + daysLimit * 24 * 60 * 60 * 1000);
          if (new Date() > trialEndsAt) {
            return res.status(403).json({ error: `Your ${daysLimit}-day trial has expired. Translation services are no longer available. Please upgrade your plan to continue.` });
          }
        }
      }

      const { targetLanguageCode } = req.body;
      if (!targetLanguageCode) return res.status(400).json({ error: "Target language is required" });

      const validLangs = ["en-IN", "hi-IN", "mr-IN"];
      if (!validLangs.includes(targetLanguageCode)) {
        return res.status(400).json({ error: "Target language must be English, Hindi, or Marathi" });
      }

      if (targetLanguageCode === project.languageCode) {
        return res.status(400).json({ error: "Cannot translate to the same language as the source" });
      }

      const sourceText = project.editedContent || project.formattedTranscript || project.rawTranscript || "";
      if (!sourceText.trim()) {
        return res.status(400).json({ error: "No transcribed text available to translate" });
      }

      if (!isSarvamTranslateConfigured()) {
        return res.status(503).json({ error: "Translation service is not configured" });
      }

      const existing = await storage.getTranslationByProjectAndLang(project.id, targetLanguageCode);
      if (existing) {
        await storage.updateTranslationText(existing.id, { status: "translating" });
      }

      const translatedContent = await translateText(sourceText, project.languageCode, targetLanguageCode);

      let translation;
      if (existing) {
        translation = await storage.updateTranslationText(existing.id, {
          translatedContent,
          editedContent: translatedContent,
          status: "generated",
        });
      } else {
        translation = await storage.createTranslationText({
          projectId: project.id,
          sourceLanguageCode: project.languageCode,
          targetLanguageCode,
          translatedContent,
          status: "generated",
        });
        await storage.updateTranslationText(translation.id, { editedContent: translatedContent });
      }

      await storage.logUsage({
        userId,
        projectId: project.id,
        action: "translation",
        provider: "sarvam",
        characterCount: sourceText.length,
      });

      await storage.updateProject(project.id, { status: "translated" });

      res.json(translation);
    } catch (error: any) {
      console.error("Translation error:", error);
      res.status(500).json({ error: error.message || "Translation failed" });
    }
  });

  app.put("/api/translations/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const translation = await storage.getTranslationById(parseInt(req.params.id));
      if (!translation) return res.status(404).json({ error: "Translation not found" });

      const project = await storage.getProjectById(translation.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== userId) return res.status(403).json({ error: "Access denied" });

      const { editedContent } = req.body;
      const updated = await storage.updateTranslationText(translation.id, {
        editedContent,
        status: "edited",
      });
      res.json(updated);
    } catch (error) {
      console.error("Error updating translation:", error);
      res.status(500).json({ error: "Failed to update translation" });
    }
  });

  app.get("/api/projects/:id/docx", requireAuth, async (req, res) => {
    req.setTimeout(300000);
    res.setTimeout(300000);
    try {
      const userId = (req.session as any).userId;
      const project = await storage.getProjectById(parseInt(req.params.id));
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== userId) {
        const u = await storage.getUserById(userId);
        if (u?.role !== "admin") return res.status(403).json({ error: "Access denied" });
      }

      if (!(await userHasFeature(userId, "docx_export"))) {
        return res.status(403).json({ error: "DOCX export is not available on your current plan." });
      }

      const mode = (req.query.mode as string) || "source";
      const translationLang = req.query.translationLang as string;

      const sourceText = project.editedContent || project.formattedTranscript || project.rawTranscript || "";
      if (!sourceText && mode === "source") return res.status(400).json({ error: "No text to export" });

      const allLangs = await storage.getLanguages();
      const sourceLang = allLangs.find(l => l.code === project.languageCode);
      const sourceFontName = getDocxFontName(sourceLang?.scriptFamily, sourceLang?.script);

      let translationText = "";
      let targetLang: any = null;
      let targetFontName = "Calibri";

      if (mode === "translation" || mode === "both") {
        if (!translationLang) return res.status(400).json({ error: "Translation language is required for this export mode" });
        const tr = await storage.getTranslationByProjectAndLang(project.id, translationLang);
        if (!tr) return res.status(404).json({ error: "Translation not found for this language" });
        translationText = tr.editedContent || tr.translatedContent || "";
        targetLang = allLangs.find(l => l.code === translationLang);
        targetFontName = getDocxFontName(targetLang?.scriptFamily, targetLang?.script);
      }

      const children: Paragraph[] = [];

      function addTextSection(text: string, fontName: string, sectionTitle?: string) {
        if (sectionTitle) {
          children.push(new Paragraph({
            children: [new TextRun({ text: sectionTitle, bold: true, size: 28, font: { name: fontName } })],
          }));
          children.push(new Paragraph({ children: [new TextRun({ text: "", font: { name: fontName } })] }));
        }
        const pages = splitIntoPages(text);
        pages.forEach((pageText, index) => {
          const lines = pageText.split("\n");
          if (lines.every(line => !line.trim())) {
            children.push(new Paragraph({ children: [new TextRun({ text: "", font: { name: fontName } })] }));
          } else {
            lines.forEach(line => {
              const parsedLine = MarkdownParser.parseLine(line);
              if (parsedLine.isPageBreak) return;
              const paragraph = MarkdownParser.lineToParagraph(parsedLine, fontName);
              children.push(paragraph);
            });
          }
          if (index < pages.length - 1) {
            children.push(new Paragraph({ children: [new PageBreak()] }));
          }
        });
      }

      if (mode === "source" || mode === "both") {
        addTextSection(sourceText, sourceFontName, mode === "both" ? "Original Transcription" : undefined);
      }

      if (mode === "both") {
        children.push(new Paragraph({ children: [new PageBreak()] }));
      }

      if (mode === "translation" || mode === "both") {
        const langLabel = targetLang?.name || translationLang;
        addTextSection(translationText, targetFontName, mode === "both" ? `Translation (${langLabel})` : undefined);
      }

      const addDocxWatermark = await userHasFeature(userId, "docx_watermark");
      const placeholderHeader = addDocxWatermark ? new Header({
        children: [new Paragraph({ children: [] })],
      }) : undefined;

      const doc = new Document({
        sections: [{
          properties: {},
          headers: placeholderHeader ? { default: placeholderHeader } : undefined,
          children,
        }],
      });
      let docBuffer = await Packer.toBuffer(doc);
      if (addDocxWatermark) {
        docBuffer = await injectDocxDiagonalWatermark(docBuffer);
      }
      const timestamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0];
      const suffix = mode === "both" ? "-bilingual" : mode === "translation" ? `-${translationLang}` : "";
      const filename = `${project.title.replace(/[^a-zA-Z0-9]/g, "_")}${suffix}-${timestamp}.docx`;

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(docBuffer);

      await storage.updateProject(project.id, { exportedAt: new Date(), status: "completed" });
      await storage.updateUser(userId, {
        totalProjectsCompleted: (await storage.getUserById(userId))!.totalProjectsCompleted + 1,
      });
    } catch (error) {
      console.error("DOCX export error:", error);
      res.status(500).json({ error: "Failed to generate document" });
    }
  });

  // ============ PDF Export Route ============

  app.get("/api/projects/:id/pdf", requireAuth, async (req, res) => {
    req.setTimeout(300000);
    res.setTimeout(300000);
    try {
      const userId = (req.session as any).userId;
      const project = await storage.getProjectById(parseInt(req.params.id));
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.userId !== userId) {
        const u = await storage.getUserById(userId);
        if (u?.role !== "admin") return res.status(403).json({ error: "Access denied" });
      }

      const hasPdfWatermark = await userHasFeature(userId, "pdf_watermark");
      const hasPdfClean = await userHasFeature(userId, "pdf_no_watermark");
      if (!hasPdfWatermark && !hasPdfClean) {
        return res.status(403).json({ error: "PDF export is not available on your current plan." });
      }

      const mode = (req.query.mode as string) || "source";
      const translationLang = req.query.translationLang as string;
      const sourceText = project.editedContent || project.formattedTranscript || project.rawTranscript || "";
      if (!sourceText && mode === "source") return res.status(400).json({ error: "No text to export" });

      const allLangs = await storage.getLanguages();
      const sourceLang = allLangs.find(l => l.code === project.languageCode);

      let exportText = sourceText;
      let fontFile = sourceLang?.fontFile ?? null;

      if (mode === "translation") {
        if (!translationLang) return res.status(400).json({ error: "Translation language required" });
        const tr = await storage.getTranslationByProjectAndLang(project.id, translationLang);
        if (!tr) return res.status(404).json({ error: "Translation not found" });
        exportText = tr.editedContent || tr.translatedContent || "";
        const tLang = allLangs.find(l => l.code === translationLang);
        fontFile = tLang?.fontFile ?? null;
      } else if (mode === "both") {
        let targetText = "";
        if (translationLang) {
          const tr = await storage.getTranslationByProjectAndLang(project.id, translationLang);
          if (tr) targetText = tr.editedContent || tr.translatedContent || "";
        }
        exportText = `${sourceText}\n\n---PAGE BREAK---\n\n${targetText}`;
      }

      const addWatermark = hasPdfWatermark && !hasPdfClean;
      const pdfBuffer = await generatePdf(exportText, fontFile, addWatermark);

      const timestamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0];
      const suffix = mode === "both" ? "-bilingual" : mode === "translation" ? `-${translationLang}` : "";
      const filename = `${project.title.replace(/[^a-zA-Z0-9]/g, "_")}${suffix}-${timestamp}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(pdfBuffer);

      await storage.updateProject(project.id, { exportedAt: new Date(), status: "completed" });
    } catch (error) {
      console.error("PDF export error:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  // ============ Admin API Routes ============

  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const allPlans = await storage.getPlans();
      const planMap = new Map(allPlans.map(p => [p.id, p]));

      // Sum cost_inr from usage_log per user in a single query
      const costRows = await db.execute(sql`
        SELECT user_id, COALESCE(SUM(cost_inr), 0)::numeric AS total_cost_inr
        FROM usage_log
        GROUP BY user_id
      `);
      const costMap = new Map<number, number>(
        (costRows.rows as any[]).map(r => [r.user_id as number, parseFloat(r.total_cost_inr) || 0])
      );

      res.json(allUsers.map(u => {
        const plan = planMap.get(u.planId || 1);
        return {
          id: u.id,
          email: u.email,
          fullName: u.fullName,
          mobile: u.mobile,
          workplace: u.workplace,
          professionalGroup: u.professionalGroup,
          role: u.role,
          isActive: u.isActive,
          planId: u.planId,
          planName: plan?.planName || "Unknown",
          totalMinutes: plan?.totalMinutes || 0,
          totalProjectsCompleted: u.totalProjectsCompleted,
          totalMinutesTranscribed: u.totalMinutesTranscribed,
          minutesRemaining: Math.max(0, (plan?.totalMinutes || 0) - parseFloat(u.totalMinutesTranscribed || "0")),
          totalCostInr: costMap.get(u.id) ?? 0,
          createdAt: u.createdAt,
        };
      }));
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.put("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const updated = await storage.updateUser(parseInt(req.params.id), req.body);
      if (!updated) return res.status(404).json({ error: "User not found" });
      res.json(updated);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Admin: announcement CRUD
  app.get("/api/admin/announcements", requireAdmin, async (req, res) => {
    try {
      const items = await storage.getAllAnnouncements();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch announcements" });
    }
  });

  app.post("/api/admin/announcements", requireAdmin, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const item = await storage.createAnnouncement({ ...req.body, createdBy: userId });
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to create announcement" });
    }
  });

  app.put("/api/admin/announcements/:id", requireAdmin, async (req, res) => {
    try {
      const item = await storage.updateAnnouncement(parseInt(req.params.id), req.body);
      if (!item) return res.status(404).json({ error: "Announcement not found" });
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to update announcement" });
    }
  });

  app.delete("/api/admin/announcements/:id", requireAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteAnnouncement(parseInt(req.params.id));
      if (!deleted) return res.status(404).json({ error: "Announcement not found" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete announcement" });
    }
  });

  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getUsageStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.get("/api/admin/providers", requireAdmin, async (req, res) => {
    try {
      const configs = await storage.getProviderConfigs();
      res.json(configs);
    } catch (error) {
      console.error("Error fetching providers:", error);
      res.status(500).json({ error: "Failed to fetch providers" });
    }
  });

  app.post("/api/admin/providers", requireAdmin, async (req, res) => {
    try {
      const config = await storage.upsertProviderConfig(req.body);
      res.json(config);
    } catch (error) {
      console.error("Error saving provider config:", error);
      res.status(500).json({ error: "Failed to save provider config" });
    }
  });

  app.get("/api/admin/settings/:key", requireAdmin, async (req, res) => {
    try {
      const value = await storage.getSetting(req.params.key);
      res.json({ key: req.params.key, value });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch setting" });
    }
  });

  app.put("/api/admin/settings/:key", requireAdmin, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      await storage.setSetting(req.params.key, req.body.value, userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save setting" });
    }
  });

  // ============ Admin Language Group Routes ============

  app.get("/api/admin/language-groups", requireAdmin, async (req, res) => {
    try {
      const groups = await storage.getAllLanguageGroupsWithLanguages();
      res.json(groups);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch language groups" });
    }
  });

  app.post("/api/admin/language-groups", requireAdmin, async (req, res) => {
    try {
      const { name, description, languageIds } = req.body;
      if (!name) return res.status(400).json({ error: "Name is required" });
      const group = await storage.createLanguageGroup({ name, description });
      if (languageIds && languageIds.length > 0) {
        await storage.setLanguageGroupLanguages(group.id, languageIds);
      }
      const withLangs = await storage.getAllLanguageGroupsWithLanguages();
      res.json(withLangs.find(g => g.id === group.id) || group);
    } catch (error) {
      res.status(500).json({ error: "Failed to create language group" });
    }
  });

  app.put("/api/admin/language-groups/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, description, languageIds } = req.body;
      const updated = await storage.updateLanguageGroup(id, { name, description });
      if (!updated) return res.status(404).json({ error: "Language group not found" });
      if (languageIds !== undefined) {
        await storage.setLanguageGroupLanguages(id, languageIds);
      }
      const withLangs = await storage.getAllLanguageGroupsWithLanguages();
      res.json(withLangs.find(g => g.id === id) || updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update language group" });
    }
  });

  app.delete("/api/admin/language-groups/:id", requireAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteLanguageGroup(parseInt(req.params.id));
      if (!deleted) return res.status(404).json({ error: "Language group not found" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete language group" });
    }
  });

  // ============ Plans API Routes ============

  app.get("/api/plans", async (req, res) => {
    try {
      const allPlans = await storage.getPlans();
      res.json(allPlans.filter(p => p.isActive));
    } catch (error) {
      console.error("Error fetching plans:", error);
      res.status(500).json({ error: "Failed to fetch plans" });
    }
  });

  app.patch("/api/users/me/plan", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { planId } = req.body;
      if (!planId || typeof planId !== "number") {
        return res.status(400).json({ error: "Valid planId is required" });
      }
      const plan = await storage.getPlanById(planId);
      if (!plan || !plan.isActive) {
        return res.status(404).json({ error: "Plan not found or inactive" });
      }
      await storage.updateUserPlan(userId, planId);
      res.json({ success: true, planId });
    } catch (error) {
      console.error("Error updating user plan:", error);
      res.status(500).json({ error: "Failed to update plan" });
    }
  });

  app.post("/api/admin/plans", requireAdmin, async (req, res) => {
    try {
      const plan = await storage.createPlan(req.body);
      res.json(plan);
    } catch (error) {
      console.error("Error creating plan:", error);
      res.status(500).json({ error: "Failed to create plan" });
    }
  });

  app.put("/api/admin/plans/:id", requireAdmin, async (req, res) => {
    try {
      const updated = await storage.updatePlan(parseInt(req.params.id), req.body);
      if (!updated) return res.status(404).json({ error: "Plan not found" });
      res.json(updated);
    } catch (error) {
      console.error("Error updating plan:", error);
      res.status(500).json({ error: "Failed to update plan" });
    }
  });

  app.delete("/api/admin/plans/:id", requireAdmin, async (req, res) => {
    try {
      const deleted = await storage.deletePlan(parseInt(req.params.id));
      if (!deleted) return res.status(404).json({ error: "Plan not found" });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting plan:", error);
      res.status(500).json({ error: "Failed to delete plan" });
    }
  });

  // ── DOCUMENT TRANSLATION ─────────────────────────────────────────────────────
  const docUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ext = file.originalname.split(".").pop()?.toLowerCase();
      if (ext === "txt" || ext === "docx") cb(null, true);
      else cb(new Error("Only .txt and .docx files are accepted"));
    },
  });

  app.get("/api/document-translations", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const rows = await storage.getDocumentTranslationsByUser(userId);
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch document translations" });
    }
  });

  app.post("/api/document-translations", requireAuth, docUpload.single("file"), async (req, res) => {
    try {
      const userId = (req.session as any).userId;

      const currentUserDT = await storage.getUserById(userId);
      if (currentUserDT?.role !== "admin" && !(await userHasFeature(userId, "document_translation"))) {
        return res.status(403).json({ error: "Document translation is a Pro feature. Please upgrade your plan to access it." });
      }

      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      if (!isSarvamTranslateConfigured()) return res.status(503).json({ error: "Translation service is not configured" });

      const { sourceLanguageCode, targetLanguageCode } = req.body;
      const validLangs = ["en-IN", "hi-IN", "mr-IN"];
      if (!validLangs.includes(sourceLanguageCode) || !validLangs.includes(targetLanguageCode)) {
        return res.status(400).json({ error: "Invalid language selection" });
      }
      if (sourceLanguageCode === targetLanguageCode) {
        return res.status(400).json({ error: "Source and target languages must differ" });
      }

      const ext = req.file.originalname.split(".").pop()?.toLowerCase() ?? "txt";

      // TXT hard limit
      if (ext === "txt" && req.file.buffer.length > 500 * 1024) {
        return res.status(400).json({ error: "TXT files must be under 500 KB" });
      }

      // Extract text
      let originalText = "";
      if (ext === "txt") {
        originalText = req.file.buffer.toString("utf-8");
      } else if (ext === "docx") {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        originalText = result.value;
      }

      if (!originalText.trim()) {
        return res.status(400).json({ error: "The file appears to be empty or contains no readable text" });
      }

      const wordCount = originalText.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount > 20000) {
        return res.status(400).json({ error: `Document is too large (${wordCount.toLocaleString()} words). Maximum is 20,000 words per submission.` });
      }

      // Create pending record
      const record = await storage.createDocumentTranslation({
        userId,
        filename: req.file.originalname,
        fileType: ext,
        sourceLanguageCode,
        targetLanguageCode,
        originalText,
        wordCount,
        status: "translating",
      });

      // Translate
      const translatedText = await translateText(originalText, sourceLanguageCode, targetLanguageCode);

      const updated = await storage.updateDocumentTranslation(record.id, {
        translatedText,
        status: "done",
      });

      await storage.logUsage({
        userId,
        action: "document_translation",
        provider: "sarvam",
        characterCount: originalText.length,
      });

      res.json(updated);
    } catch (error: any) {
      console.error("Document translation error:", error);
      res.status(500).json({ error: error.message || "Translation failed" });
    }
  });

  app.get("/api/document-translations/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const row = await storage.getDocumentTranslationById(parseInt(req.params.id));
      if (!row) return res.status(404).json({ error: "Not found" });
      if (row.userId !== userId) return res.status(403).json({ error: "Access denied" });
      res.json(row);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch record" });
    }
  });

  app.delete("/api/document-translations/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const row = await storage.getDocumentTranslationById(parseInt(req.params.id));
      if (!row) return res.status(404).json({ error: "Not found" });
      if (row.userId !== userId) return res.status(403).json({ error: "Access denied" });
      await storage.deleteDocumentTranslation(row.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to delete record" });
    }
  });

  // Download original or translated document in its native format
  app.get("/api/document-translations/:id/download", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const row = await storage.getDocumentTranslationById(parseInt(req.params.id));
      if (!row) return res.status(404).json({ error: "Not found" });
      if (row.userId !== userId) return res.status(403).json({ error: "Access denied" });

      const field = req.query.field === "translated" ? "translated" : "original";
      const text = field === "translated" ? (row.translatedText ?? "") : row.originalText;
      const baseName = row.filename.replace(/\.[^.]+$/, "");
      const prefix = field === "translated" ? "translated-" : "original-";

      if (row.fileType === "docx") {
        const paragraphs = text.split(/\r?\n/).map(line =>
          new Paragraph({ children: [new TextRun({ text: line, size: 24 })] })
        );
        const doc = new Document({ sections: [{ children: paragraphs }] });
        const buffer = await Packer.toBuffer(doc);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        res.setHeader("Content-Disposition", `attachment; filename="${prefix}${baseName}.docx"`);
        res.send(buffer);
      } else {
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${prefix}${baseName}.txt"`);
        res.send(text);
      }
    } catch (e) {
      res.status(500).json({ error: "Failed to generate download" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
