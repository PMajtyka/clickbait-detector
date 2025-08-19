// Options script - zarządza zaawansowanymi ustawieniami

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    setupEventListeners();
});

async function loadSettings() {
    try {
        const settings = await browser.storage.local.get([
            'apiKey', 'apiEndpoint', 'model', 'customPrompt', 
            'language', 'maxTokens', 'temperature', 'cacheResults', 'debugMode'
        ]);
        
        // Podstawowe ustawienia
        document.getElementById('apiKey').value = settings.apiKey || '';
        document.getElementById('model').value = settings.model || 'microsoft/phi-3-mini-128k-instruct:free';
        
        // Endpoint
        const endpoint = settings.apiEndpoint || 'https://openrouter.ai/api/v1/chat/completions';
        const select = document.getElementById('apiEndpoint');
        const customInput = document.getElementById('customEndpoint');
        
        if (!Array.from(select.options).some(option => option.value === endpoint)) {
            select.value = 'custom';
            customInput.value = endpoint;
            customInput.classList.remove('hidden');
        } else {
            select.value = endpoint;
        }
        
        // Personalizacja
        document.getElementById('customPrompt').value = settings.customPrompt || '';
        document.getElementById('language').value = settings.language || 'pl';
        
        // Zaawansowane
        document.getElementById('maxTokens').value = settings.maxTokens || 200;
        document.getElementById('temperature').value = settings.temperature || 0.3;
        document.getElementById('temperatureValue').textContent = settings.temperature || 0.3;
        document.getElementById('cacheResults').checked = settings.cacheResults !== false;
        document.getElementById('debugMode').checked = settings.debugMode || false;
        
    } catch (error) {
        console.error('Error loading settings:', error);
        showStatus('Błąd wczytywania ustawień', 'error');
    }
}

function setupEventListeners() {
    // Zapisz ustawienia
    document.getElementById('saveSettings').addEventListener('click', saveSettings);
    
    // Przywróć domyślne
    document.getElementById('resetSettings').addEventListener('click', resetSettings);
    
    // Test połączenia
    document.getElementById('testConnection').addEventListener('click', testConnection);
    
    // Zmiana endpoint
    document.getElementById('apiEndpoint').addEventListener('change', (e) => {
        const customInput = document.getElementById('customEndpoint');
        if (e.target.value === 'custom') {
            customInput.classList.remove('hidden');
            customInput.focus();
        } else {
            customInput.classList.add('hidden');
        }
    });
    
    // Temperature slider
    document.getElementById('temperature').addEventListener('input', (e) => {
        document.getElementById('temperatureValue').textContent = e.target.value;
    });
}

async function saveSettings() {
    try {
        const apiKey = document.getElementById('apiKey').value.trim();
        const endpointSelect = document.getElementById('apiEndpoint');
        const customEndpoint = document.getElementById('customEndpoint').value.trim();
        const model = document.getElementById('model').value.trim();
        const customPrompt = document.getElementById('customPrompt').value.trim();
        const language = document.getElementById('language').value;
        const maxTokens = parseInt(document.getElementById('maxTokens').value);
        const temperature = parseFloat(document.getElementById('temperature').value);
        const cacheResults = document.getElementById('cacheResults').checked;
        const debugMode = document.getElementById('debugMode').checked;
        
        if (!apiKey) {
            showStatus('API Key jest wymagany', 'error');
            return;
        }
        
        const apiEndpoint = endpointSelect.value === 'custom' ? customEndpoint : endpointSelect.value;
        
        if (!apiEndpoint) {
            showStatus('Endpoint API jest wymagany', 'error');
            return;
        }
        
        if (!model) {
            showStatus('Model jest wymagany', 'error');
            return;
        }
        
        await browser.storage.local.set({
            apiKey,
            apiEndpoint,
            model,
            customPrompt,
            language,
            maxTokens,
            temperature,
            cacheResults,
            debugMode
        });
        
        showStatus('Ustawienia zostały zapisane pomyślnie!', 'success');
        
    } catch (error) {
        console.error('Error saving settings:', error);
        showStatus('Błąd podczas zapisywania ustawień', 'error');
    }
}

async function resetSettings() {
    if (!confirm('Czy na pewno chcesz przywrócić domyślne ustawienia?')) {
        return;
    }
    
    try {
        await browser.storage.local.clear();
        
        // Przywróć domyślne wartości w formularzu
        document.getElementById('apiKey').value = '';
        document.getElementById('apiEndpoint').value = 'https://openrouter.ai/api/v1/chat/completions';
        document.getElementById('customEndpoint').classList.add('hidden');
        document.getElementById('model').value = 'microsoft/phi-3-mini-128k-instruct:free';
        document.getElementById('customPrompt').value = '';
        document.getElementById('language').value = 'pl';
        document.getElementById('maxTokens').value = 200;
        document.getElementById('temperature').value = 0.3;
        document.getElementById('temperatureValue').textContent = '0.3';
        document.getElementById('cacheResults').checked = true;
        document.getElementById('debugMode').checked = false;
        
        showStatus('Ustawienia zostały przywrócone do domyślnych', 'info');
        
    } catch (error) {
        console.error('Error resetting settings:', error);
        showStatus('Błąd podczas przywracania ustawień', 'error');
    }
}

async function testConnection() {
    const button = document.getElementById('testConnection');
    const originalText = button.textContent;
    
    try {
        button.textContent = 'Testowanie...';
        button.disabled = true;
        
        // Pobierz aktualne wartości z formularza
        const apiKey = document.getElementById('apiKey').value.trim();
        const endpointSelect = document.getElementById('apiEndpoint');
        const customEndpoint = document.getElementById('customEndpoint').value.trim();
        const model = document.getElementById('model').value.trim();
        
        if (!apiKey) {
            showStatus('Wprowadź API Key przed testem', 'error');
            return;
        }
        
        const apiEndpoint = endpointSelect.value === 'custom' ? customEndpoint : endpointSelect.value;
        
        if (!apiEndpoint) {
            showStatus('Wprowadź endpoint API przed testem', 'error');
            return;
        }
        
        // Test połączenia
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://firefox-extension-clickbait-detector',
            },
            body: JSON.stringify({
                model: model || 'microsoft/phi-3-mini-128k-instruct:free',
                messages: [{
                    role: 'user',
                    content: 'Test connection. Odpowiedz krótko: "Test OK"'
                }],
                max_tokens: 20,
                temperature: 0.1
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            const aiResponse = data.choices?.[0]?.message?.content || 'Brak odpowiedzi';
            showStatus(`✅ Połączenie działa! Odpowiedź: "${aiResponse}"`, 'success');
        } else {
            const errorText = await response.text();
            showStatus(`❌ Błąd ${response.status}: ${response.statusText}`, 'error');
            console.error('API Error details:', errorText);
        }
        
    } catch (error) {
        console.error('Test connection error:', error);
        showStatus(`❌ Błąd połączenia: ${error.message}`, 'error');
    } finally {
        button.textContent = originalText;
        button.disabled = false;
    }
}

function showStatus(message, type = 'info') {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
    status.classList.remove('hidden');
    
    // Auto-hide po 5 sekundach
    setTimeout(() => {
        status.classList.add('hidden');
    }, 5000);
}