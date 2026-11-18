// ==========================================
// Mail Manager - Frontend Application Logic
// ==========================================

// Global State
const state = {
  recipients: [],
  headerImageBase64: null,
  headerImageName: '',
  headerImageType: '',
  isSending: false,
  abortController: null,
  stats: {
    contacts: 0,
    sent: 0,
    delivered: 0,
    failed: 0,
  },
  settings: {
    gmailUser: '',
    gmailPass: '',
    senderName: 'Administration',
    delaySeconds: 1.5,
    apiEndpoint: '',
  }
};

// DOM Elements
const DOM = {
  // Counters
  statContactsCount: document.getElementById('statContactsCount'),
  statSentCount: document.getElementById('statSentCount'),
  statDeliveredCount: document.getElementById('statDeliveredCount'),
  statFailedCount: document.getElementById('statFailedCount'),
  smtpStatusBadge: document.getElementById('smtpStatusBadge'),
  smtpStatusText: document.getElementById('smtpStatusText'),

  // Form Fields
  recipientsInput: document.getElementById('recipientsInput'),
  detectedCountText: document.getElementById('detectedCountText'),
  subjectInput: document.getElementById('subjectInput'),
  greetingInput: document.getElementById('greetingInput'),
  noticeSubtextInput: document.getElementById('noticeSubtextInput'),
  bodyMessageInput: document.getElementById('bodyMessageInput'),
  closingSenderInput: document.getElementById('closingSenderInput'),

  // Quick action buttons
  loadSampleRecipientsBtn: document.getElementById('loadSampleRecipientsBtn'),
  clearRecipientsBtn: document.getElementById('clearRecipientsBtn'),
  csvFileInput: document.getElementById('csvFileInput'),

  // Inline Image Uploader
  dropZoneBox: document.getElementById('dropZoneBox'),
  imageFileInput: document.getElementById('imageFileInput'),
  uploaderEmptyState: document.getElementById('uploaderEmptyState'),
  uploaderPreviewState: document.getElementById('uploaderPreviewState'),
  headerImagePreview: document.getElementById('headerImagePreview'),
  imageFileName: document.getElementById('imageFileName'),
  removeImageBtn: document.getElementById('removeImageBtn'),

  // Action dock buttons
  openPreviewBtn: document.getElementById('openPreviewBtn'),
  openTestModalBtn: document.getElementById('openTestModalBtn'),
  startCampaignBtn: document.getElementById('startCampaignBtn'),
  settingsToggleBtn: document.getElementById('settingsToggleBtn'),
  quickComposeBtn: document.getElementById('quickComposeBtn'),

  // Preview Modal
  previewModal: document.getElementById('previewModal'),
  closePreviewModalBtn: document.getElementById('closePreviewModalBtn'),
  closePreviewFooterBtn: document.getElementById('closePreviewFooterBtn'),
  confirmFromPreviewBtn: document.getElementById('confirmFromPreviewBtn'),
  viewMobileBtn: document.getElementById('viewMobileBtn'),
  viewDesktopBtn: document.getElementById('viewDesktopBtn'),
  emailMockupFrame: document.getElementById('emailMockupFrame'),
  previewFrom: document.getElementById('previewFrom'),
  previewSubject: document.getElementById('previewSubject'),
  previewGreeting: document.getElementById('previewGreeting'),
  previewNotice: document.getElementById('previewNotice'),
  previewImageWrapper: document.getElementById('previewImageWrapper'),
  previewModalImg: document.getElementById('previewModalImg'),
  previewBodyText: document.getElementById('previewBodyText'),
  previewClosing: document.getElementById('previewClosing'),

  // Settings Modal
  settingsModal: document.getElementById('settingsModal'),
  closeSettingsModalBtn: document.getElementById('closeSettingsModalBtn'),
  closeSettingsFooterBtn: document.getElementById('closeSettingsFooterBtn'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  gmailUserInput: document.getElementById('gmailUserInput'),
  gmailPassInput: document.getElementById('gmailPassInput'),
  togglePassVisibility: document.getElementById('togglePassVisibility'),
  senderNameInput: document.getElementById('senderNameInput'),
  delayInput: document.getElementById('delayInput'),
  apiEndpointInput: document.getElementById('apiEndpointInput'),
  testSmtpBtn: document.getElementById('testSmtpBtn'),
  smtpTestResult: document.getElementById('smtpTestResult'),
  dockerAccordionBtn: document.getElementById('dockerAccordionBtn'),
  dockerAccordionContent: document.getElementById('dockerAccordionContent'),

  // Test Email Modal
  testEmailModal: document.getElementById('testEmailModal'),
  closeTestModalBtn: document.getElementById('closeTestModalBtn'),
  closeTestFooterBtn: document.getElementById('closeTestFooterBtn'),
  testRecipientInput: document.getElementById('testRecipientInput'),
  sendTestEmailSubmitBtn: document.getElementById('sendTestEmailSubmitBtn'),
  testEmailStatus: document.getElementById('testEmailStatus'),

  // Campaign Progress Modal
  campaignProgressModal: document.getElementById('campaignProgressModal'),
  campaignModalTitle: document.getElementById('campaignModalTitle'),
  campaignModalSubtitle: document.getElementById('campaignModalSubtitle'),
  progressPercentage: document.getElementById('progressPercentage'),
  progressFraction: document.getElementById('progressFraction'),
  progressBarFill: document.getElementById('progressBarFill'),
  currentRecipientSending: document.getElementById('currentRecipientSending'),
  activityLogList: document.getElementById('activityLogList'),
  logCounter: document.getElementById('logCounter'),
  abortCampaignBtn: document.getElementById('abortCampaignBtn'),
  finishCampaignBtn: document.getElementById('finishCampaignBtn'),

  // Toast
  toastContainer: document.getElementById('toastContainer'),
};

// ------------------------------------------
// Initialization
// ------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  loadSavedSettings();
  setupEventListeners();
  loadSample50Candidates(); // Preload 50 sample candidates so user immediately sees 50 contacts
});

