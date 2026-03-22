// Toast notification helper
function showToast(message: string, type: 'success' | 'error' | 'info' = 'info', duration = 4000): void {
  const container = document.getElementById('toastContainer')!;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fadeOut');
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

// Connection status helper
function setConnectionStatus(
  el: HTMLElement,
  status: 'success' | 'error' | 'testing',
  message: string
): void {
  el.style.display = 'flex';
  const dotClass = status === 'testing' ? 'testing' : status;
  const textColor = status === 'success' ? 'var(--success)' : status === 'error' ? 'var(--error)' : 'var(--warning)';
  el.innerHTML = `<span class="status-dot ${dotClass}"></span><span style="color:${textColor}">${message}</span>`;
}

// DOM references
const jiraUrlInput = document.getElementById('jiraUrl') as HTMLInputElement;
const jiraEmailInput = document.getElementById('jiraEmail') as HTMLInputElement;
const jiraApiKeyInput = document.getElementById('jiraApiKey') as HTMLInputElement;
const jiraProjectKeyInput = document.getElementById('jiraProjectKey') as HTMLInputElement;
const jiraIssueTypeInput = document.getElementById('jiraIssueType') as HTMLInputElement;
const groqApiKeyInput = document.getElementById('groqApiKey') as HTMLInputElement;
const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
const testJiraBtn = document.getElementById('testJiraBtn') as HTMLButtonElement;
const testGroqBtn = document.getElementById('testGroqBtn') as HTMLButtonElement;
const jiraStatus = document.getElementById('jiraStatus') as HTMLDivElement;
const groqStatus = document.getElementById('groqStatus') as HTMLDivElement;
const toggleJiraKey = document.getElementById('toggleJiraKey') as HTMLButtonElement;
const toggleGroqKey = document.getElementById('toggleGroqKey') as HTMLButtonElement;

// Track whether API key fields have been modified by the user
let jiraKeyDirty = false;
let groqKeyDirty = false;

jiraApiKeyInput.addEventListener('input', () => { jiraKeyDirty = true; });
groqApiKeyInput.addEventListener('input', () => { groqKeyDirty = true; });

// ===== Toggle password visibility =====
function setupToggle(btn: HTMLButtonElement, input: HTMLInputElement): void {
  btn.addEventListener('click', () => {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    btn.textContent = isPassword ? '🙈' : '👁';
    btn.title = isPassword ? 'Hide API key' : 'Show API key';
  });
}

setupToggle(toggleJiraKey, jiraApiKeyInput);
setupToggle(toggleGroqKey, groqApiKeyInput);

// ===== Load Settings (only on initial page load) =====
async function loadSettings(): Promise<void> {
  try {
    const response = await fetch('/api/settings');
    const result = await response.json() as {
      success: boolean;
      data?: {
        jiraUrl: string;
        jiraEmail: string;
        jiraApiKey: string;
        jiraProjectKey: string;
        jiraIssueType: string;
        groqApiKey: string;
      };
    };

    if (result.success && result.data) {
      const s = result.data;
      jiraUrlInput.value = s.jiraUrl || '';
      jiraEmailInput.value = s.jiraEmail || '';
      jiraApiKeyInput.value = s.jiraApiKey || '';
      jiraProjectKeyInput.value = s.jiraProjectKey || '';
      jiraIssueTypeInput.value = s.jiraIssueType || 'Bug';
      groqApiKeyInput.value = s.groqApiKey || '';
      // Reset dirty flags after load
      jiraKeyDirty = false;
      groqKeyDirty = false;
    }
  } catch (err) {
    showToast('Failed to load settings', 'error');
  }
}

// Gather the current form values, preserving masked keys if untouched
function gatherFormSettings(): Record<string, string> {
  return {
    jiraUrl: jiraUrlInput.value.trim(),
    jiraEmail: jiraEmailInput.value.trim(),
    jiraApiKey: jiraKeyDirty ? jiraApiKeyInput.value : jiraApiKeyInput.value, // send as-is
    jiraProjectKey: jiraProjectKeyInput.value.trim().toUpperCase(),
    jiraIssueType: jiraIssueTypeInput.value.trim() || 'Bug',
    groqApiKey: groqKeyDirty ? groqApiKeyInput.value : groqApiKeyInput.value, // send as-is
  };
}

// ===== Save Settings =====
saveBtn.addEventListener('click', async () => {
  const settings = gatherFormSettings();

  if (!settings.jiraUrl && !settings.groqApiKey) {
    showToast('Please fill in at least some settings before saving', 'error');
    return;
  }

  const originalText = saveBtn.textContent!;
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="spinner"></span> Saving...';

  try {
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });

    const result = await response.json() as { success: boolean; message?: string; error?: string };

    if (result.success) {
      showToast(result.message || 'Settings saved!', 'success');
      // Do NOT reload settings — that overwrites form with masked keys.
      // The form already has the correct values the user typed.
      jiraKeyDirty = false;
      groqKeyDirty = false;
    } else {
      throw new Error(result.error);
    }
  } catch (err: unknown) {
    const error = err as { message?: string };
    showToast(error.message || 'Failed to save settings', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
  }
});

