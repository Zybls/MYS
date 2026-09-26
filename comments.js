/* ============================================
   D1自建评论系统 - 前端组件
   用法：在页面中加 <div id="comments-section"></div>
   然后引入本JS即可
   ============================================ */
(function() {
  'use strict';

  // ===== 配置 =====
  const API_BASE = 'https://api.ykmys.com';
  const TURNSTILE_SITE_KEY = 'YOUR_TURNSTILE_SITE_KEY'; // 替换为你的Site Key
  const PAGE_ID = window.location.pathname.split('/').pop().replace('.html', '') || 'index';

  // ===== 样式 =====
  const style = document.createElement('style');
  style.textContent = `
    .comments-wrap { max-width: 800px; margin: 30px auto; padding: 0 15px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .comments-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #333; display: flex; align-items: center; gap: 8px; }
    .comments-title::before { content: ''; width: 4px; height: 18px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 2px; }
    .comment-form { background: #f8f9fa; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
    .comment-form input, .comment-form textarea {
      width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #ddd;
      border-radius: 8px; font-size: 14px; margin-bottom: 10px; outline: none; transition: border-color .2s;
    }
    .comment-form input:focus, .comment-form textarea:focus { border-color: #667eea; }
    .comment-form textarea { min-height: 80px; resize: vertical; }
    .comment-form-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .comment-submit {
      background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border: none;
      padding: 10px 24px; border-radius: 8px; font-size: 14px; cursor: pointer; transition: opacity .2s;
    }
    .comment-submit:hover { opacity: .9; }
    .comment-submit:disabled { opacity: .5; cursor: not-allowed; }
    .comment-list { list-style: none; padding: 0; margin: 0; }
    .comment-item {
      background: #fff; border: 1px solid #eee; border-radius: 10px; padding: 14px 16px;
      margin-bottom: 12px; transition: box-shadow .2s;
    }
    .comment-item:hover { box-shadow: 0 2px 12px rgba(0,0,0,.06); }
    .comment-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .comment-nickname { font-weight: 600; font-size: 14px; color: #333; }
    .comment-time { font-size: 12px; color: #999; }
    .comment-content { font-size: 14px; color: #555; line-height: 1.6; word-break: break-word; }
    .comment-footer { display: flex; justify-content: flex-end; margin-top: 8px; }
    .comment-like {
      background: none; border: none; color: #999; font-size: 13px; cursor: pointer;
      display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 6px; transition: all .2s;
    }
    .comment-like:hover { color: #e74c3c; background: #fef0f0; }
    .comment-like.liked { color: #e74c3c; }
    .comments-empty { text-align: center; color: #999; padding: 30px 0; font-size: 14px; }
    .comments-loading { text-align: center; color: #999; padding: 20px; }
    .turnstile-container { margin-bottom: 10px; }
    @media (max-width: 600px) {
      .comments-wrap { padding: 0 10px; }
      .comment-form { padding: 12px; }
    }
  `;
  document.head.appendChild(style);

  // ===== 工具函数 =====
  function formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff/60) + '分钟前';
    if (diff < 86400) return Math.floor(diff/3600) + '小时前';
    if (diff < 604800) return Math.floor(diff/86400) + '天前';
    return d.toLocaleDateString('zh-CN');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ===== 渲染评论区 =====
  function init() {
    const container = document.getElementById('comments-section');
    if (!container) return;

    container.innerHTML = `
      <div class="comments-wrap">
        <div class="comments-title">评论区 <span id="comment-count" style="font-size:13px;color:#999;font-weight:normal;"></span></div>
        <div class="comment-form">
          <input type="text" id="comment-nickname" placeholder="昵称（不填默认匿名）" maxlength="20">
          <textarea id="comment-content" placeholder="说点什么吧..." maxlength="500"></textarea>
          <div class="turnstile-container" id="turnstile-widget"></div>
          <div class="comment-form-row">
            <button class="comment-submit" id="comment-submit">发表评论</button>
            <span id="comment-msg" style="font-size:13px;color:#999;"></span>
          </div>
        </div>
        <div id="comment-list-container">
          <div class="comments-loading">加载评论中...</div>
        </div>
      </div>
    `;

    // 加载Turnstile（如果配置了key）
    if (TURNSTILE_SITE_KEY && TURNSTILE_SITE_KEY !== 'YOUR_TURNSTILE_SITE_KEY') {
      const tsScript = document.createElement('script');
      tsScript.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      tsScript.async = true;
      tsScript.onload = function() {
        if (window.turnstile) {
          window.turnstile.render('#turnstile-widget', {
            sitekey: TURNSTILE_SITE_KEY,
            theme: 'light'
          });
        }
      };
      document.head.appendChild(tsScript);
    }

    // 加载评论
    loadComments();

    // 提交评论
    document.getElementById('comment-submit').addEventListener('click', submitComment);
  }

  // ===== 加载评论 =====
  async function loadComments() {
    try {
      const resp = await fetch(API_BASE + '/api/comments?page=' + encodeURIComponent(PAGE_ID));
      const data = await resp.json();
      const listContainer = document.getElementById('comment-list-container');
      const countEl = document.getElementById('comment-count');

      if (countEl) countEl.textContent = data.total ? '(' + data.total + ')' : '';

      if (!data.data || data.data.length === 0) {
        listContainer.innerHTML = '<div class="comments-empty">还没有评论，来抢沙发吧~</div>';
        return;
      }

      const likedIds = JSON.parse(localStorage.getItem('liked_comments') || '[]');

      listContainer.innerHTML = '<ul class="comment-list">' + data.data.map(function(c) {
        const liked = likedIds.indexOf(c.id) > -1;
        return '<li class="comment-item" data-id="' + c.id + '">' +
          '<div class="comment-header">' +
            '<span class="comment-nickname">' + escapeHtml(c.nickname) + '</span>' +
            '<span class="comment-time">' + formatTime(c.created_at) + '</span>' +
          '</div>' +
          '<div class="comment-content">' + escapeHtml(c.content) + '</div>' +
          '<div class="comment-footer">' +
            '<button class="comment-like ' + (liked ? 'liked' : '') + '" data-id="' + c.id + '">' +
              '❤️ <span>' + (c.likes || 0) + '</span>' +
            '</button>' +
          '</div>' +
        '</li>';
      }).join('') + '</ul>';

      // 绑定点赞
      listContainer.querySelectorAll('.comment-like').forEach(function(btn) {
        btn.addEventListener('click', function() { likeComment(this); });
      });
    } catch (e) {
      document.getElementById('comment-list-container').innerHTML =
        '<div class="comments-empty">评论加载失败，请稍后重试</div>';
    }
  }

  // ===== 提交评论 =====
  async function submitComment() {
    const contentEl = document.getElementById('comment-content');
    const nicknameEl = document.getElementById('comment-nickname');
    const msgEl = document.getElementById('comment-msg');
    const btn = document.getElementById('comment-submit');
    const content = contentEl.value.trim();

    if (!content) {
      msgEl.textContent = '请输入评论内容';
      msgEl.style.color = '#e74c3c';
      return;
    }

    btn.disabled = true;
    btn.textContent = '提交中...';
    msgEl.textContent = '';

    // 获取Turnstile token
    let turnstileToken = '';
    if (window.turnstile) {
      try {
        turnstileToken = window.turnstile.getResponse();
      } catch (e) {}
    }

    try {
      const resp = await fetch(API_BASE + '/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: PAGE_ID,
          nickname: nicknameEl.value.trim(),
          content: content,
          turnstileToken: turnstileToken
        })
      });
      const data = await resp.json();

      if (data.ok) {
        msgEl.textContent = '评论成功！';
        msgEl.style.color = '#27ae60';
        contentEl.value = '';
        // 重置Turnstile
        if (window.turnstile) {
          try { window.turnstile.reset(); } catch (e) {}
        }
        loadComments();
      } else {
        msgEl.textContent = data.error || '评论失败，请重试';
        msgEl.style.color = '#e74c3c';
      }
    } catch (e) {
      msgEl.textContent = '网络错误，请稍后重试';
      msgEl.style.color = '#e74c3c';
    }

    btn.disabled = false;
    btn.textContent = '发表评论';
  }

  // ===== 点赞 =====
  async function likeComment(btn) {
    const id = btn.getAttribute('data-id');
    const likedIds = JSON.parse(localStorage.getItem('liked_comments') || '[]');

    if (likedIds.indexOf(parseInt(id)) > -1) {
      return; // 已经点过赞了
    }

    try {
      await fetch(API_BASE + '/api/comments/' + id + '/like', { method: 'POST' });
      likedIds.push(parseInt(id));
      localStorage.setItem('liked_comments', JSON.stringify(likedIds));
      btn.classList.add('liked');
      const countEl = btn.querySelector('span');
      countEl.textContent = parseInt(countEl.textContent) + 1;
    } catch (e) {}
  }

  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
