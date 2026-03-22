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

/**
 * Read settings from settings.json only (no env vars).
 */
function loadFileSettings(): Settings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.warn('[Settings] Could not read settings.json');
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * The settings used by the application at runtime.
 * Priority: settings.json > env vars > defaults.
 * This ensures user-saved settings (via the Settings page) always win.
 */
export function loadSettings(): Settings {
  const fromFile = loadFileSettings();

  // Only use env vars as a fallback for fields that are empty in the file
  const merged: Settings = {
    jiraUrl: fromFile.jiraUrl || process.env.JIRA_URL || '',
    jiraEmail: fromFile.jiraEmail || process.env.JIRA_EMAIL || '',
    jiraApiKey: fromFile.jiraApiKey || process.env.JIRA_API_KEY || '',
    jiraProjectKey: fromFile.jiraProjectKey || process.env.JIRA_PROJECT_KEY || '',
    jiraIssueType: fromFile.jiraIssueType || process.env.JIRA_ISSUE_TYPE || 'Bug',
    groqApiKey: fromFile.groqApiKey || process.env.GROQ_API_KEY || '',
  };

  return merged;
}

function saveSettings(settings: Settings): void {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
    console.log('[Settings] Written to:', SETTINGS_FILE);
    console.log('[Settings] Saved data:', JSON.stringify({
      ...settings,
      jiraApiKey: settings.jiraApiKey ? '***SET***' : '',
      groqApiKey: settings.groqApiKey ? '***SET***' : '',
    }));
  } catch (err) {
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
    // Read existing from FILE only (not env vars) so we can properly merge API keys
    const existing = loadFileSettings();
    const incoming = req.body as Partial<Settings>;

    console.log('[Settings] Save request received');
    console.log('[Settings]   incoming jiraUrl:', incoming.jiraUrl);
    console.log('[Settings]   incoming jiraProjectKey:', incoming.jiraProjectKey);
    console.log('[Settings]   incoming jiraApiKey masked?', incoming.jiraApiKey?.includes('****'));

    // Merge: if API key field contains '****' it's a masked value → keep existing real key
    const updated: Settings = {
      jiraUrl: incoming.jiraUrl ?? existing.jiraUrl,
      jiraEmail: incoming.jiraEmail ?? existing.jiraEmail,
      jiraApiKey: incoming.jiraApiKey?.includes('****') ? existing.jiraApiKey : (incoming.jiraApiKey ?? existing.jiraApiKey),
      jiraProjectKey: incoming.jiraProjectKey ?? existing.jiraProjectKey,
      jiraIssueType: incoming.jiraIssueType ?? existing.jiraIssueType,
      groqApiKey: incoming.groqApiKey?.includes('****') ? existing.groqApiKey : (incoming.groqApiKey ?? existing.groqApiKey),
    };

    saveSettings(updated);

    const response: ApiResponse<null> = { success: true, message: 'Settings saved successfully!' };
    return res.json(response);
  } catch (error) {
    console.error('[Settings] Save error:', error);
    const response: ApiResponse<null> = { success: false, error: 'Failed to save settings' };
    return res.status(500).json(response);
  }
});

export default router;
