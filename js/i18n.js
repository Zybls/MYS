/**
 * 多语言支持 i18n.js
 * 用法：
 * 1. 页面元素加 data-i18n="key" 属性
 * 2. 游戏术语自动替换（技能名、装备名等）
 * 3. 调用 setLang('en') 切换语言
 */
(function() {
  const SUPPORTED = ['zh', 'en'];
  const DEFAULT = 'zh';
  let currentLang = localStorage.getItem('site_lang') || DEFAULT;
  let langData = null;
  let termMap = null;

  // 加载语言包
  async function loadLang(lang) {
    try {
      const res = await fetch('lang/' + lang + '.json');
      langData = await res.json();
      termMap = langData.terms || {};
      return true;
    } catch(e) {
      console.error('加载语言包失败:', e);
      return false;
    }
  }

  // 翻译单个文本
  function t(key) {
    if (!langData) return key;
    return (langData.ui && langData.ui[key]) || key;
  }

  // 翻译游戏术语
  function translateTerms(text) {
    if (!termMap || currentLang === 'zh') return text;
    let result = text;
    // 按长度降序排列，避免短词先替换
    const terms = Object.keys(termMap).sort((a, b) => b.length - a.length);
    for (const term of terms) {
      if (result.includes(term)) {
        result = result.split(term).join(termMap[term]);
      }
    }
    return result;
  }

  // 应用翻译到页面
  function applyTranslations() {
    // 替换 data-i18n 元素
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const translated = t(key);
      if (translated !== key) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.placeholder = translated;
        } else {
          el.textContent = translated;
        }
      }
    });

    // 替换游戏术语（技能名、装备名、刻印名等）
    if (currentLang !== 'zh') {
      const selectors = '.skill-name, .skill-branch, .equip-name, .equip-slot, .engrave-name, .engrave-type, .follower-name, .follower-role, .book-name, .badge, .equip-slot';
      document.querySelectorAll(selectors).forEach(el => {
        const original = el.getAttribute('data-original') || el.textContent;
        if (!el.getAttribute('data-original')) {
          el.setAttribute('data-original', original);
        }
        el.textContent = translateTerms(original);
      });

      // 替换装备词条
      document.querySelectorAll('.stat').forEach(el => {
        const original = el.getAttribute('data-original') || el.textContent;
        if (!el.getAttribute('data-original')) {
          el.setAttribute('data-original', original);
        }
        el.textContent = translateTerms(original);
      });
    } else {
      // 切回中文时恢复原文
      document.querySelectorAll('[data-original]').forEach(el => {
        el.textContent = el.getAttribute('data-original');
      });
    }

    // 更新页面标题
    const titleEl = document.querySelector('h1');
    if (titleEl) {
      const original = titleEl.getAttribute('data-original') || titleEl.textContent;
      if (!titleEl.getAttribute('data-original')) {
        titleEl.setAttribute('data-original', original);
      }
      titleEl.textContent = currentLang === 'zh' ? original : translateTerms(original);
    }

    document.documentElement.lang = currentLang;
  }

  // 切换语言
  async function setLang(lang) {
    if (!SUPPORTED.includes(lang)) lang = DEFAULT;
    currentLang = lang;
    localStorage.setItem('site_lang', lang);
    await loadLang(lang);
    applyTranslations();
    // 更新按钮状态
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
  }

  // 初始化
  async function init() {
    await loadLang(currentLang);
    applyTranslations();

    // 绑定语言切换按钮
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => setLang(btn.dataset.lang));
    });
  }

  // 暴露API
  window.i18n = { setLang, t, getLang: () => currentLang };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
