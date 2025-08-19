// Popup script - zarządza interfejsem użytkownika

document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    setupEventListeners();
    updateStatus();
});

async function loadSettings() {
    try {
        const settings = await browser.storage.local.get([
            'apiKey', 'apiEndpoint', 'model'
        ]);
        
        document.getElementById('apiKey').value = settings.apiKey || '';
        document.getElementById('apiEndpoint').value = settings.apiEndpoint || 'https://openrouter.ai/api/v1/chat/completions';
        document.getElementById('model').value = settings.model || 'microsoft/phi-3-mini-128k-instruct:free';
        
        // Sprawdź czy endpoint to custom
        const endpoint = settings.apiEndpoint || 'https://openrouter.ai/api/v1/chat/completions';
        const select = document.getElementById('apiEndpoint');
        const customInput = document.getElementById('customEndpoint');
        
        if (!Array.from(select.options).some(option => option.value === endpoint)) {
            select.value = 'custom';
            customInput.style.display = 'block';
            customInput.value = endpoint;
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

function setupEventListeners() {
    // Zapisz API key
    document.getElementById('saveApiKey').addEventListener('click', saveSettings);
    
    // Enter w polu API key
    document.getElementById('apiKey').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveSettings();
        }
    });
    
    // Zmiana endpoint
    document.getElementById('apiEndpoint').addEventListener('change', (e) => {
        const customInput = document.getElementById('customEndpoint');
        if (e.target.value === 'custom') {
            customInput.style.display = 'block';
            customInput.focus();
        } else {
            customInput.style.display = 'none';
        }
    });
    
    // Test API
    document.getElementById('testApi').addEventListener('click', testApi);
    
    // Otwórz opcje
    document.getElementById('openOptions').addEventListener('click', () => {
        browser.runtime.openOptionsPage();
    });
}

async function saveSettings() {
    try {
        const apiKey = document.getElementById('apiKey').value.trim();
        const endpointSelect = document.getElementById('apiEndpoint');
        const customEndpoint = document.getElementById('customEndpoint').value.trim();
        const model = document.getElementById('model').value.trim();
        
        if (!apiKey) {
            showMessage('Wprowadź API key', 'error');
            return;
        }
        
        const apiEndpoint = endpointSelect.value === 'custom' ? customEndpoint : endpointSelect.value;
        
        if (!apiEndpoint) {
            showMessage('Wprowadź endpoint API', 'error');
            return;
        }
        
        await browser.storage.local.set({
            apiKey,
            apiEndpoint,
            model: model || 'microsoft/phi-3-mini-128k-instruct:free'
        });
        
        showMessage('Ustawienia zapisane!', 'success');
        updateStatus();
        
    } catch (error) {
        console.error('Error saving settings:', error);
        showMessage('Błąd podczas zapisywania', 'error');
    }
}

async function testApi() {
    const button = document.getElementById('testApi');
    const originalText = button.textContent;
    
    try {
        button.textContent = 'Testowanie...';
        button.disabled = true;
        
        const settings = await browser.storage.local.get(['apiKey', 'apiEndpoint', 'model']);
        
        if (!settings.apiKey) {
            showMessage('Najpierw skonfiguruj API key', 'error');
            return;
        }
        
        // Testowe wywołanie API
        const testResponse = await fetch(settings.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.apiKey}`,
                'HTTP-Referer': 'https://firefox-extension-clickbait-detector',
            },
            body: JSON.stringify({
                model: settings.model || 'microsoft/phi-3-mini-128k-instruct:free',
                messages: [{
                    role: 'user',
                    content: 'Test connection. Respond with: "Connection successful"'
                }],
                max_tokens: 50
            })
        });
        
        if (testResponse.ok) {
            const data = await testResponse.json();
            showMessage('✅ Połączenie z API działa!', 'success');
        } else {
            const errorText = await testResponse.text();
            showMessage(`❌ Błąd API: ${testResponse.status}`, 'error');
            console.error('API Error:', errorText);
        }
        
    } catch (error) {
        console.error('Test API error:', error);
        showMessage(`❌ Błąd: ${error.message}`, 'error');
    } finally {
        button.textContent = originalText;
        button.disabled = false;
    }
}

function showMessage(text, type = 'info') {
    // Usuń poprzednie wiadomości
    const existing = document.querySelector('.message');
    if (existing) existing.remove();
    
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.textContent = text;
    message.style.cssText = `
        padding: 10px;
        margin: 10px 0;
        border-radius: 4px;
        text-align: center;
        font-weight: 600;
    `;
    
    if (type === 'success') {
        message.style.background = '#d4edda';
        message.style.color = '#155724';
        message.style.border = '1px solid #c3e6cb';
    } else if (type === 'error') {
        message.style.background = '#f8d7da';
        message.style.color = '#721c24';
        message.style.border = '1px solid #f5c6cb';
    }
    
    document.querySelector('.container').appendChild(message);
    
    // Usuń po 3 sekundach
    setTimeout(() => {
        if (message.parentNode) {
            message.remove();
        }
    }, 3000);
}

async function updateStatus() {
    const indicator = document.getElementById('statusIndicator');
    const text = document.getElementById('statusText');
    
    try {
        const settings = await browser.storage.local.get(['apiKey']);
        
        if (settings.apiKey) {
            indicator.className = 'status-indicator enabled';
            text.textContent = 'Gotowy - Alt+Shift+C włącza tryb';
        } else {
            indicator.className = 'status-indicator disabled';
            text.textContent = 'Skonfiguruj API key aby rozpocząć';
        }
    } catch (error) {
        indicator.className = 'status-indicator disabled';
        text.textContent = 'Błąd sprawdzania statusu';
    }
}
