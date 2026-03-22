import { Router, Request, Response } from 'express';
import multer from 'multer';
import { analyzeScreenshot } from '../services/groqService';
import { createJiraTicket, attachFilesToTicket } from '../services/jiraService';
import { parseCustomFields } from '../services/customFieldParser';
import { loadSettings } from './settings';
import { ApiResponse, JiraTicket } from '../types/index';

const router = Router();

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
  'video/mp4', 'video/quicktime', 'video/webm', 'video/avi', 'video/x-matroska',
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per file (videos can be large)
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Use images (PNG, JPG, WebP, GIF) or videos (MP4, MOV, WebM).`));
    }
  },
});

router.post('/', upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    const description = req.body.description as string || '';

    if (!files || files.length === 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'No files provided. Please drop at least one screenshot or video.',
      };
      return res.status(400).json(response);
    }

    const settings = loadSettings();

    if (!settings.groqApiKey) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Groq API key not configured. Please go to Settings.',
      };
      return res.status(400).json(response);
    }

    if (!settings.jiraUrl || !settings.jiraApiKey || !settings.jiraProjectKey) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Jira settings not fully configured. Please go to Settings.',
      };
      return res.status(400).json(response);
    }

    if (/^\d+$/.test(settings.jiraProjectKey)) {
      const response: ApiResponse<null> = {
        success: false,
        error: `"${settings.jiraProjectKey}" is not a valid Jira Project Key. Enter the alphabetic key (e.g. DEV, BUG, QA) in Settings.`,
      };
      return res.status(400).json(response);
    }

    // Use first image file for Groq AI analysis (videos are not supported by Groq vision)
    const imageFile = files.find(f => f.mimetype.startsWith('image/'));
    if (!imageFile) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'At least one image (screenshot) is required for AI analysis. Videos alone cannot be analyzed.',
      };
      return res.status(400).json(response);
    }

    const imageBase64 = imageFile.buffer.toString('base64');
    const imageMimeType = imageFile.mimetype;

    console.log(`[Analyze] Files received: ${files.map(f => `${f.originalname}(${f.mimetype})`).join(', ')}`);
    console.log(`[Analyze] Using "${imageFile.originalname}" for Groq analysis`);

    // Step 0: Parse custom Jira fields from the description
    const { jiraFields, cleanDescription } = parseCustomFields(description);
    if (Object.keys(jiraFields).length > 0) {
      console.log(`[Analyze] Extracted ${Object.keys(jiraFields).length} custom field(s) from description`);
    }

    // Step 1: Analyze first image with Groq LLaMA Scout (using cleaned description without field metadata)
    const bugReport = await analyzeScreenshot(imageBase64, imageMimeType, cleanDescription, settings);
    console.log(`[Analyze] Bug report generated: "${bugReport.title}"`);

    // Step 2: Create Jira ticket with custom fields
    console.log(`[Analyze] Creating Jira ticket in project: ${settings.jiraProjectKey}...`);
    const jiraTicket = await createJiraTicket(bugReport, settings, jiraFields);
    console.log(`[Analyze] Jira ticket created: ${jiraTicket.issueKey}`);

    // Step 3: Attach ALL files to the Jira ticket
    console.log(`[Analyze] Attaching ${files.length} file(s) to ${jiraTicket.issueKey}...`);
    const attachmentResults = await attachFilesToTicket(jiraTicket.issueKey, files, settings);
    console.log(`[Analyze] Attached ${attachmentResults.length} file(s) successfully`);

    const response: ApiResponse<JiraTicket & { bugReport: typeof bugReport; attachments: typeof attachmentResults }> = {
      success: true,
      data: {
        ...jiraTicket,
        bugReport,
        attachments: attachmentResults,
      },
      message: `Jira ticket ${jiraTicket.issueKey} created with ${attachmentResults.length} attachment(s)!`,
    };

    return res.json(response);
  } catch (error: unknown) {
    console.error('[Analyze] Error:', error);
    const err = error as {
      message?: string;
      response?: {
        data?: {
          errorMessages?: string[];
          errors?: Record<string, string>;
        };
      };
    };

    const jiraErrors = err.response?.data?.errors;
    const jiraErrorMessages = err.response?.data?.errorMessages;

    let errorMessage = 'An unexpected error occurred';
    if (jiraErrors && Object.keys(jiraErrors).length > 0) {
      errorMessage = Object.entries(jiraErrors).map(([f, m]) => `${f}: ${m}`).join('; ');
    } else if (jiraErrorMessages && jiraErrorMessages.length > 0) {
      errorMessage = jiraErrorMessages[0];
    } else if (err.message) {
      errorMessage = err.message;
    }

    const response: ApiResponse<null> = { success: false, error: errorMessage };
    return res.status(500).json(response);
  }
});

export default router;
