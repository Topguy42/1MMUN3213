// Character mappings for text cloaking - different strength levels
// Using Cyrillic and Greek lookalikes that are semi-readable and same size
const CLOAK_MAPS = {
  light: {
    'a': 'а', 'e': 'е', 'o': 'о', 'p': 'р', 'y': 'у',
    'A': 'А', 'E': 'Е', 'O': 'О', 'P': 'Р', 'Y': 'У',
  },
  medium: {
    'a': 'а', 'c': 'с', 'e': 'е', 'h': 'һ', 'i': 'і', 'o': 'о', 'p': 'р', 'x': 'х', 'y': 'у',
    'A': 'А', 'C': 'С', 'E': 'Е', 'H': 'Һ', 'I': 'І', 'O': 'О', 'P': 'Р', 'X': 'Х', 'Y': 'У',
  },
  heavy: {
    'a': 'а', 'b': 'ḃ', 'c': 'с', 'd': 'ḏ', 'e': 'е', 'f': 'ғ', 'g': 'ḡ',
    'h': 'һ', 'i': 'і', 'j': 'ј', 'k': 'κ', 'l': 'ł', 'm': 'ṁ', 'n': 'ṅ',
    'o': 'о', 'p': 'р', 'q': 'ϑ', 'r': 'ṛ', 's': 'ѕ', 't': 'ţ', 'u': 'ս',
    'v': 'ν', 'w': 'ώ', 'x': 'х', 'y': 'у', 'z': 'ẑ',
    'A': 'А', 'B': 'Ḃ', 'C': 'С', 'D': 'Ḏ', 'E': 'Е', 'F': 'Ғ', 'G': 'Ḡ',
    'H': 'Һ', 'I': 'І', 'J': 'Ј', 'K': 'Κ', 'L': 'Ł', 'M': 'Ṁ', 'N': 'Ṅ',
    'O': 'О', 'P': 'Р', 'Q': 'Θ', 'R': 'Ṛ', 'S': 'Ѕ', 'T': 'Ţ', 'U': 'Ս',
    'V': 'Ν', 'W': 'Ώ', 'X': 'Х', 'Y': 'У', 'Z': 'Ẑ',
  }
};

// Store original text content on elements so we can toggle between cloaked and uncloaked
const ORIGINAL_TEXT_KEY = '__originalText__';

window.TextCloakUtils = {
  getStrength() {
    return localStorage.getItem('textCloakStrength') || 'heavy';
  },
  
  setStrength(strength) {
    localStorage.setItem('textCloakStrength', strength);
  },
  
  cloakText(text) {
    const strength = this.getStrength();
    const map = CLOAK_MAPS[strength] || CLOAK_MAPS.heavy;
    return text.split('').map(char => map[char] || char).join('');
  },
  
  uncloakText(text) {
    let reverseMap = {};
    Object.values(CLOAK_MAPS).forEach(map => {
      Object.entries(map).forEach(([k, v]) => {
        reverseMap[v] = k;
      });
    });
    return text.split('').map(char => reverseMap[char] || char).join('');
  },
  
  isEnabled() {
    const stored = localStorage.getItem('textCloakingEnabled');
    return stored === null ? false : stored === 'true';
  },
  
  setEnabled(enabled) {
    localStorage.setItem('textCloakingEnabled', String(enabled));
  },
  
  processElement(node) {
    if (!node) return;

    // Walk through all text nodes
    const walk = document.createTreeWalker(
      node,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const textNodes = [];
    let currentNode;
    while (currentNode = walk.nextNode()) {
      if (currentNode.nodeValue && currentNode.nodeValue.trim()) {
        textNodes.push(currentNode);
      }
    }

    const isEnabled = this.isEnabled();
    console.log(`TextCloak: processElement found ${textNodes.length} text nodes, enabled=${isEnabled}`);

    textNodes.forEach((textNode, idx) => {
      // Store original if not stored
      if (!textNode[ORIGINAL_TEXT_KEY]) {
        textNode[ORIGINAL_TEXT_KEY] = textNode.nodeValue;
      }

      // Apply or remove cloaking based on current state
      const original = textNode[ORIGINAL_TEXT_KEY];
      if (isEnabled) {
        const cloaked = this.cloakText(original);
        textNode.nodeValue = cloaked;
        if (idx === 0) console.log(`TextCloak: Sample - "${original}" -> "${cloaked}"`);
      } else {
        textNode.nodeValue = original;
      }
    });
  },
  
  applyToElement(element) {
    this.processElement(element);
  },
  
  removeFromElement(element) {
    this.processElement(element);
  }
};

// Wait for React to render, then apply cloaking
function initCloaking() {
  // Apply to initial content
  if (window.TextCloakUtils.isEnabled()) {
    window.TextCloakUtils.applyToElement(document.body);
  }
  
  // Watch for new content
  const observer = new MutationObserver((mutations) => {
    if (!window.TextCloakUtils.isEnabled()) return;
    
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
          window.TextCloakUtils.processElement(node.parentElement || node);
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('Text cloaking initialized. Enabled:', window.TextCloakUtils.isEnabled());
}

// Wait for React to fully render
setTimeout(() => {
  const enabled = localStorage.getItem('textCloakingEnabled');
  console.log('TextCloak: Initializing with enabled =', enabled);
  console.log('TextCloak: Strength =', localStorage.getItem('textCloakStrength') || 'heavy');
  initCloaking();
}, 800);
