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

window.TextCloakUtils = {
  cloakText(text) {
    return text.split('').map(char => CLOAK_MAP[char] || char).join('');
  },

  uncloakText(text) {
    const reverseMap = Object.fromEntries(Object.entries(CLOAK_MAP).map(([k, v]) => [v, k]));
    return text.split('').map(char => reverseMap[char] || char).join('');
  },

  isEnabled() {
    const stored = localStorage.getItem('textCloakingEnabled');
    return stored === null ? false : stored === 'true';
  },

  setEnabled(enabled) {
    localStorage.setItem('textCloakingEnabled', String(enabled));
  },

  applyToElement(element) {
    if (!this.isEnabled()) return;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
    const nodes = [];
    let node;
    while (node = walker.nextNode()) {
      nodes.push(node);
    }
    nodes.forEach(textNode => {
      textNode.textContent = this.cloakText(textNode.textContent);
    });
  },

  removeFromElement(element) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
    const nodes = [];
    let node;
    while (node = walker.nextNode()) {
      nodes.push(node);
    }
    nodes.forEach(textNode => {
      textNode.textContent = this.uncloakText(textNode.textContent);
    });
  }
};

// Setup observer AFTER React has rendered
setTimeout(() => {
  const observer = new MutationObserver((mutations) => {
    if (!window.TextCloakUtils.isEnabled()) return;

    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            window.TextCloakUtils.applyToElement(node);
          } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
            node.textContent = window.TextCloakUtils.cloakText(node.textContent);
          }
        });
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}, 500);
