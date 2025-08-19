// content.js - wersja bez problemowego triggerCheckOnHoveredLink
let linkCheckingEnabled = false;
let currentHoveredLink = null;
let tooltip = null;
let processedLinks = new WeakSet();

function debugLog(...args) {
  console.log('[Clickbait Detector content.js]', ...args);
}

// Nasłuchiwanie na wiadomości z background script
browser.runtime.onMessage.addListener((message) => {
  debugLog('Odebrano wiadomość:', message);
  if (message.action === 'toggleLinkChecking') {
    linkCheckingEnabled = message.enabled;
    debugLog(`Tryb sprawdzania linków ustawiony na: ${linkCheckingEnabled}`);
    updateLinkListeners();
    
    if (!linkCheckingEnabled && tooltip) {
      hideTooltip();
    }
  }
  // USUNIĘTO: triggerCheckOnHoveredLink - używamy tylko Alt+C
});

// Inteligentna aktualizacja listenerów
function updateLinkListeners() {
  debugLog('updateLinkListeners wywołane. linkCheckingEnabled =', linkCheckingEnabled);
  
  const links = document.querySelectorAll('a[href]');
  debugLog(`Znaleziono ${links.length} linków na stronie`);
  
  links.forEach(link => {
    if (linkCheckingEnabled) {
      if (!processedLinks.has(link)) {
        link.addEventListener('mouseenter', onLinkHover);
        link.addEventListener('mouseleave', onLinkLeave);
        link.style.cursor = 'help';
        processedLinks.add(link);
      }
    } else {
      if (processedLinks.has(link)) {
        link.removeEventListener('mouseenter', onLinkHover);
        link.removeEventListener('mouseleave', onLinkLeave);
        link.style.cursor = '';
        link.style.outline = '';
        processedLinks.delete(link);
      }
    }
  });
}

function onLinkHover(event) {
  currentHoveredLink = event.target;
  debugLog('onLinkHover, link:', currentHoveredLink.href);
  event.target.style.outline = '2px solid #4CAF50';
  
  // Pokazuj tooltip hover TYLKO jeśli nie ma tooltipa z wynikami AI
  if (!tooltip || isCurrentTooltipHoverHint()) {
    showTooltip(event, 'Wciśnij Alt+C aby sprawdzić ten link', false, true);
  }
}

function onLinkLeave(event) {
  debugLog('onLinkLeave, link:', event.target.href);
  event.target.style.outline = '';
  currentHoveredLink = null;
  
  // Ukryj TYLKO tooltip hover hint
  if (tooltip && isCurrentTooltipHoverHint()) {
    hideTooltip();
  }
}

// Sprawdź czy aktualny tooltip to wskazówka hover
function isCurrentTooltipHoverHint() {
  return tooltip && tooltip.dataset.isHoverHint === 'true';
}

// Nasłuchiwanie skrótu Alt+C
document.addEventListener('keydown', (event) => {
  if (event.altKey && event.code === 'KeyC' && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
    debugLog('Wciśnięto skrót Alt+C');
    
    if (linkCheckingEnabled && currentHoveredLink) {
      debugLog('Uruchamiam sprawdzenie linku:', currentHoveredLink.href);
      checkCurrentLink();
    } else {
      debugLog('Nie można sprawdzić - tryb wyłączony lub brak linku');
      if (!linkCheckingEnabled) {
        showQuickMessage('Włącz najpierw tryb sprawdzania (Alt+Shift+C)');
      } else {
        showQuickMessage('Najedź najpierw na link');
      }
    }
  }
});

async function checkCurrentLink() {
  if (!currentHoveredLink) {
    debugLog('Brak linku do sprawdzenia');
    return;
  }
  
  const url = currentHoveredLink.href;
  debugLog('checkCurrentLink URL:', url);
  
  if (!url || url.startsWith('javascript:') || url.startsWith('mailto:') || url.startsWith('tel:')) {
    showTooltip({ target: currentHoveredLink }, '❌ Nie można sprawdzić tego typu linku', false, false);
    return;
  }
  
  showTooltip({ target: currentHoveredLink }, '🔄 Sprawdzanie...', true, false);
  
  try {
    const response = await browser.runtime.sendMessage({
      action: 'checkLink',
      url: url
    });
    
    debugLog('Odpowiedź z background:', response);
    
    if (response.error) {
      showTooltip({ target: currentHoveredLink }, `❌ Błąd: ${response.error}`, false, false);
    } else {
      displayResult(response);
    }
  } catch (error) {
    debugLog('Błąd przy wysyłaniu wiadomości do background:', error);
    showTooltip({ target: currentHoveredLink }, `❌ Błąd: ${error.message}`, false, false);
  }
}

function displayResult(result) {
  if (!currentHoveredLink) return;
  
  let message = result.response || 'Brak odpowiedzi z API';
  
  if (message.includes('CLICKBAIT: TAK')) {
    message = '🚫 ' + message.replace('CLICKBAIT: TAK', 'CLICKBAIT');
  } else if (message.includes('CLICKBAIT: NIE')) {
    message = '✅ ' + message.replace('CLICKBAIT: NIE', 'RZETELNY TYTUŁ');
  }
  
  showTooltip({ target: currentHoveredLink }, message, false, false);
}

