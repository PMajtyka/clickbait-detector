// Background script - zmodyfikowany
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
  // NOWE: Obsługa sprawdzania z ekstraktowaną treścią
  else if (message.action === 'checkLinkWithContent') {
    checkClickbaitWithContent(message.content)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
});

// NOWA FUNKCJA: Sprawdź clickbait z już ekstraktowaną treścią
async function checkClickbaitWithContent(content) {
  try {
    // Pobierz ustawienia API
    const settings = await browser.storage.local.get(['apiKey', 'apiEndpoint', 'model']);
    
    if (!settings.apiKey) {
      throw new Error('Brak skonfigurowanego API key. Przejdź do ustawień rozszerzenia.');
    }
    
    if (!content.title) {
      throw new Error('Nie znaleziono tytułu strony');
    }
    
    // Wywołaj API LLM bezpośrednio z przekazaną treścią
    const llmResponse = await callLLM(settings, content);
    return llmResponse;
    
  } catch (error) {
    console.error('Error checking clickbait with content:', error);
    throw error;
  }
}

// ULEPSZONA FUNKCJA: Lepsza ekstrakcja z użyciem fetch + readability
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
    const content = await extractContentFromHTML(html, url);
    
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

// ULEPSZONA FUNKCJA: Lepsza ekstrakcja treści z użyciem Readability
async function extractContentFromHTML(html, url) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Ustaw base URL dla względnych linków
  const base = doc.createElement('base');
  base.href = url;
  doc.head.appendChild(base);
  
  // Ekstraktuj tytuł z kilku źródeł
  const title = getTitle(doc);
  
  // Ekstraktuj główny nagłówek
  const header = getMainHeader(doc);
  
  // Użyj uproszczonej wersji algorytmu Readability
  const content = extractMainContent(doc);
  
  // Dodatkowe metadane
  const metadata = extractMetadata(doc);
  
  return { 
    title, 
    header, 
    content: content.substring(0, 15000), // Ogranicz do 15000 znaków
    ...metadata 
  };
}

function getTitle(doc) {
  // Próbuj różne źródła tytułu
  const sources = [
    () => doc.querySelector('meta[property="og:title"]')?.getAttribute('content'),
    () => doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content'),
    () => doc.querySelector('h1')?.textContent?.trim(),
    () => doc.querySelector('title')?.textContent?.trim()
  ];
  
  for (const source of sources) {
    const title = source();
    if (title && title.length > 0) {
      return title;
    }
  }
  
  return '';
}

function getMainHeader(doc) {
  const selectors = [
    'h1.entry-title',
    'h1.post-title', 
    'h1.article-title',
    '.entry-header h1',
    'article h1',
    'main h1',
    'h1'
  ];
  
  for (const selector of selectors) {
    const element = doc.querySelector(selector);
    if (element) {
      return element.textContent?.trim() || '';
    }
  }
  
  return '';
}

// Uproszczona implementacja algorytmu Readability
function extractMainContent(doc) {
  // Usuń niepotrzebne elementy
  const elementsToRemove = doc.querySelectorAll(`
    script, style, nav, header, footer, aside, 
    .advertisement, .ads, .social-share, .comments,
    .sidebar, .menu, .navigation, .breadcrumb,
    [class*="ad"], [id*="ad"], [class*="social"], 
    [class*="share"], [class*="comment"]
  `);
  
  elementsToRemove.forEach(el => el.remove());
  
  // Znajdź główną treść artykułu
  const contentSelectors = [
    'article .entry-content',
    'article .post-content', 
    'article .content',
    '.post-body',
    '.entry-content',
    '.post-content',
    'article',
    'main',
    '[role="main"]',
    '.content'
  ];
  
  let mainContent = null;
  
  for (const selector of contentSelectors) {
    const element = doc.querySelector(selector);
    if (element && element.textContent.trim().length > 200) {
      mainContent = element;
      break;
    }
  }
  
  if (mainContent) {
    return cleanTextContent(mainContent);
  }
  
  // Fallback - znajdź największy blok tekstu
  return findLargestTextBlock(doc);
}

function cleanTextContent(element) {
  // Usuń puste linii i nadmiarowe spacje
  return element.textContent
    ?.replace(/\s+/g, ' ')
    ?.replace(/\n\s*\n/g, '\n')
    ?.trim() || '';
}

function findLargestTextBlock(doc) {
  const paragraphs = Array.from(doc.querySelectorAll('p, div'))
    .map(el => el.textContent?.trim() || '')
    .filter(text => text.length > 100)
    .sort((a, b) => b.length - a.length);
  
  return paragraphs.slice(0, 10).join(' '); // Weź 10 największych bloków
}

function extractMetadata(doc) {
  return {
    description: doc.querySelector('meta[name="description"]')?.getAttribute('content') || '',
    keywords: doc.querySelector('meta[name="keywords"]')?.getAttribute('content') || '',
    author: doc.querySelector('meta[name="author"]')?.getAttribute('content') || 
            doc.querySelector('.author')?.textContent?.trim() || '',
    publishDate: doc.querySelector('meta[property="article:published_time"]')?.getAttribute('content') ||
                 doc.querySelector('time')?.getAttribute('datetime') || ''
  };
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
      max_tokens: 300, // Zwiększ dla lepszych odpowiedzi
      temperature: 0.2 // Zmniejsz dla większej konsystencji
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

// ULEPSZONA FUNKCJA: Lepszy prompt z metadanymi
function createPrompt(content) {
  const context = content.author ? `\nAUTOR: ${content.author}` : '';
  const description = content.description ? `\nOPIS: ${content.description}` : '';
  
  return `Sprawdź, czy poniższy tytuł artykułu jest clickbaitowy (wprowadza w błąd, przesadza, używa sensacyjnych określeń bez pokrycia w treści).

TYTUŁ: "${content.title}"
${content.header && content.header !== content.title ? `NAGŁÓWEK: "${content.header}"` : ''}${context}${description}

TREŚĆ ARTYKUŁU:
${content.content}

Odpowiedz DOKŁADNIE w tym formacie:
CLICKBAIT: [TAK/NIE]
UZASADNIENIE: [krótkie uzasadnienie w 1-2 zdaniach, dlaczego tytuł jest/nie jest clickbaitowy]
LEPSZY TYTUŁ: [jeśli clickbait - zaproponuj lepszy, rzetelny tytuł bez sensacji]

Odpowiadaj po polsku i bądź precyzyjny.`;
}
