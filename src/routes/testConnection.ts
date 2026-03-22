import { Router, Request, Response } from 'express';
import { testJiraConnection } from '../services/jiraService';
import { testGroqConnection } from '../services/groqService';
import { loadSettings } from './settings';
import { ApiResponse } from '../types/index';

const router = Router();

// POST /api/test-jira
router.post('/jira', async (_req: Request, res: Response) => {
  try {
    const settings = loadSettings();

    if (!settings.jiraUrl || !settings.jiraEmail || !settings.jiraApiKey) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Jira URL, email, and API key are required to test the connection.',
      };
      return res.status(400).json(response);
    }

    const result = await testJiraConnection(settings);
    const response: ApiResponse<{ userIdentifier: string }> = {
      success: true,
      message: `✓ Jira connection successful! Authenticated as ${result.userIdentifier}`,
      data: { userIdentifier: result.userIdentifier || '' },
    };
    return res.json(response);
  } catch (error: unknown) {
    console.error('[TestJira] Error:', error);
    const err = error as { message?: string; response?: { status?: number; data?: { message?: string; errorMessages?: string[] } } };
    let errorMessage = 'Jira connection failed.';

    if (err.response?.status === 401) {
      errorMessage = 'Jira authentication failed. Check your email and API key.';
    } else if (err.response?.status === 403) {
      errorMessage = 'Access forbidden. Check your Jira permissions.';
    } else if (err.response?.status === 404) {
      errorMessage = 'Jira URL not found. Check your Jira URL.';
    } else if (err.message?.includes('ECONNREFUSED') || err.message?.includes('ENOTFOUND')) {
      errorMessage = 'Cannot reach Jira. Check your Jira URL and internet connection.';
    } else {
      errorMessage = err.response?.data?.message || err.response?.data?.errorMessages?.[0] || err.message || errorMessage;
    }

    const response: ApiResponse<null> = { success: false, error: errorMessage };
    return res.status(500).json(response);
  }
});

// POST /api/test-groq
router.post('/groq', async (_req: Request, res: Response) => {
  try {
    const settings = loadSettings();

    if (!settings.groqApiKey) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Groq API key is required to test the connection.',
      };
      return res.status(400).json(response);
    }

    const ok = await testGroqConnection(settings.groqApiKey);
    if (ok) {
      const response: ApiResponse<null> = {
        success: true,
        message: '✓ Groq connection successful! LLaMA Scout model is accessible.',
      };
      return res.json(response);
    } else {
      throw new Error('Groq returned an empty response');
    }
  } catch (error: unknown) {
    console.error('[TestGroq] Error:', error);
    const err = error as { message?: string; status?: number };
    let errorMessage = 'Groq connection failed.';

    if (err.status === 401 || err.message?.includes('401')) {
      errorMessage = 'Invalid Groq API key. Please check your key.';
    } else if (err.status === 429 || err.message?.includes('429')) {
      errorMessage = 'Groq rate limit reached. Try again later.';
    } else {
      errorMessage = err.message || errorMessage;
    }

    const response: ApiResponse<null> = { success: false, error: errorMessage };
    return res.status(500).json(response);
  }
});

export default router;
