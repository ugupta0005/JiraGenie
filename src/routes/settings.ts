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
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.warn('[Settings] Could not load settings.json, using defaults');
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings: Settings): void {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
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