// Load settings from LocalStorage
function loadSavedSettings() {
  try {
    const saved = localStorage.getItem('mail_manager_settings');
    if (saved) {
      state.settings = { ...state.settings, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Could not load settings from localStorage', e);
  }

  // Populate settings form
  DOM.gmailUserInput.value = state.settings.gmailUser || '';
  DOM.gmailPassInput.value = state.settings.gmailPass || '';
  DOM.senderNameInput.value = state.settings.senderName || 'Administration';
  DOM.delayInput.value = state.settings.delaySeconds || 1.5;
  DOM.apiEndpointInput.value = state.settings.apiEndpoint || '';

  updateSmtpStatusBadge();
}

function saveSettings() {
  state.settings.gmailUser = DOM.gmailUserInput.value.trim();
  state.settings.gmailPass = DOM.gmailPassInput.value.trim();
  state.settings.senderName = DOM.senderNameInput.value.trim() || 'Administration';
  state.settings.delaySeconds = parseFloat(DOM.delayInput.value) || 1.5;
  state.settings.apiEndpoint = DOM.apiEndpointInput.value.trim();

  try {
    localStorage.setItem('mail_manager_settings', JSON.stringify(state.settings));
  } catch (e) {
    console.error('Could not save settings', e);
  }

  updateSmtpStatusBadge();
  showToast('সেটিংস সফলভাবে সেভ হয়েছে!', 'success');
  closeModal(DOM.settingsModal);
}

function updateSmtpStatusBadge() {
  if (state.settings.gmailUser && state.settings.gmailPass) {
    DOM.smtpStatusBadge.classList.add('connected');
    DOM.smtpStatusText.textContent = `কানেক্টেড (${state.settings.gmailUser.split('@')[0]})`;
  } else {
    DOM.smtpStatusBadge.classList.remove('connected');
    DOM.smtpStatusText.textContent = 'Gmail সেট করুন';
  }
}

// ------------------------------------------
// Email Parsing & Recipient Handlers
// ------------------------------------------
function parseRecipients(text) {
  if (!text) return [];
  // Regex to extract all valid email patterns
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const matches = text.match(emailRegex) || [];
  // Deduplicate and trim
  const uniqueEmails = Array.from(new Set(matches.map(e => e.toLowerCase().trim())));
  return uniqueEmails;
}

function updateRecipientsCount() {
  const emails = parseRecipients(DOM.recipientsInput.value);
  state.recipients = emails;
  state.stats.contacts = emails.length;
  DOM.statContactsCount.textContent = emails.length;
  DOM.detectedCountText.textContent = `${emails.length} recipient(s) detected`;
}

function loadSample50Candidates() {
  const sampleList = [];
  for (let i = 1; i <= 50; i++) {
    const pad = String(i).padStart(2, '0');
    sampleList.push(`candidate${pad}@example.com`);
  }
  DOM.recipientsInput.value = sampleList.join('\n');
  updateRecipientsCount();
  showToast('৫০ জন প্রার্থীর নমুনা ইমেইল লোড করা হয়েছে');
}

// ------------------------------------------
// Inline Header Image Uploader
// ------------------------------------------
function setupImageUploader() {
  const dropZone = DOM.dropZoneBox;
  const fileInput = DOM.imageFileInput;

  dropZone.addEventListener('click', (e) => {
    // Only open if not clicking remove button
    if (!e.target.closest('#removeImageBtn')) {
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleImageFile(file);
  });

  // Drag and drop
  ['dragenter', 'dragover'].forEach(name => {
    dropZone.addEventListener(name, (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    dropZone.addEventListener(name, (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleImageFile(files[0]);
    }
  });

  DOM.removeImageBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    removeHeaderImage();
  });
}

function handleImageFile(file) {
  if (!file.type.startsWith('image/')) {
    showToast('অনুগ্রহ করে একটি ছবি ফাইল সিলেক্ট করুন (PNG, JPG, WebP)', 'error');
    return;
  }

  // Check file size (max 8MB for emails)
  if (file.size > 8 * 1024 * 1024) {
    showToast('ছবির সাইজ ৮ মেগাবাইটের কম হতে হবে', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    state.headerImageBase64 = e.target.result;
    state.headerImageName = file.name;
    state.headerImageType = file.type;

    // Update UI
    DOM.headerImagePreview.src = state.headerImageBase64;
    DOM.imageFileName.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    DOM.uploaderEmptyState.style.display = 'none';
    DOM.uploaderPreviewState.style.display = 'flex';

    showToast('হেডার ব্যানার ছবি যুক্ত হয়েছে!', 'success');
  };
  reader.readAsDataURL(file);
}

function removeHeaderImage() {
  state.headerImageBase64 = null;
  state.headerImageName = '';
  state.headerImageType = '';
  DOM.imageFileInput.value = '';
  DOM.headerImagePreview.src = '';
  DOM.uploaderEmptyState.style.display = 'flex';
  DOM.uploaderPreviewState.style.display = 'none';
  showToast('হেডার ছবি সরানো হয়েছে');
}

// ------------------------------------------
// Live Email Preview Modal
// ------------------------------------------
function openEmailPreview() {
  const senderDisplay = state.settings.senderName || 'Administration';
  const senderEmail = state.settings.gmailUser || 'your-email@gmail.com';
  
  DOM.previewFrom.innerHTML = `Sender: <strong>${escapeHtml(senderDisplay)} &lt;${escapeHtml(senderEmail)}&gt;</strong>`;
  DOM.previewSubject.textContent = DOM.subjectInput.value.trim() || 'Notice';
  DOM.previewGreeting.textContent = DOM.greetingInput.value.trim() || 'Dear Candidate,';
  DOM.previewNotice.textContent = DOM.noticeSubtextInput.value.trim() || '';

  // Header Image in Preview
  if (state.headerImageBase64) {
    DOM.previewModalImg.src = state.headerImageBase64;
    DOM.previewImageWrapper.style.display = 'block';
  } else {
    DOM.previewImageWrapper.style.display = 'none';
  }

  DOM.previewBodyText.textContent = DOM.bodyMessageInput.value.trim();
  DOM.previewClosing.textContent = DOM.closingSenderInput.value.trim() || 'Administration';

  openModal(DOM.previewModal);
}

// ------------------------------------------
// API Helpers
// ------------------------------------------
function getApiBaseUrl() {
  if (state.settings.apiEndpoint && state.settings.apiEndpoint.trim()) {
    return state.settings.apiEndpoint.trim().replace(/\/$/, '');
  }
  return '';
}

// Test SMTP Connection
async function testSmtpConnection() {
  const user = DOM.gmailUserInput.value.trim();
  const pass = DOM.gmailPassInput.value.trim();

  if (!user || !pass) {
    showSmtpResult(false, 'দয়া করে জিমেইল এড্রেস ও অ্যাপ পাসওয়ার্ড পূরণ করুন।');
    return;
  }

  DOM.testSmtpBtn.disabled = true;
  DOM.testSmtpBtn.textContent = 'পরীক্ষা করা হচ্ছে...';
  showSmtpResult(null, '');

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/verify-smtp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, pass })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      showSmtpResult(true, '✅ জিমেইল কানেকশন সফল! মেইল পাঠানো যাবে।');
    } else {
      showSmtpResult(false, `❌ ব্যর্থ হয়েছে: ${data.message || 'অথেন্টিকেশন এরর'}। ${data.advice || ''}`);
    }
  } catch (err) {
    console.error(err);
    showSmtpResult(false, `❌ সার্ভারে কানেক্ট করা যায়নি। (${err.message})। আপনার ভিপিএসে ডকার চালু আছে কিনা নিশ্চিত করুন।`);
  } finally {
    DOM.testSmtpBtn.disabled = false;
    DOM.testSmtpBtn.textContent = '🔌 সংযোগ পরীক্ষা করুন (Test Connection)';
  }
}

function showSmtpResult(isSuccess, message) {
  const el = DOM.smtpTestResult;
  if (isSuccess === null) {
    el.style.display = 'none';
    el.className = 'test-result-text';
    return;
  }
  el.textContent = message;
  el.className = isSuccess ? 'test-result-text success' : 'test-result-text error';
  el.style.display = 'block';
}

// Send Single Test Email
async function sendTestEmail() {
  const recipient = DOM.testRecipientInput.value.trim();
  if (!recipient || !recipient.includes('@')) {
    showTestStatus(false, 'সঠিক টেস্ট রিসিভার ইমেইল দিন');
    return;
  }

  if (!state.settings.gmailUser || !state.settings.gmailPass) {
    showTestStatus(false, 'আগে সেটিংস এ গিয়ে আপনার জিমেইল ও অ্যাপ পাসওয়ার্ড সেট করুন');
    return;
  }

  DOM.sendTestEmailSubmitBtn.disabled = true;
  DOM.sendTestEmailSubmitBtn.textContent = 'পাঠানো হচ্ছে...';
  showTestStatus(null, '');

  try {
    const payload = {
      smtp: {
        user: state.settings.gmailUser,
        pass: state.settings.gmailPass,
        senderName: state.settings.senderName
      },
      recipient,
      subject: DOM.subjectInput.value.trim(),
      greeting: DOM.greetingInput.value.trim(),
      notice: DOM.noticeSubtextInput.value.trim(),
      body: DOM.bodyMessageInput.value.trim(),
      closing: DOM.closingSenderInput.value.trim(),
      imageBase64: state.headerImageBase64,
      imageType: state.headerImageType
    };

    const res = await fetch(`${getApiBaseUrl()}/api/send-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok && data.success) {
      showTestStatus(true, `✅ টেস্ট মেইল পাঠানো সম্পন্ন হয়েছে! ${recipient} এর ইনবক্স চেক করুন।`);
      showToast('টেস্ট ইমেইল সফলভাবে পাঠানো হয়েছে!', 'success');
    } else {
      showTestStatus(false, `❌ ব্যর্থ: ${data.message || 'মেইল পাঠানো যায়নি'}`);
    }
  } catch (err) {
    console.error(err);
    showTestStatus(false, `❌ ত্রুটি: ${err.message}. ভিপিএস ডকার সার্ভার চলমান কিনা দেখুন।`);
  } finally {
    DOM.sendTestEmailSubmitBtn.disabled = false;
    DOM.sendTestEmailSubmitBtn.textContent = '✉️ টেস্ট ইমেইল পাঠান';
  }
}

function showTestStatus(isSuccess, message) {
  const el = DOM.testEmailStatus;
  if (isSuccess === null) {
    el.style.display = 'none';
    el.className = 'test-result-text';
    return;
  }
  el.textContent = message;
  el.className = isSuccess ? 'test-result-text success' : 'test-result-text error';
  el.style.display = 'block';
}

// ------------------------------------------
// Bulk Campaign Sending
// ------------------------------------------
async function startCampaign() {
  if (state.recipients.length === 0) {
    showToast('কমপক্ষে ১ জন প্রাপকের ইমেইল এড্রেস লিখুন', 'error');
    DOM.recipientsInput.focus();
    return;
  }

  if (!state.settings.gmailUser || !state.settings.gmailPass) {
    openModal(DOM.settingsModal);
    showToast('প্রথমে জিমেইল আইডি ও অ্যাপ পাসওয়ার্ড সেট করুন', 'error');
    return;
  }

  const confirmMsg = `আপনি কি নিশ্চিত যে ${state.recipients.length} জন প্রার্থীকে একসাথে এই নোটিশ ও হেডার ছবি পাঠাতে চান?`;
  if (!confirm(confirmMsg)) return;

  // Open Campaign Progress Modal
  openModal(DOM.campaignProgressModal);
  DOM.campaignModalTitle.textContent = 'ক্যাম্পেইন পাঠানো হচ্ছে...';
  DOM.campaignModalSubtitle.textContent = 'দয়া করে পেজটি রিফ্রেশ বা বন্ধ করবেন না';
  DOM.abortCampaignBtn.style.display = 'inline-block';
  DOM.finishCampaignBtn.style.display = 'none';
  DOM.activityLogList.innerHTML = '';
  
  // Reset Stats
  state.isSending = true;
  state.stats.sent = 0;
  state.stats.delivered = 0;
  state.stats.failed = 0;
  updateStatsCounters();

  DOM.progressBarFill.style.width = '0%';
  DOM.progressPercentage.textContent = '0%';
  DOM.progressFraction.textContent = `0 / ${state.recipients.length}`;
  DOM.currentRecipientSending.textContent = 'সার্ভারের সাথে সংযোগ স্থাপন করা হচ্ছে...';

  state.abortController = new AbortController();

  const payload = {
    smtp: {
      user: state.settings.gmailUser,
      pass: state.settings.gmailPass,
      senderName: state.settings.senderName
    },
    recipients: state.recipients,
    subject: DOM.subjectInput.value.trim(),
    greeting: DOM.greetingInput.value.trim(),
    notice: DOM.noticeSubtextInput.value.trim(),
    body: DOM.bodyMessageInput.value.trim(),
    closing: DOM.closingSenderInput.value.trim(),
    imageBase64: state.headerImageBase64,
    imageType: state.headerImageType,
    delayMs: (state.settings.delaySeconds || 1.5) * 1000
  };

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/send-campaign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: state.abortController.signal
    });

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
    }

    // Stream SSE events from the fetch response
    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (state.isSending) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop(); // keep remainder

      for (const block of lines) {
        if (!block.trim()) continue;
        const eventMatch = block.match(/event:\s*([^\n]+)/);
        const dataMatch = block.match(/data:\s*([^\n]+)/);
        const eventName = eventMatch ? eventMatch[1].trim() : 'message';
        const data = dataMatch ? JSON.parse(dataMatch[1]) : {};

        handleCampaignEvent(eventName, data);
      }
    }

    finishCampaign();

  } catch (err) {
    if (err.name === 'AbortError') {
      appendLogItem('ক্যাম্পেইন ব্যবহারকারী দ্বারা থামানো হয়েছে।', 'failed');
      showToast('ক্যাম্পেইন থামানো হয়েছে');
    } else {
      console.warn('Real server connection failed, checking demo simulation fallback:', err);
      // If user is testing on static preview without a running backend server, provide fallback simulation demo
      handleDemoSimulation(payload);
    }
  }
}

// Handle Server Sent Event
function handleCampaignEvent(event, data) {
  if (event === 'start') {
    appendLogItem(`সার্ভার ভেরিফাইড। মোট ${data.total} টি মেইল পাঠানো শুরু হচ্ছে...`, 'delivered');
  } else if (event === 'progress') {
    state.stats.sent = data.index;
    if (data.status === 'delivered') {
      state.stats.delivered = data.sentCount;
    } else {
      state.stats.failed = data.failedCount;
    }
    updateStatsCounters();

    const percent = Math.round((data.index / data.total) * 100);
    DOM.progressBarFill.style.width = `${percent}%`;
    DOM.progressPercentage.textContent = `${percent}%`;
    DOM.progressFraction.textContent = `${data.index} / ${data.total}`;
    DOM.currentRecipientSending.textContent = `পাঠানো হচ্ছে: ${data.email}`;

    if (data.status === 'delivered') {
      appendLogItem(`[${data.timestamp}] ✅ ${data.email} — সফলভাবে পৌঁছেছে`, 'delivered');
    } else {
      appendLogItem(`[${data.timestamp}] ❌ ${data.email} — ব্যর্থ (${data.error || 'ত্রুটি'})`, 'failed');
    }
  } else if (event === 'complete') {
    DOM.currentRecipientSending.textContent = data.message;
    finishCampaign();
  } else if (event === 'error') {
    appendLogItem(`❌ সার্ভার এরর: ${data.message}`, 'failed');
    finishCampaign();
  }
}

// Fallback demo runner if static preview has no backend reachable
async function handleDemoSimulation(payload) {
  const runDemo = confirm(
    'সার্ভার ব্যাকএন্ড পাওয়া যায়নি (আপনি সম্ভবত স্ট্যাটিক প্রিভিউ মোডে আছেন)।\n\nআপনি কি এই ড্যাশবোর্ডের প্রগ্রেস বার ও লাইভ লগ কীভাবে কাজ করে তা দেখতে একটি সিমুলেশন টেস্ট চালাতে চান?'
  );

  if (!runDemo) {
    finishCampaign();
    return;
  }

  appendLogItem('ডেমো সিমুলেশন মোড শুরু হয়েছে...', 'delivered');
  const total = payload.recipients.length;

  for (let i = 0; i < total; i++) {
    if (!state.isSending) break;
    const email = payload.recipients[i];
    DOM.currentRecipientSending.textContent = `পাঠানো হচ্ছে: ${email}`;

    await new Promise(r => setTimeout(r, 600));

    state.stats.sent = i + 1;
    // 95% success simulation
    if (Math.random() > 0.08) {
      state.stats.delivered++;
      appendLogItem(`[${new Date().toLocaleTimeString()}] ✅ ${email} — প্রেরিত (200 OK)`, 'delivered');
    } else {
      state.stats.failed++;
      appendLogItem(`[${new Date().toLocaleTimeString()}] ❌ ${email} — বাউন্স / লিমিট অতিক্রম`, 'failed');
    }

    const percent = Math.round(((i + 1) / total) * 100);
    DOM.progressBarFill.style.width = `${percent}%`;
    DOM.progressPercentage.textContent = `${percent}%`;
    DOM.progressFraction.textContent = `${i + 1} / ${total}`;
    updateStatsCounters();
  }

  finishCampaign();
  showToast('সিমুলেশন সম্পন্ন হয়েছে!', 'success');
}

function abortCampaign() {
  state.isSending = false;
  if (state.abortController) {
    state.abortController.abort();
  }
  DOM.currentRecipientSending.textContent = 'ক্যাম্পেইন স্থগিত করা হয়েছে।';
  DOM.abortCampaignBtn.style.display = 'none';
  DOM.finishCampaignBtn.style.display = 'inline-block';
}

function finishCampaign() {
  state.isSending = false;
  DOM.campaignModalTitle.textContent = 'ক্যাম্পেইন সম্পন্ন হয়েছে!';
  DOM.campaignModalSubtitle.textContent = `মোট পাঠানো হয়েছে: ${state.stats.sent} টি | ডেলিভার্ড: ${state.stats.delivered} | ব্যর্থ: ${state.stats.failed}`;
  DOM.abortCampaignBtn.style.display = 'none';
  DOM.finishCampaignBtn.style.display = 'inline-block';
}

function updateStatsCounters() {
  DOM.statSentCount.textContent = state.stats.sent;
  DOM.statDeliveredCount.textContent = state.stats.delivered;
  DOM.statFailedCount.textContent = state.stats.failed;
}

function appendLogItem(text, type = 'delivered') {
  const row = document.createElement('div');
  row.className = `log-row ${type}`;
  row.textContent = text;
  DOM.activityLogList.appendChild(row);
  DOM.activityLogList.scrollTop = DOM.activityLogList.scrollHeight;
  DOM.logCounter.textContent = `${DOM.activityLogList.children.length} টি লগ`;
}

// ------------------------------------------
// CSV File Import Handler
// ------------------------------------------
function setupCsvImporter() {
  DOM.csvFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      const parsedEmails = parseRecipients(content);
      if (parsedEmails.length === 0) {
        showToast('ফাইলে কোনো বৈধ ইমেইল এড্রেস পাওয়া যায়নি', 'error');
        return;
      }

      // Merge with existing or replace
      const current = parseRecipients(DOM.recipientsInput.value);
      const combined = Array.from(new Set([...current, ...parsedEmails]));
      DOM.recipientsInput.value = combined.join('\n');
      updateRecipientsCount();
      showToast(`${parsedEmails.length} টি ইমেইল ইমপোর্ট করা হয়েছে!`, 'success');
    };
    reader.readAsText(file);
    DOM.csvFileInput.value = '';
  });
}

// ------------------------------------------
// UI Helpers & Event Listeners
// ------------------------------------------
function setupEventListeners() {
  // Input changes
  DOM.recipientsInput.addEventListener('input', updateRecipientsCount);
  DOM.loadSampleRecipientsBtn.addEventListener('click', loadSample50Candidates);
  DOM.clearRecipientsBtn.addEventListener('click', () => {
    DOM.recipientsInput.value = '';
    updateRecipientsCount();
    showToast('প্রাপক তালিকা মুছে ফেলা হয়েছে');
  });

  // Image uploader
  setupImageUploader();
  setupCsvImporter();

  // Action Bar Buttons
  DOM.openPreviewBtn.addEventListener('click', openEmailPreview);
  DOM.openTestModalBtn.addEventListener('click', () => {
    openModal(DOM.testEmailModal);
    if (state.settings.gmailUser && !DOM.testRecipientInput.value) {
      DOM.testRecipientInput.value = state.settings.gmailUser;
    }
  });
  DOM.startCampaignBtn.addEventListener('click', startCampaign);

  // Quick Compose / Reset
  DOM.quickComposeBtn.addEventListener('click', () => {
    if (confirm('আপনি কি একটি নতুন ক্যাম্পেইন শুরু করতে চান?')) {
      DOM.subjectInput.value = 'Joining Letter Collection Notice';
      DOM.greetingInput.value = 'Dear Candidate,';
      DOM.noticeSubtextInput.value = 'Please read the following notice carefully.';
      loadSample50Candidates();
      showToast('নতুন ক্যাম্পেইন প্রস্তুত');
    }
  });

  // Settings Modal Controls
  DOM.settingsToggleBtn.addEventListener('click', () => openModal(DOM.settingsModal));
  DOM.smtpStatusBadge.addEventListener('click', () => openModal(DOM.settingsModal));
  DOM.closeSettingsModalBtn.addEventListener('click', () => closeModal(DOM.settingsModal));
  DOM.closeSettingsFooterBtn.addEventListener('click', () => closeModal(DOM.settingsModal));
  DOM.saveSettingsBtn.addEventListener('click', saveSettings);
  DOM.testSmtpBtn.addEventListener('click', testSmtpConnection);

  // Toggle Password Eye
  DOM.togglePassVisibility.addEventListener('click', () => {
    const isPass = DOM.gmailPassInput.type === 'password';
    DOM.gmailPassInput.type = isPass ? 'text' : 'password';
    DOM.togglePassVisibility.textContent = isPass ? '🙈' : '👁️';
  });

  // VPS Accordion
  DOM.dockerAccordionBtn.addEventListener('click', () => {
    const isHidden = DOM.dockerAccordionContent.style.display === 'none';
    DOM.dockerAccordionContent.style.display = isHidden ? 'block' : 'none';
  });

  // Preview Modal Controls
  DOM.closePreviewModalBtn.addEventListener('click', () => closeModal(DOM.previewModal));
  DOM.closePreviewFooterBtn.addEventListener('click', () => closeModal(DOM.previewModal));
  DOM.confirmFromPreviewBtn.addEventListener('click', () => {
    closeModal(DOM.previewModal);
    startCampaign();
  });

  DOM.viewMobileBtn.addEventListener('click', () => {
    DOM.viewMobileBtn.classList.add('active');
    DOM.viewDesktopBtn.classList.remove('active');
    DOM.emailMockupFrame.classList.remove('desktop-mode');
  });

  DOM.viewDesktopBtn.addEventListener('click', () => {
    DOM.viewDesktopBtn.classList.add('active');
    DOM.viewMobileBtn.classList.remove('active');
    DOM.emailMockupFrame.classList.add('desktop-mode');
  });

  // Test Email Modal Controls
  DOM.closeTestModalBtn.addEventListener('click', () => closeModal(DOM.testEmailModal));
  DOM.closeTestFooterBtn.addEventListener('click', () => closeModal(DOM.testEmailModal));
  DOM.sendTestEmailSubmitBtn.addEventListener('click', sendTestEmail);

  // Campaign Progress Modal
  DOM.abortCampaignBtn.addEventListener('click', abortCampaign);
  DOM.finishCampaignBtn.addEventListener('click', () => closeModal(DOM.campaignProgressModal));

  // Close modals on outside click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay && !state.isSending) {
        closeModal(overlay);
      }
    });
  });
}

function openModal(modal) {
  modal.style.display = 'flex';
}

function closeModal(modal) {
  modal.style.display = 'none';
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  DOM.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m]);
}