// ===== Test Jira Connection =====
testJiraBtn.addEventListener('click', async () => {
  const settings = gatherFormSettings();

  if (!settings.jiraUrl || !settings.jiraEmail || !settings.jiraApiKey) {
    showToast('Please fill in Jira URL, email, and API key first', 'error');
    return;
  }

  // Save current form values first so the test endpoint uses them
  await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });

  const originalText = testJiraBtn.textContent!;
  testJiraBtn.disabled = true;
  testJiraBtn.innerHTML = '<span class="spinner"></span> Testing...';
  setConnectionStatus(jiraStatus, 'testing', 'Testing connection...');

  try {
    const response = await fetch('/api/test/jira', { method: 'POST' });
    const result = await response.json() as { success: boolean; message?: string; error?: string };

    if (result.success) {
      setConnectionStatus(jiraStatus, 'success', result.message || 'Connected!');
      showToast(result.message || 'Jira connected!', 'success');
    } else {
      throw new Error(result.error);
    }
  } catch (err: unknown) {
    const error = err as { message?: string };
    const msg = error.message || 'Jira connection failed';
    setConnectionStatus(jiraStatus, 'error', msg);
    showToast(msg, 'error', 6000);
  } finally {
    testJiraBtn.disabled = false;
    testJiraBtn.textContent = originalText;
  }
});

// ===== Test Groq Connection =====
testGroqBtn.addEventListener('click', async () => {
  if (!groqApiKeyInput.value) {
    showToast('Please enter your Groq API key first', 'error');
    return;
  }

  // Save current form values first so the test endpoint uses them
  const settings = gatherFormSettings();
  await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });

  const originalText = testGroqBtn.textContent!;
  testGroqBtn.disabled = true;
  testGroqBtn.innerHTML = '<span class="spinner"></span> Testing...';
  setConnectionStatus(groqStatus, 'testing', 'Calling Groq API...');

  try {
    const response = await fetch('/api/test/groq', { method: 'POST' });
    const result = await response.json() as { success: boolean; message?: string; error?: string };

    if (result.success) {
      setConnectionStatus(groqStatus, 'success', result.message || 'Connected!');
      showToast(result.message || 'Groq connected!', 'success');
    } else {
      throw new Error(result.error);
    }
  } catch (err: unknown) {
    const error = err as { message?: string };
    const msg = error.message || 'Groq connection failed';
    setConnectionStatus(groqStatus, 'error', msg);
    showToast(msg, 'error', 6000);
  } finally {
    testGroqBtn.disabled = false;
    testGroqBtn.textContent = originalText;
  }
});

// ===== Init =====
loadSettings();
