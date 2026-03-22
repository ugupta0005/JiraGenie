var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// Toast notification helper
function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toastContainer');
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
function setConnectionStatus(el, status, message) {
    el.style.display = 'flex';
    const dotClass = status === 'testing' ? 'testing' : status;
    const textColor = status === 'success' ? 'var(--success)' : status === 'error' ? 'var(--error)' : 'var(--warning)';
    el.innerHTML = `<span class="status-dot ${dotClass}"></span><span style="color:${textColor}">${message}</span>`;
}
// DOM references
const jiraUrlInput = document.getElementById('jiraUrl');
const jiraEmailInput = document.getElementById('jiraEmail');
const jiraApiKeyInput = document.getElementById('jiraApiKey');
const jiraProjectKeyInput = document.getElementById('jiraProjectKey');
const jiraIssueTypeInput = document.getElementById('jiraIssueType');
const groqApiKeyInput = document.getElementById('groqApiKey');
const saveBtn = document.getElementById('saveBtn');
const testJiraBtn = document.getElementById('testJiraBtn');
const testGroqBtn = document.getElementById('testGroqBtn');
const jiraStatus = document.getElementById('jiraStatus');
const groqStatus = document.getElementById('groqStatus');
const toggleJiraKey = document.getElementById('toggleJiraKey');
const toggleGroqKey = document.getElementById('toggleGroqKey');
// ===== Toggle password visibility =====
function setupToggle(btn, input) {
    btn.addEventListener('click', () => {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        btn.textContent = isPassword ? '🙈' : '👁';
        btn.title = isPassword ? 'Hide API key' : 'Show API key';
    });
}
setupToggle(toggleJiraKey, jiraApiKeyInput);
setupToggle(toggleGroqKey, groqApiKeyInput);
// ===== Load Settings =====
function loadSettings() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch('/api/settings');
            const result = yield response.json();
            if (result.success && result.data) {
                const s = result.data;
                jiraUrlInput.value = s.jiraUrl || '';
                jiraEmailInput.value = s.jiraEmail || '';
                jiraApiKeyInput.value = s.jiraApiKey || '';
                jiraProjectKeyInput.value = s.jiraProjectKey || '';
                jiraIssueTypeInput.value = s.jiraIssueType || 'Bug';
                groqApiKeyInput.value = s.groqApiKey || '';
            }
        }
        catch (err) {
            showToast('Failed to load settings', 'error');
        }
    });
}
// ===== Save Settings =====
saveBtn.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
    const settings = {
        jiraUrl: jiraUrlInput.value.trim(),
        jiraEmail: jiraEmailInput.value.trim(),
        jiraApiKey: jiraApiKeyInput.value,
        jiraProjectKey: jiraProjectKeyInput.value.trim().toUpperCase(),
        jiraIssueType: jiraIssueTypeInput.value.trim() || 'Bug',
        groqApiKey: groqApiKeyInput.value,
    };
    if (!settings.jiraUrl && !settings.groqApiKey) {
        showToast('Please fill in at least some settings before saving', 'error');
        return;
    }
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner"></span> Saving...';
    try {
        const response = yield fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings),
        });
        const result = yield response.json();
        if (result.success) {
            showToast(result.message || 'Settings saved!', 'success');
            // Reload to get masked values
            yield loadSettings();
        }
        else {
            throw new Error(result.error);
        }
    }
    catch (err) {
        const error = err;
        showToast(error.message || 'Failed to save settings', 'error');
    }
    finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}));
// ===== Test Jira Connection =====
testJiraBtn.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
    // First save current values so the backend uses them
    const settings = {
        jiraUrl: jiraUrlInput.value.trim(),
        jiraEmail: jiraEmailInput.value.trim(),
        jiraApiKey: jiraApiKeyInput.value,
        jiraProjectKey: jiraProjectKeyInput.value.trim(),
        jiraIssueType: jiraIssueTypeInput.value.trim() || 'Bug',
        groqApiKey: groqApiKeyInput.value,
    };
    if (!settings.jiraUrl || !settings.jiraEmail || !settings.jiraApiKey) {
        showToast('Please fill in Jira URL, email, and API key first', 'error');
        return;
    }
    // Temporarily save so test uses current form values
    yield fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
    });
    const originalText = testJiraBtn.textContent;
    testJiraBtn.disabled = true;
    testJiraBtn.innerHTML = '<span class="spinner"></span> Testing...';
    setConnectionStatus(jiraStatus, 'testing', 'Testing connection...');
    try {
        const response = yield fetch('/api/test/jira', { method: 'POST' });
        const result = yield response.json();
        if (result.success) {
            setConnectionStatus(jiraStatus, 'success', result.message || 'Connected!');
            showToast(result.message || 'Jira connected!', 'success');
        }
        else {
            throw new Error(result.error);
        }
    }
    catch (err) {
        const error = err;
        const msg = error.message || 'Jira connection failed';
        setConnectionStatus(jiraStatus, 'error', msg);
        showToast(msg, 'error', 6000);
    }
    finally {
        testJiraBtn.disabled = false;
        testJiraBtn.textContent = originalText;
    }
}));
// ===== Test Groq Connection =====
testGroqBtn.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
    if (!groqApiKeyInput.value) {
        showToast('Please enter your Groq API key first', 'error');
        return;
    }
    // Temporarily save so the test uses current form values
    yield fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jiraUrl: jiraUrlInput.value.trim(),
            jiraEmail: jiraEmailInput.value.trim(),
            jiraApiKey: jiraApiKeyInput.value,
            jiraProjectKey: jiraProjectKeyInput.value.trim(),
            jiraIssueType: jiraIssueTypeInput.value.trim() || 'Bug',
            groqApiKey: groqApiKeyInput.value,
        }),
    });
    const originalText = testGroqBtn.textContent;
    testGroqBtn.disabled = true;
    testGroqBtn.innerHTML = '<span class="spinner"></span> Testing...';
    setConnectionStatus(groqStatus, 'testing', 'Calling Groq API...');
    try {
        const response = yield fetch('/api/test/groq', { method: 'POST' });
        const result = yield response.json();
        if (result.success) {
            setConnectionStatus(groqStatus, 'success', result.message || 'Connected!');
            showToast(result.message || 'Groq connected!', 'success');
        }
        else {
            throw new Error(result.error);
        }
    }
    catch (err) {
        const error = err;
        const msg = error.message || 'Groq connection failed';
        setConnectionStatus(groqStatus, 'error', msg);
        showToast(msg, 'error', 6000);
    }
    finally {
        testGroqBtn.disabled = false;
        testGroqBtn.textContent = originalText;
    }
}));
// ===== Init =====
loadSettings();
