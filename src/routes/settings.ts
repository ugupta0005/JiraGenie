import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { Settings, ApiResponse } from '../types/index';

const router = Router();
const SETTINGS_FILE = path.join(process.cwd(), 'settings.json');

const DEFAULT_SETTINGS: Settings = {
  jiraUrl: '',
  jiraEmail: '',
  jiraApiKey: '',
  jiraProjectKey: '',
  jiraIssueType: 'Bug',
  groqApiKey: '',
};

export function loadSettings(): Settings {
  // Environment variables take priority — required for Vercel/production deployments
  // where file system is read-only and settings.json cannot persist.
  const fromEnv: Partial<Settings> = {
    jiraUrl: process.env.JIRA_URL,
    jiraEmail: process.env.JIRA_EMAIL,
    jiraApiKey: process.env.JIRA_API_KEY,
    jiraProjectKey: process.env.JIRA_PROJECT_KEY,
    jiraIssueType: process.env.JIRA_ISSUE_TYPE,
    groqApiKey: process.env.GROQ_API_KEY,
  };

  // If all required env vars are set, use them directly (Vercel mode)
  if (fromEnv.jiraUrl && fromEnv.jiraApiKey && fromEnv.groqApiKey) {
    return { ...DEFAULT_SETTINGS, ...fromEnv } as Settings;
  }

  // Otherwise fall back to settings.json (local dev mode)
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      const fromFile = JSON.parse(raw) as Partial<Settings>;
      // Merge: env vars override file values if present
      return { ...DEFAULT_SETTINGS, ...fromFile, ...Object.fromEntries(Object.entries(fromEnv).filter(([, v]) => v)) } as Settings;
    }
  } catch (err) {
    console.warn('[Settings] Could not load settings.json, using defaults');
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings: Settings): void {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (err) {
    // Vercel and other read-only environments — silently skip
    console.warn('[Settings] Cannot write settings.json (read-only filesystem). Use environment variables instead.');
  }
}

function maskApiKey(key: string): string {
  if (!key || key.length < 8) return key ? '***' : '';
  return key.substring(0, 4) + '****' + key.substring(key.length - 4);
}

// GET /api/settings - returns settings with partially masked keys
router.get('/', (_req: Request, res: Response) => {
  try {
    const settings = loadSettings();
    const masked = {
      ...settings,
      jiraApiKey: maskApiKey(settings.jiraApiKey),
      groqApiKey: maskApiKey(settings.groqApiKey),
    };
    const response: ApiResponse<typeof masked> = { success: true, data: masked };
    return res.json(response);
  } catch (error) {
    const response: ApiResponse<null> = { success: false, error: 'Failed to load settings' };
    return res.status(500).json(response);
  }
});

// POST /api/settings - saves settings
router.post('/', (req: Request, res: Response) => {
  try {
    const existing = loadSettings();
    const incoming = req.body as Partial<Settings>;

    // Merge: if a field contains '****' it's a masked value, keep existing
    const updated: Settings = {
      jiraUrl: incoming.jiraUrl ?? existing.jiraUrl,
      jiraEmail: incoming.jiraEmail ?? existing.jiraEmail,
      jiraApiKey: incoming.jiraApiKey?.includes('****') ? existing.jiraApiKey : (incoming.jiraApiKey ?? existing.jiraApiKey),
      jiraProjectKey: incoming.jiraProjectKey ?? existing.jiraProjectKey,
      jiraIssueType: incoming.jiraIssueType ?? existing.jiraIssueType,
      groqApiKey: incoming.groqApiKey?.includes('****') ? existing.groqApiKey : (incoming.groqApiKey ?? existing.groqApiKey),
    };

    saveSettings(updated);
    console.log('[Settings] Settings saved successfully');

    const response: ApiResponse<null> = { success: true, message: 'Settings saved successfully!' };
    return res.json(response);
  } catch (error) {
    const response: ApiResponse<null> = { success: false, error: 'Failed to save settings' };
    return res.status(500).json(response);
  }
});

export default router;
