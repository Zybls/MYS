// 全站搜索组件
(function() {
  // 搜索弹窗HTML
  const searchModalHTML = `
  <div id="searchModal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:10000;justify-content:center;align-items:flex-start;padding-top:10vh;">
    <div style="background:var(--bg-card,#1a1a2e);border:1px solid var(--border,#333);border-radius:16px;width:90%;max-width:600px;max-height:70vh;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
      <div style="padding:16px;border-bottom:1px solid var(--border,#333);display:flex;align-items:center;gap:12px;">
        <span style="font-size:20px;">🔍</span>
        <input type="text" id="searchInput" placeholder="搜索配装、图鉴、兑换码..." style="flex:1;background:var(--bg,#16162a);border:1px solid var(--border,#333);border-radius:8px;padding:10px 14px;color:var(--text,#fff);font-size:15px;outline:none;">
        <button onclick="closeSearch()" style="background:none;border:none;color:var(--text-dim,#888);font-size:20px;cursor:pointer;padding:4px 8px;">✕</button>
      </div>
      <div id="searchResults" style="max-height:50vh;overflow-y:auto;padding:8px 16px 16px;">
        <div style="text-align:center;color:var(--text-dim,#888);padding:40px 0;">输入关键词开始搜索</div>
      </div>
      <div style="padding:10px 16px;border-top:1px solid var(--border,#333);font-size:12px;color:var(--text-dim,#888);display:flex;justify-content:space-between;">
        <span>共 <span id="searchTotal">35</span> 个页面可搜索</span>
        <span>ESC 关闭</span>
      </div>
    </div>
  </div>`;

  // 添加到页面
  document.body.insertAdjacentHTML('beforeend', searchModalHTML);

  // 搜索按钮样式
  const style = document.createElement('style');
  style.textContent = `
    .search-result-item {
      padding: 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;
      margin-bottom: 6px;
      border: 1px solid transparent;
    }
    .search-result-item:hover {
      background: var(--bg, #16162a);
      border-color: var(--border, #333);
    }
    .search-result-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text, #fff);
      margin-bottom: 4px;
    }
    .search-result-desc {
      font-size: 12px;
      color: var(--text-dim, #888);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .search-result-cat {
      display: inline-block;
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 10px;
      background: rgba(245,158,11,0.15);
      color: #f59e0b;
      margin-right: 8px;
    }
    .search-highlight {
      color: #f59e0b;
      font-weight: 700;
    }
  `;
  document.head.appendChild(style);

  let searchTimer = null;

  window.openSearch = function() {
    const modal = document.getElementById('searchModal');
    modal.style.display = 'flex';
    setTimeout(() => document.getElementById('searchInput').focus(), 100);
  };

  window.closeSearch = function() {
    document.getElementById('searchModal').style.display = 'none';
  };

  // 点击遮罩关闭
  document.getElementById('searchModal').addEventListener('click', function(e) {
    if (e.target === this) closeSearch();
  });

  // ESC关闭
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeSearch();
    // Ctrl+K 或 Ctrl+F 打开搜索
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'f')) {
      e.preventDefault();
      openSearch();
    }
  });

  // 搜索逻辑
  document.getElementById('searchInput').addEventListener('input', function(e) {
    const query = e.target.value.trim().toLowerCase();
    const resultsDiv = document.getElementById('searchResults');

    if (!query) {
      resultsDiv.innerHTML = '<div style="text-align:center;color:var(--text-dim,#888);padding:40px 0;">输入关键词开始搜索</div>';
      return;
    }

    clearTimeout(searchTimer);
    searchTimer = setTimeout(function() {
      const results = SEARCH_DATA.filter(function(page) {
        return (
          page.title.toLowerCase().includes(query) ||
          page.description.toLowerCase().includes(query) ||
          page.category.toLowerCase().includes(query) ||
          page.keywords.toLowerCase().includes(query)
        );
      });

      if (results.length === 0) {
        resultsDiv.innerHTML = '<div style="text-align:center;color:var(--text-dim,#888);padding:40px 0;">未找到相关结果</div>';
        return;
      }

      resultsDiv.innerHTML = results.map(function(page) {
        const highlight = function(text) {
          return text.replace(new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<span class="search-highlight">$1</span>');
        };
        return `
          <div class="search-result-item" onclick="window.location.href='${page.url}'">
            <div class="search-result-title">
              <span class="search-result-cat">${page.category}</span>
              ${highlight(page.title)}
            </div>
            <div class="search-result-desc">${highlight(page.description)}</div>
          </div>
        `;
      }).join('');
    }, 150);
  });

  // 在导航栏加搜索按钮
  function addSearchButton() {
    const navInner = document.querySelector('.nav-inner') || document.querySelector('.guild-nav-info');
    if (!navInner) return;
    
    // 检查是否已经有搜索按钮
    if (document.getElementById('navSearchBtn')) return;
    
    const btn = document.createElement('button');
    btn.id = 'navSearchBtn';
    btn.innerHTML = '🔍';
    btn.style.cssText = 'background:none;border:none;color:var(--text,#fff);font-size:18px;cursor:pointer;padding:6px 8px;border-radius:6px;transition:background 0.2s;';
    btn.onmouseover = function() { this.style.background = 'rgba(255,255,255,0.1)'; };
    btn.onmouseout = function() { this.style.background = 'none'; };
    btn.onclick = openSearch;
    btn.title = '搜索 (Ctrl+K)';
    
    // 插入到导航栏合适位置
    const navLinks = document.querySelector('.nav-links');
    if (navLinks && navLinks.parentNode) {
      navLinks.parentNode.insertBefore(btn, navLinks.nextSibling);
    } else {
      navInner.appendChild(btn);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addSearchButton);
  } else {
    addSearchButton();
  }
})();
