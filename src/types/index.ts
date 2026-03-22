export interface Settings {
  jiraUrl: string;
  jiraEmail: string;
  jiraApiKey: string;
  jiraProjectKey: string;
  jiraIssueType: string;
  groqApiKey: string;
}

export interface AnalyzeRequest {
  description: string;
  imageBase64: string;
  imageMimeType: string;
}

export interface BugReport {
  title: string;
  stepsToReproduce: string[];
  expectedResult: string;
  actualResult: string;
  environment: string;
  severity: string;
  additionalNotes: string;
}

export interface JiraTicket {
  issueKey: string;
  issueId: string;
  issueUrl: string;
  summary: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
