// Character mappings for text cloaking using lookalike Unicode characters
const CLOAK_MAP = {
  'a': 'а', 'b': 'b', 'c': 'с', 'd': 'd', 'e': 'е', 'f': 'f', 'g': 'g',
  'h': 'һ', 'i': 'і', 'j': 'ј', 'k': 'k', 'l': 'l', 'm': 'm', 'n': 'n',
  'o': 'о', 'p': 'р', 'q': 'q', 'r': 'r', 's': 's', 't': 't', 'u': 'u',
  'v': 'v', 'w': 'w', 'x': 'x', 'y': 'у', 'z': 'z',
  'A': 'А', 'B': 'В', 'C': 'С', 'D': 'D', 'E': 'Е', 'F': 'F', 'G': 'G',
  'H': 'Һ', 'I': 'І', 'J': 'J', 'K': 'K', 'L': 'L', 'M': 'M', 'N': 'N',
  'O': 'О', 'P': 'Р', 'Q': 'Q', 'R': 'R', 'S': 'S', 'T': 'T', 'U': 'U',
  'V': 'V', 'W': 'W', 'X': 'X', 'Y': 'У', 'Z': 'Z',
  '0': '0', '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6',
  '7': '7', '8': '8', '9': '9'
};

function cloakText(text) {
  return text.split('').map(char => CLOAK_MAP[char] || char).join('');
}

function uncloakText(text) {
  const reverseMap = Object.fromEntries(Object.entries(CLOAK_MAP).map(([k, v]) => [v, k]));
  return text.split('').map(char => reverseMap[char] || char).join('');
}

function isTextCloakingEnabled() {
  const stored = localStorage.getItem('textCloakingEnabled');
  return stored === null ? false : stored === 'true';
}

function setTextCloakingEnabled(enabled) {
  localStorage.setItem('textCloakingEnabled', String(enabled));
}

function applyTextCloaking(element) {
  if (!isTextCloakingEnabled()) return;
  
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  const nodesToCloak = [];
  let node;
  while (node = walker.nextNode()) {
    nodesToCloak.push(node);
  }

  nodesToCloak.forEach(textNode => {
    textNode.textContent = cloakText(textNode.textContent);
  });
}

function removeTextCloaking(element) {
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  const nodesToUncloak = [];
  let node;
  while (node = walker.nextNode()) {
    nodesToUncloak.push(node);
  }

  nodesToUncloak.forEach(textNode => {
    textNode.textContent = uncloakText(textNode.textContent);
  });
}

function initTextCloaking() {
  if (isTextCloakingEnabled()) {
    applyTextCloaking(document.body);
  }

  const observer = new MutationObserver((mutations) => {
    if (!isTextCloakingEnabled()) return;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            applyTextCloaking(node);
          } else if (node.nodeType === Node.TEXT_NODE) {
            node.textContent = cloakText(node.textContent);
          }
        });
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  window.TextCloakAPI = {
    enable() {
      setTextCloakingEnabled(true);
      applyTextCloaking(document.body);
    },
    disable() {
      setTextCloakingEnabled(false);
      removeTextCloaking(document.body);
    },
    toggle() {
      if (isTextCloakingEnabled()) {
        this.disable();
      } else {
        this.enable();
      }
    },
    isEnabled: isTextCloakingEnabled
  };
}

// Auto-init on document ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTextCloaking);
} else {
  initTextCloaking();
}
