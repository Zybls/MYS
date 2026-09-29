/**
 * 多语言支持 i18n.js
 * 通用文本节点遍历翻译，支持所有页面
 */
(function() {
  const SUPPORTED = ['zh', 'en'];
  const DEFAULT = 'zh';
  let currentLang = localStorage.getItem('site_lang') || DEFAULT;
  let langData = null;
  let termMap = null;
  let sortedTerms = null;

  async function loadLang(lang) {
    try {
      const res = await fetch('lang/' + lang + '.json');
      langData = await res.json();
      termMap = langData.terms || {};
      sortedTerms = Object.keys(termMap).sort((a, b) => b.length - a.length);
      return true;
    } catch(e) {
      console.error('加载语言包失败:', e);
      return false;
    }
  }

  function translateTerms(text) {
    if (!termMap || currentLang === 'zh') return text;
    let result = text;
    for (const term of sortedTerms) {
      if (result.includes(term)) {
        result = result.split(term).join(termMap[term]);
      }
    }
    return result;
  }

  // 递归遍历文本节点
  function walkTextNodes(node, callback) {
    if (node.nodeType === 3) {
      callback(node);
    } else if (node.nodeType === 1 && node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE' && node.tagName !== 'TEXTAREA' && !node.isContentEditable) {
      for (let i = 0; i < node.childNodes.length; i++) {
        walkTextNodes(node.childNodes[i], callback);
      }
    }
  }

  function applyTranslations() {
    if (currentLang === 'zh') {
      // 切回中文时刷新页面（最可靠）
      if (window.__i18nWasEnglish) {
        location.reload();
        return;
      }
      document.documentElement.lang = 'zh';
      return;
    }

    window.__i18nWasEnglish = true;

    // 遍历所有文本节点翻译
    walkTextNodes(document.body, function(node) {
      const original = node.nodeValue;
      if (!original || !original.trim()) return;
      if (/^[\d\s\W]+$/.test(original)) return; // 跳过纯数字符号
      const translated = translateTerms(original);
      if (translated !== original) {
        node.nodeValue = translated;
      }
    });

    // 替换placeholder
    document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(el => {
      const ph = el.placeholder;
      if (ph && ph.trim()) {
        el.placeholder = translateTerms(ph);
      }
    });

    // 替换title属性
    document.querySelectorAll('[title]').forEach(el => {
      const title = el.getAttribute('title');
      if (title && title.trim() && !el.getAttribute('data-title-translated')) {
        const translated = translateTerms(title);
        if (translated !== title) {
          el.setAttribute('title', translated);
          el.setAttribute('data-title-translated', '1');
        }
      }
    });

    document.documentElement.lang = currentLang;
  }

  async function setLang(lang) {
    if (!SUPPORTED.includes(lang)) lang = DEFAULT;
    if (lang === currentLang) return;
    currentLang = lang;
    localStorage.setItem('site_lang', lang);
    await loadLang(lang);
    applyTranslations();
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
  }

  async function init() {
    await loadLang(currentLang);
    applyTranslations();
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === currentLang);
      btn.addEventListener('click', () => setLang(btn.dataset.lang));
    });
  }

  window.i18n = { setLang, getLang: () => currentLang };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
