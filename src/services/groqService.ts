import Groq from 'groq-sdk';
import { Settings, BugReport } from '../types/index';

export async function analyzeScreenshot(
  imageBase64: string,
  imageMimeType: string,
  description: string,
  settings: Settings
): Promise<BugReport> {
  const client = new Groq({ apiKey: settings.groqApiKey });

  const systemPrompt = `You are an expert QA engineer and bug report specialist. 
Your job is to analyze a screenshot of a software bug and the tester's description, 
then produce a structured, professional bug report.

Always respond with a valid JSON object using EXACTLY this structure:
{
  "title": "Short, clear bug title (max 80 chars)",
  "stepsToReproduce": ["Step 1", "Step 2", "Step N"],
  "expectedResult": "What should happen",
  "actualResult": "What actually happened (from the screenshot)",
  "environment": "Browser/OS/Device info if visible, otherwise 'Not specified'",
  "severity": "Critical | High | Medium | Low",
  "additionalNotes": "Any other relevant observations from the screenshot"
}

Be specific, professional, and concise. Look carefully at the screenshot for visual clues about the bug.`;

  const userPrompt = `Please analyze this bug screenshot and the following description to create a professional bug report.

Tester's Description: ${description || 'No additional description provided.'}

Analyze the screenshot carefully and provide a detailed, structured bug report as a JSON object.`;

  const response = await client.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:${imageMimeType};base64,${imageBase64}`,
            },
          },
          {
            type: 'text',
            text: userPrompt,
          },
        ],
      },
    ],
    temperature: 0.3,
    max_tokens: 1024,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response received from Groq API');
  }

  const bugReport: BugReport = JSON.parse(content);

  // Validate required fields
  if (!bugReport.title || !bugReport.stepsToReproduce || !bugReport.expectedResult || !bugReport.actualResult) {
    throw new Error('Invalid bug report structure received from Groq API');
  }

  return bugReport;
}

export async function testGroqConnection(groqApiKey: string): Promise<boolean> {
  const client = new Groq({ apiKey: groqApiKey });

  const response = await client.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [{ role: 'user', content: 'Reply with the single word: OK' }],
    max_tokens: 10,
    temperature: 0,
  });

  return !!response.choices[0]?.message?.content;
}
