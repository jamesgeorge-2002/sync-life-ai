/* ============================================
   DOM ELEMENTS
   ============================================ */
const sidebar = document.getElementById('sidebar');
const sidebarClose = document.getElementById('sidebar-close');
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const uploadButton = document.getElementById('upload-button');
const fileInput = document.getElementById('file-input');
const documentsList = document.getElementById('documents-list');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
const messagesContainer = document.getElementById('messages-container');
const welcomeScreen = document.getElementById('welcome-screen');
const loadingIndicator = document.getElementById('loading-indicator');
const dropZoneOverlay = document.getElementById('drop-zone-overlay');
const contextButton = document.getElementById('context-button');
const contextMenu = document.getElementById('context-menu');
const contextLabel = document.getElementById('context-label');
const modalOverlay = document.getElementById('modal-overlay');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalCancel = document.getElementById('modal-cancel');
const modalConfirm = document.getElementById('modal-confirm');
const modalClose = document.getElementById('modal-close');
const toastContainer = document.getElementById('toast-container');

/* ============================================
   STATE
   ============================================ */
let chatHistory = [];
let loadedDocuments = [];
let currentContext = 'all';
let isSending = false;

/* ============================================
   INITIALIZATION
   ============================================ */
function init() {
    setupEventListeners();
    loadDocuments();
    autoResizeTextarea();
}

/* ============================================
   EVENT LISTENERS
   ============================================ */
function setupEventListeners() {
    // Sidebar
    sidebarClose.addEventListener('click', closeSidebar);
    mobileMenuToggle.addEventListener('click', toggleSidebar);
    
    // Upload
    uploadButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag & Drop
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);
    
    // Chat
    chatInput.addEventListener('keydown', handleChatInputKeydown);
    chatInput.addEventListener('input', autoResizeTextarea);
    sendButton.addEventListener('click', sendMessage);
    
    // Context Menu
    contextButton.addEventListener('click', toggleContextMenu);
    document.addEventListener('click', closeContextMenuOnClickOutside);
    
    // Modals
    modalCancel.addEventListener('click', closeModal);
    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
    
    // Suggested Prompts
    document.querySelectorAll('.prompt-button').forEach(btn => {
        btn.addEventListener('click', () => {
            const prompt = btn.dataset.prompt;
            chatInput.value = prompt;
            autoResizeTextarea();
            chatInput.focus();
            updateSendButtonState();
        });
    });
}

/* ============================================
   SIDEBAR
   ============================================ */
function toggleSidebar() {
    sidebar.classList.toggle('open');
}

function closeSidebar() {
    sidebar.classList.remove('open');
}

function openSidebar() {
    sidebar.classList.add('open');
}

/* ============================================
   FILE HANDLING
   ============================================ */
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        validateAndUploadFile(file);
        fileInput.value = '';
    }
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZoneOverlay.style.display = 'flex';
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.target === document) {
        dropZoneOverlay.style.display = 'none';
    }
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZoneOverlay.style.display = 'none';
    
    const files = e.dataTransfer.files;
    const file = files[0];
    if (file) {
        validateAndUploadFile(file);
    }
}

function validateAndUploadFile(file) {
    if (file.type !== 'application/pdf') {
        showToast('Please select a PDF file', 'error');
        return;
    }
    
    uploadFile(file);
}

function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    showToast(`Uploading ${file.name}...`, 'info');
    
    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('PDF uploaded successfully!', 'success');
            loadDocuments();
            if (welcomeScreen.style.display !== 'none') {
                showChatInterface();
            }
        } else {
            showToast(data.message || 'Upload failed', 'error');
        }
    })
    .catch(error => {
        console.error('Upload error:', error);
        showToast('Upload failed. Please try again.', 'error');
    });
}

/* ============================================
   DOCUMENT MANAGEMENT
   ============================================ */
function loadDocuments() {
    fetch('/loaded-files')
    .then(response => response.json())
    .then(data => {
        loadedDocuments = data.files || [];
        renderDocumentsList();
        updateContextMenu();
    })
    .catch(error => console.error('Error loading documents:', error));
}

function renderDocumentsList() {
    documentsList.innerHTML = '';
    
    if (loadedDocuments.length === 0) {
        documentsList.innerHTML = `
            <div class="empty-documents">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                    <polyline points="13 2 13 9 20 9"></polyline>
                </svg>
                <p>No documents yet</p>
                <span>Upload a PDF to get started</span>
            </div>
        `;
        return;
    }
    
    loadedDocuments.forEach(filename => {
        const item = document.createElement('div');
        item.className = 'document-item';
        item.innerHTML = `
            <div class="document-item-info">
                <div class="document-item-name">${escapeHtml(filename)}</div>
                <div class="document-item-meta">
                    <span class="document-item-status">✓ Ready</span>
                </div>
            </div>
            <button class="document-item-menu" title="Options">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="5" r="1"></circle>
                    <circle cx="12" cy="12" r="1"></circle>
                    <circle cx="12" cy="19" r="1"></circle>
                </svg>
            </button>
        `;
        
        const menuBtn = item.querySelector('.document-item-menu');
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showDeleteConfirmation(filename);
        });
        
        documentsList.appendChild(item);
    });
}