// Tooltip z przyciskiem zamykającym
function showTooltip(event, text, isLoading = false, isHoverHintTooltip = false) {
  hideTooltip();
  
  tooltip = document.createElement('div');
  tooltip.className = 'clickbait-detector-tooltip';
  tooltip.dataset.isHoverHint = isHoverHintTooltip.toString();
  
  // Dodaj przycisk zamykający TYLKO dla wyników AI
  let closeBtn = null;
  if (!isHoverHintTooltip) {
    closeBtn = document.createElement('button');
    closeBtn.textContent = '✖';
    closeBtn.style.cssText = `
      position: absolute;
      top: 6px;
      right: 10px;
      background: transparent;
      color: white;
      border: none;
      font-size: 18px;
      cursor: pointer;
      padding: 0;
      width: 20px;
      height: 20px;
      z-index: 2147483648;
      border-radius: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = 'rgba(255,255,255,0.2)';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'transparent';
    });
    
    closeBtn.addEventListener('click', hideTooltip);
  }
  
  // Style tooltipa
  const paddingRight = closeBtn ? '35px' : '16px';
  tooltip.style.cssText = `
    position: fixed;
    background: ${isLoading ? '#2196F3' : (isHoverHintTooltip ? '#4CAF50' : '#333')};
    color: white;
    padding: ${closeBtn ? '19px' : '12px'} ${paddingRight} 13px 16px;
    border-radius: 8px;
    font-size: 14px;
    line-height: 1.4;
    max-width: 450px;
    min-width: 200px;
    z-index: 2147483647;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    white-space: pre-wrap;
    word-wrap: break-word;
    border: 2px solid ${isLoading ? '#1976D2' : (isHoverHintTooltip ? '#388E3C' : '#555')};
    pointer-events: auto;
    user-select: text;
    box-sizing: border-box;
  `;
  
  // Dodaj tekst
  const textSpan = document.createElement('span');
  textSpan.innerHTML = text;
  tooltip.appendChild(textSpan);
  
  // Dodaj przycisk jeśli istnieje
  if (closeBtn) {
    tooltip.appendChild(closeBtn);
  }
  
  document.body.appendChild(tooltip);
  
  // Pozycjonowanie
  const rect = event.target.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  
  let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
  let top = rect.bottom + 15;
  
  if (left < 10) left = 10;
  if (left + tooltipRect.width > window.innerWidth - 10) {
    left = window.innerWidth - tooltipRect.width - 10;
  }
  if (top + tooltipRect.height > window.innerHeight - 10) {
    top = rect.top - tooltipRect.height - 15;
  }
  
  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';
  
  // Animacja
  tooltip.style.opacity = '0';
  tooltip.style.transform = 'translateY(-10px)';
  tooltip.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
  
  setTimeout(() => {
    if (tooltip) {
      tooltip.style.opacity = '1';
      tooltip.style.transform = 'translateY(0)';
    }
  }, 10);
}

function hideTooltip() {
  if (tooltip) {
    tooltip.style.opacity = '0';
    tooltip.style.transform = 'translateY(-10px)';
    setTimeout(() => {
      if (tooltip && tooltip.parentNode) {
        tooltip.remove();
      }
      tooltip = null;
    }, 200);
  }
}

function showQuickMessage(text) {
  const message = document.createElement('div');
  message.textContent = text;
  message.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #FF9800;
    color: white;
    padding: 12px 18px;
    border-radius: 6px;
    font-size: 14px;
    z-index: 2147483647;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    opacity: 0;
    transform: translateX(100px);
    transition: opacity 0.3s ease, transform 0.3s ease;
  `;
  
  document.body.appendChild(message);
  
  setTimeout(() => {
    message.style.opacity = '1';
    message.style.transform = 'translateX(0)';
  }, 10);
  
  setTimeout(() => {
    message.style.opacity = '0';
    message.style.transform = 'translateX(100px)';
    setTimeout(() => {
      if (message.parentNode) {
        message.remove();
      }
    }, 300);
  }, 3000);
}

// Cleanup
window.addEventListener('beforeunload', () => {
  hideTooltip();
});

// Obsługa dynamicznych linków
const observer = new MutationObserver((mutations) => {
  if (!linkCheckingEnabled) return;
  
  let hasNewLinks = false;
  mutations.forEach(mutation => {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if ((node.tagName === 'A' && node.href) || 
              (node.querySelector && node.querySelector('a[href]'))) {
            hasNewLinks = true;
          }
        }
      });
    }
  });
  
  if (hasNewLinks) {
    debugLog('Wykryto nowe linki, aktualizuję listenery');
    clearTimeout(observer.timeout);
    observer.timeout = setTimeout(updateLinkListeners, 500);
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: false
});

// Inicjalizacja
setTimeout(updateLinkListeners, 100);

debugLog('Content script załadowany');
