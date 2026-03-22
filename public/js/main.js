var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// ===== Toast helper =====
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
function formatBytes(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
// ===== DOM =====
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const emptyState = document.getElementById('emptyState');
const fileList = document.getElementById('fileList');
const descriptionInput = document.getElementById('descriptionInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const dragOverlay = document.getElementById('dragOverlay');
const progressSteps = document.getElementById('progressSteps');
const resultCard = document.getElementById('resultCard');
const resultBadge = document.getElementById('resultBadge');
const resultTitle = document.getElementById('resultTitle');
const resultBody = document.getElementById('resultBody');
const resultDetails = document.getElementById('resultDetails');
const bugReportPreview = document.getElementById('bugReportPreview');
const fileCount = document.getElementById('fileCount');
const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
const ALLOWED_VIDEO = ['video/mp4', 'video/quicktime', 'video/webm', 'video/avi', 'video/x-matroska'];
const MAX_SIZE_MB = 50;
const MAX_FILES = 10;
let selectedFiles = [];
// ===== File handling =====
function isAllowed(file) {
    return ALLOWED_IMAGE.includes(file.type) || ALLOWED_VIDEO.includes(file.type);
}
function addFiles(incoming) {
    const arr = Array.from(incoming);
    let added = 0;
    for (const file of arr) {
        if (selectedFiles.length >= MAX_FILES) {
            showToast(`Maximum ${MAX_FILES} files allowed`, 'error');
            break;
        }
        if (!isAllowed(file)) {
            showToast(`"${file.name}" is not supported. Use images (PNG, JPG, WebP, GIF) or videos (MP4, MOV, WebM).`, 'error', 5000);
            continue;
        }
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            showToast(`"${file.name}" exceeds ${MAX_SIZE_MB}MB limit`, 'error');
            continue;
        }
        // Avoid duplicates by name+size
        const exists = selectedFiles.some(f => f.name === file.name && f.size === file.size);
        if (!exists) {
            selectedFiles.push(file);
            added++;
        }
    }
    if (added > 0)
        renderFileList();
    updateAnalyzeBtn();
}
function removeFile(index) {
    selectedFiles.splice(index, 1);
    renderFileList();
    updateAnalyzeBtn();
}
function renderFileList() {
    if (selectedFiles.length === 0) {
        emptyState.style.display = '';
        fileList.innerHTML = '';
        fileList.style.display = 'none';
        fileCount.style.display = 'none';
        dropZone.classList.remove('has-files');
        return;
    }
    emptyState.style.display = 'none';
    fileList.style.display = 'grid';
    fileList.innerHTML = '';
    dropZone.classList.add('has-files');
    const addMoreBtn = document.getElementById('addMoreBtn');
    const imageCount = selectedFiles.filter(f => ALLOWED_IMAGE.includes(f.type)).length;
    const videoCount = selectedFiles.filter(f => ALLOWED_VIDEO.includes(f.type)).length;
    const parts = [];
    if (imageCount)
        parts.push(`${imageCount} image${imageCount > 1 ? 's' : ''}`);
    if (videoCount)
        parts.push(`${videoCount} video${videoCount > 1 ? 's' : ''}`);
    fileCount.textContent = `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} selected (${parts.join(', ')})`;
    fileCount.style.display = 'block';
    selectedFiles.forEach((file, index) => {
        const isImage = ALLOWED_IMAGE.includes(file.type);
        const card = document.createElement('div');
        card.className = 'file-card';
        if (isImage) {
            const img = document.createElement('img');
            img.className = 'file-thumb';
            img.alt = file.name;
            const url = URL.createObjectURL(file);
            img.src = url;
            img.onload = () => URL.revokeObjectURL(url);
            card.appendChild(img);
        }
        else {
            // Video — show icon instead of thumbnail
            const videoThumb = document.createElement('div');
            videoThumb.className = 'file-thumb video-thumb';
            videoThumb.innerHTML = `<span class="video-icon">▶</span>`;
            card.appendChild(videoThumb);
        }
        const info = document.createElement('div');
        info.className = 'file-card-info';
        info.innerHTML = `
      <div class="file-card-name">${file.name}</div>
      <div class="file-card-meta">${formatBytes(file.size)} · ${isImage ? '📸 Image' : '🎬 Video'}</div>
      ${index === 0 && isImage ? '<div class="file-card-badge">🤖 AI Analysis</div>' : ''}
    `;
        card.appendChild(info);
        const removeBtn = document.createElement('button');
        removeBtn.className = 'file-card-remove';
        removeBtn.title = `Remove ${file.name}`;
        removeBtn.textContent = '✕';
        removeBtn.addEventListener('click', (e) => { e.stopPropagation(); removeFile(index); });
        card.appendChild(removeBtn);
        fileList.appendChild(card);
    });
}
function updateAnalyzeBtn() {
    const hasImage = selectedFiles.some(f => ALLOWED_IMAGE.includes(f.type));
    analyzeBtn.disabled = !hasImage;
    if (selectedFiles.length > 0 && !hasImage) {
        analyzeBtn.disabled = true;
        showToast('Add at least one screenshot for AI analysis', 'info');
    }
}
// ===== Drag & Drop =====
let dragCounter = 0;
document.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    dragOverlay.classList.add('active');
});
document.addEventListener('dragleave', () => {
    dragCounter--;
    if (dragCounter <= 0) {
        dragCounter = 0;
        dragOverlay.classList.remove('active');
    }
});
document.addEventListener('dragover', (e) => { e.preventDefault(); });
document.addEventListener('drop', (e) => {
    var _a;
    e.preventDefault();
    dragCounter = 0;
    dragOverlay.classList.remove('active');
    if ((_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.files)
        addFiles(e.dataTransfer.files);
});
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => {
    var _a;
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
    dragCounter = 0;
    dragOverlay.classList.remove('active');
    if ((_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.files)
        addFiles(e.dataTransfer.files);
});
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fileInput.click();
} });
fileInput.addEventListener('change', () => { if (fileInput.files) {
    addFiles(fileInput.files);
    fileInput.value = '';
} });
// ===== Progress Steps =====
function setStep(stepNum, status) {
    const step = document.getElementById(`step${stepNum}`);
    const icon = step.querySelector('.step-icon');
    if (status === 'reset') {
        step.className = 'step';
        icon.textContent = '⏳';
    }
    else if (status === 'active') {
        step.className = 'step active';
        icon.textContent = '⟳';
    }
    else {
        step.className = 'step done';
        icon.textContent = '✓';
    }
}
// ===== Analyze & Submit =====
analyzeBtn.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
    const hasImage = selectedFiles.some(f => ALLOWED_IMAGE.includes(f.type));
    if (!hasImage) {
        showToast('Please add at least one screenshot for AI analysis', 'error');
        return;
    }
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<span class="spinner"></span> Analyzing...';
    progressSteps.classList.add('visible');
    resultCard.classList.remove('visible', 'error');
    [1, 2, 3, 4].forEach(i => setStep(i, 'reset'));
    setStep(1, 'active');
    try {
        const formData = new FormData();
        selectedFiles.forEach(file => formData.append('files', file));
        formData.append('description', descriptionInput.value.trim());
        setTimeout(() => { setStep(1, 'done'); setStep(2, 'active'); }, 1500);
        setTimeout(() => { setStep(2, 'done'); setStep(3, 'active'); }, 4000);
        setTimeout(() => { setStep(3, 'done'); setStep(4, 'active'); }, 6000);
        const response = yield fetch('/api/analyze', { method: 'POST', body: formData });
        const result = yield response.json();
        [1, 2, 3, 4].forEach(i => setStep(i, 'done'));
        if (result.success && result.data) {
            const { issueKey, issueUrl, bugReport, attachments } = result.data;
            const succeededAttachments = attachments.filter(a => a.success);
            const failedAttachments = attachments.filter(a => !a.success);
            resultCard.classList.remove('error');
            resultBadge.textContent = `🎫 ${issueKey}`;
            resultTitle.textContent = bugReport.title;
            let attachHtml = '';
            if (succeededAttachments.length > 0) {
                attachHtml += `<div style="margin-top:10px; font-size:0.8rem; color:var(--success);">📎 ${succeededAttachments.length} file(s) attached: ${succeededAttachments.map(a => a.filename).join(', ')}</div>`;
            }
            if (failedAttachments.length > 0) {
                attachHtml += `<div style="margin-top:4px; font-size:0.8rem; color:var(--warning);">⚠ ${failedAttachments.length} file(s) failed to attach: ${failedAttachments.map(a => a.filename).join(', ')}</div>`;
            }
            resultBody.innerHTML = `
        <p style="font-size:0.85rem; color:var(--text-secondary); margin: 8px 0;">
          Jira ticket created:
          <a href="${issueUrl}" target="_blank" class="result-link">${issueKey} ↗</a>
        </p>
        ${attachHtml}
      `;
            const severityClass = `severity-${bugReport.severity}`;
            bugReportPreview.innerHTML = `
        <div class="report-row"><span class="report-label">Severity</span><span class="report-value"><span class="severity-badge ${severityClass}">${bugReport.severity}</span></span></div>
        <div class="report-row"><span class="report-label">Actual Result</span><span class="report-value">${bugReport.actualResult}</span></div>
        <div class="report-row"><span class="report-label">Expected</span><span class="report-value">${bugReport.expectedResult}</span></div>
        <div class="report-row"><span class="report-label">Environment</span><span class="report-value">${bugReport.environment}</span></div>
        <div class="report-row"><span class="report-label">Steps</span><span class="report-value">${bugReport.stepsToReproduce.map((s, i) => `${i + 1}. ${s}`).join('<br>')}</span></div>
      `;
            resultDetails.style.display = 'block';
            resultCard.classList.add('visible');
            showToast(`✓ ${issueKey} created with ${succeededAttachments.length} attachment(s)!`, 'success', 5000);
        }
        else {
            throw new Error(result.error || 'Unknown error');
        }
    }
    catch (err) {
        const error = err;
        [1, 2, 3, 4].forEach(i => setStep(i, 'done'));
        resultCard.classList.add('visible', 'error');
        resultBadge.textContent = '❌ Error';
        resultTitle.textContent = 'Failed to create ticket';
        resultBody.innerHTML = `<p style="font-size:0.85rem; color:var(--error); margin-top:8px;">${error.message || 'An unexpected error occurred'}</p>`;
        resultDetails.style.display = 'none';
        showToast(error.message || 'Failed to analyze', 'error', 6000);
    }
    finally {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '🚀 Analyze and Push to Jira';
        updateAnalyzeBtn();
    }
}));