function updateContextMenu() {
    const contextMenuDocs = document.getElementById('context-menu-documents');
    contextMenuDocs.innerHTML = '';
    
    loadedDocuments.forEach(filename => {
        const item = document.createElement('div');
        item.className = 'context-menu-item';
        item.dataset.context = filename;
        item.innerHTML = `
            <span class="context-icon">○</span>
            ${escapeHtml(filename)}
        `;
        
        item.addEventListener('click', () => {
            selectContext(filename);
        });
        
        contextMenuDocs.appendChild(item);
    });
}

/* ============================================
   CONTEXT SELECTION
   ============================================ */
function toggleContextMenu() {
    const isOpen = contextMenu.style.display !== 'none';
    contextMenu.style.display = isOpen ? 'none' : 'block';
    contextButton.classList.toggle('open', !isOpen);
}

function closeContextMenuOnClickOutside(e) {
    if (!contextButton.contains(e.target) && !contextMenu.contains(e.target)) {
        contextMenu.style.display = 'none';
        contextButton.classList.remove('open');
    }
}

function selectContext(context) {
    currentContext = context;
    
    // Update button label
    if (context === 'all') {
        contextLabel.textContent = 'All documents';
    } else {
        contextLabel.textContent = context;
    }
    
    // Update menu
    document.querySelectorAll('.context-menu-item').forEach(item => {
        item.classList.toggle('selected', item.dataset.context === context);
    });
    
    closeContextMenu();
}

function closeContextMenu() {
    contextMenu.style.display = 'none';
    contextButton.classList.remove('open');
}

/* ============================================
   DELETE CONFIRMATION
   ============================================ */
function showDeleteConfirmation(filename) {
    modalTitle.textContent = 'Delete document?';
    modalBody.textContent = `Are you sure you want to remove "${filename}"? This action cannot be undone.`;
    
    modalConfirm.textContent = 'Delete';
    modalConfirm.onclick = () => deleteDocument(filename);
    
    modalOverlay.style.display = 'flex';
}

function deleteDocument(filename) {
    closeModal();
    
    fetch('/delete-pdf', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filename })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('Document deleted', 'success');
            loadDocuments();
        } else {
            showToast(data.message || 'Failed to delete document', 'error');
        }
    })
    .catch(error => {
        console.error('Delete error:', error);
        showToast('Failed to delete document', 'error');
    });
}

function closeModal() {
    modalOverlay.style.display = 'none';
}

/* ============================================
   CHAT
   ============================================ */
function handleChatInputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

function autoResizeTextarea() {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    updateSendButtonState();
}

function updateSendButtonState() {
    sendButton.disabled = chatInput.value.trim().length === 0;
}

async function sendMessage() {
    const query = chatInput.value.trim();
    if (!query || isSending) return;
    
    // Hide welcome screen
    welcomeScreen.style.display = 'none';
    
    // Add user message
    addUserMessage(query);
    
    // Clear input
    chatInput.value = '';
    autoResizeTextarea();
    
    // Show loading
    loadingIndicator.style.display = 'flex';
    isSending = true;
    
    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query, mode: 'pdf', document: currentContext })
        });
        
        const data = await response.json();
        
        if (data.response) {
            addAssistantMessage(data.response);
        }
    } catch (error) {
        console.error('Chat error:', error);
        addAssistantMessage('Sorry, something went wrong. Please try again.');
    } finally {
        loadingIndicator.style.display = 'none';
        isSending = false;
        chatInput.focus();
        scrollToBottom();
    }
}

function addUserMessage(text) {
    const message = document.createElement('div');
    message.className = 'message user';
    message.innerHTML = `<div class="message-content">${escapeHtml(text)}</div>`;
    messagesContainer.appendChild(message);
    scrollToBottom();
}

function addAssistantMessage(text) {
    const message = document.createElement('div');
    message.className = 'message assistant';
    message.innerHTML = `<div class="message-content">${formatMarkdown(text)}</div>`;
    messagesContainer.appendChild(message);
    scrollToBottom();
}

function scrollToBottom() {
    setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 0);
}

function formatMarkdown(text) {
    // Escape HTML first
    let html = escapeHtml(text);
    
    // Bold: **text** or __text__
    html = html.replace(/\*\*([^\*\*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^__]+)__/g, '<strong>$1</strong>');
    
    // Italic: *text* or _text_
    html = html.replace(/\*([^\*]+)\*/g, '<em>$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
    
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    
    // Lists (basic)
    html = html.replace(/^\- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    return html;
}

function showChatInterface() {
    welcomeScreen.style.display = 'none';
}

/* ============================================
   TOAST NOTIFICATIONS
   ============================================ */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

/* ============================================
   UTILITIES
   ============================================ */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

/* ============================================
   INITIALIZATION
   ============================================ */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
