// Background script - obsługuje API calls i komunikację

let isCheckingEnabled = false;

// Nasłuchiwanie na skrót klawiszowy
browser.commands.onCommand.addListener((command) => {
  if (command === 'toggle-mode') {
    toggleLinkChecking();
  }
  else if (command === 'check-link') {
    // Sprawdź link pod kursorem, tylko gdy tryb włączony
    if (isCheckingEnabled) {
      browser.tabs.query({active: true, currentWindow: true}).then(tabs => {
        if (tabs.length > 0) {
          browser.tabs.sendMessage(tabs[0].id, {
            action: 'triggerCheckOnHoveredLink'
          });
        }
      });
    }
  }
});

function toggleLinkChecking() {
  isCheckingEnabled = !isCheckingEnabled;
  
  // Wyślij status do wszystkich content scriptów
  browser.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      browser.tabs.sendMessage(tab.id, {
        action: 'toggleLinkChecking',
        enabled: isCheckingEnabled
      }).catch(() => {
        // Ignoruj błędy dla kart, które nie mają content script
      });
    });
  });
  
  // Pokaż notyfikację
  browser.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-48.png',
    title: 'Clickbait Detector',
    message: isCheckingEnabled ? 
      'Tryb sprawdzania linków WŁĄCZONY' : 
      'Tryb sprawdzania linków WYŁĄCZONY'
  });
}

// Nasłuchiwanie na wiadomości z content script
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'checkLink') {
    checkClickbait(message.url)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Asynchroniczny response
  }
});

async function checkClickbait(url) {
  try {
    // Pobierz ustawienia API
    const settings = await browser.storage.local.get(['apiKey', 'apiEndpoint', 'model']);
    
    if (!settings.apiKey) {
      throw new Error('Brak skonfigurowanego API key. Przejdź do ustawień rozszerzenia.');
    }
    
    // Pobierz zawartość strony
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Nie można pobrać strony: ${response.status}`);
    }
    
    const html = await response.text();
    const content = extractContentFromHTML(html);
    
    if (!content.title) {
      throw new Error('Nie znaleziono tytułu strony');
    }
    
    // Wywołaj API LLM
    const llmResponse = await callLLM(settings, content);
    return llmResponse;
    
  } catch (error) {
    console.error('Error checking clickbait:', error);
    throw error;
  }
}

function extractContentFromHTML(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Ekstraktuj tytuł
  const title = doc.querySelector('title')?.textContent?.trim() || '';
  
  // Ekstraktuj główny nagłówek
  const header = doc.querySelector('h1')?.textContent?.trim() || '';
  
  // Ekstraktuj główną treść (uproszczona wersja)
  let content = '';
  
  // Usuń niepotrzebne elementy
  const elementsToRemove = doc.querySelectorAll('script, style, nav, header, footer, aside, .advertisement, .ads');
  elementsToRemove.forEach(el => el.remove());
  
  // Spróbuj znaleźć główną treść
  const articleSelectors = ['article', 'main', '.content', '.post', '.entry', 'div[class*="content"]'];
  let mainContent = null;
  
  for (const selector of articleSelectors) {
    mainContent = doc.querySelector(selector);
    if (mainContent) break;
  }
  
  if (mainContent) {
    content = mainContent.textContent?.trim() || '';
  } else {
    // Fallback - weź wszystkie paragrafy
    const paragraphs = doc.querySelectorAll('p');
    content = Array.from(paragraphs)
      .map(p => p.textContent?.trim())
      .filter(text => text && text.length > 50) // Filtruj krótkie paragrafy
      .join(' ');
  }
  
  // Ogranic długość treści (API może mieć limity)
  if (content.length > 3000) {
    content = content.substring(0, 3000) + '...';
  }
  
  return { title, header, content };
}

async function callLLM(settings, content) {
  const prompt = createPrompt(content);
  
  const apiEndpoint = settings.apiEndpoint || 'https://openrouter.ai/api/v1/chat/completions';
  const model = settings.model || 'microsoft/phi-3-mini-128k-instruct:free';
  
  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`,
      'HTTP-Referer': 'https://firefox-extension-clickbait-detector',
    },
    body: JSON.stringify({
      model: model,
      messages: [{
        role: 'user',
        content: prompt
      }],
      max_tokens: 200,
      temperature: 0.3
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  const aiResponse = data.choices?.[0]?.message?.content || 'Brak odpowiedzi z API';
  
  return {
    success: true,
    response: aiResponse,
    originalTitle: content.title,
    originalHeader: content.header
  };
}

function createPrompt(content) {
  return `Sprawdź, czy poniższy tytuł i nagłówek (jeśli występuje) odpowiada rzeczywistej treści artykułu, a artykuł rzetelnie opisuje wydarzenie, czy jest to clickbait.

TYTUŁ: "${content.title}"
${content.header ? `NAGŁÓWEK: "${content.header}"` : ''}

TREŚĆ ARTYKUŁU:
${content.content}

Odpowiedz w formacie:
CLICKBAIT: [TAK/NIE]
UZASADNIENIE: [krótkie uzasadnienie w 1-2 zdaniach]
${content.header || content.title ? 'LEPSZY TYTUŁ: [jeśli clickbait - zaproponuj lepszy, rzetelny tytuł]' : ''}

Odpowiadaj po polsku i bądź zwięzły.`;
}
