/* ===== 公共音乐播放器（跨页面共享） ===== */
(function() {
  'use strict';

  // 播放列表
  var PLAYLIST = [
    { name: '公会主题曲', src: 'home-bgm.mp3' },
    { name: '战歌', src: 'history-bgm.mp3' }
  ];

  // 从localStorage恢复状态
  var savedIndex = parseInt(localStorage.getItem('music_index') || '0', 10);
  var savedPlaying = localStorage.getItem('music_playing') === '1';
  var currentIndex = isNaN(savedIndex) ? 0 : Math.min(savedIndex, PLAYLIST.length - 1);

  // 注入CSS
  var css = `
  /* ===== 移动端/默认：fixed悬浮播放器 ===== */
  .music-player{position:fixed;bottom:12px;right:12px;z-index:999;display:flex;align-items:center;gap:8px;background:rgba(26,26,46,.92);border:1px solid rgba(245,158,11,.3);border-radius:24px;padding:6px 12px 6px 6px;backdrop-filter:blur(8px);transition:all .2s}
  .music-player:hover{border-color:rgba(245,158,11,.6)}
  .music-btn{width:32px;height:32px;border-radius:50%;background:rgba(245,158,11,.15);border:1px solid rgba(245,158,11,.3);color:#f59e0b;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0}
  .music-btn:hover{transform:scale(1.1);box-shadow:0 0 15px rgba(245,158,11,.5)}
  .music-btn svg{display:block}
  .music-btn.playing{animation:pulse 2s infinite}
  .music-nav-btn{width:24px;height:24px;font-size:12px;background:transparent;border:none;color:rgba(245,158,11,.6);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:color .2s}
  .music-nav-btn:hover{color:#f59e0b}
  .music-visualizer{display:flex;align-items:flex-end;gap:2px;height:16px}
  .music-bar{width:3px;background:#f59e0b;border-radius:1px;transition:height .1s}
  .music-bar:nth-child(1){height:40%}.music-bar:nth-child(2){height:70%}
  .music-bar:nth-child(3){height:50%}.music-bar:nth-child(4){height:80%}
  .playing .music-bar{animation:visualize .8s infinite ease-in-out}
  .playing .music-bar:nth-child(1){animation-delay:0s}
  .playing .music-bar:nth-child(2){animation-delay:.1s}
  .playing .music-bar:nth-child(3){animation-delay:.2s}
  .playing .music-bar:nth-child(4){animation-delay:.3s}
  @keyframes visualize{0%,100%{height:30%}50%{height:100%}}
  @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,.4)}50%{box-shadow:0 0 0 8px rgba(245,158,11,0)}}
  .music-info{display:flex;flex-direction:column;gap:2px;min-width:0}
  .music-title{font-size:11px;color:#f59e0b;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:80px}
  .music-status{font-size:9px;color:#8888a0}
  @media (max-width:768px){.music-info{display:none}.music-player{bottom:85px!important;right:12px!important}}

  /* ===== PC端：导航栏紧凑播放器 ===== */
  .nav-music{display:none;align-items:center;gap:6px;margin-left:8px}
  .nav-music-btn{width:30px;height:30px;border-radius:50%;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.25);color:#f59e0b;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0;font-size:14px}
  .nav-music-btn:hover{background:rgba(245,158,11,.25);transform:scale(1.08)}
  .nav-music-btn.playing{animation:pulse 2s infinite}
  .nav-music-btn svg{display:block;width:13px;height:13px}
  .nav-music-btn.nav-music-nav{width:26px;height:26px;background:rgba(245,158,11,.08)}
  .nav-music-btn.nav-music-nav svg{width:11px;height:11px}
  .nav-music-viz{display:flex;align-items:flex-end;gap:2px;height:14px}
  .nav-music-viz .music-bar{width:2px}
  .nav-music-title{font-size:11px;color:rgba(245,158,11,.8);white-space:nowrap;max-width:70px;overflow:hidden;text-overflow:ellipsis}
  @media (min-width:769px){
    body:not(.no-nav-music) .nav-music{display:flex}
    body:not(.no-nav-music) .music-player{display:none!important}
  }
  `;
  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // 注入audio
  var audioHTML = '<audio id="bgmPlayer" preload="none"></audio>';
  document.body.insertAdjacentHTML('beforeend', audioHTML);

  // 注入移动端fixed播放器
  var playerHTML = `
  <div class="music-player" id="musicPlayer">
    <button class="music-nav-btn" id="musicPrev" title="上一首">⏮</button>
    <button class="music-btn" id="musicBtn" title="播放/暂停">
      <svg class="play-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      <svg class="pause-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="display:none"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
    </button>
    <button class="music-nav-btn" id="musicNext" title="下一首">⏭</button>
    <div class="music-visualizer" id="musicViz">
      <div class="music-bar"></div><div class="music-bar"></div>
      <div class="music-bar"></div><div class="music-bar"></div>
    </div>
    <div class="music-info">
      <div class="music-title" id="musicTitle">` + PLAYLIST[currentIndex].name + `</div>
      <div class="music-status" id="musicStatus">点击播放</div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', playerHTML);

  // PC端：尝试注入导航栏紧凑播放器
  var navRight = document.querySelector('.guild-nav-right');
  var navMusicBtn = null;
  if (navRight) {
    var navMusicHTML = `
    <div class="nav-music" id="navMusic">
      <span class="nav-music-title" id="navMusicTitle">` + PLAYLIST[currentIndex].name + `</span>
      <div class="nav-music-viz" id="navMusicViz">
        <div class="music-bar"></div><div class="music-bar"></div>
        <div class="music-bar"></div><div class="music-bar"></div>
      </div>
      <button class="nav-music-btn nav-music-nav" id="navMusicPrev" title="上一首">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
      </button>
      <button class="nav-music-btn" id="navMusicBtn" title="播放/暂停">
        <svg class="play-icon" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        <svg class="pause-icon" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style="display:none"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
      </button>
      <button class="nav-music-btn nav-music-nav" id="navMusicNext" title="下一首">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
      </button>
    </div>`;
    navRight.insertAdjacentHTML('beforeend', navMusicHTML);
    navMusicBtn = document.getElementById('navMusicBtn');
  } else {
    // 无导航栏的页面（旧页/404/后台），PC端保留fixed播放器
    document.body.classList.add('no-nav-music');
  }

  // 初始化
  var bgm = document.getElementById('bgmPlayer');
  var musicBtn = document.getElementById('musicBtn');
  var musicPlayer = document.getElementById('musicPlayer');
  var musicStatus = document.getElementById('musicStatus');
  var musicTitle = document.getElementById('musicTitle');
  var navMusicTitle = document.getElementById('navMusicTitle');
  var navMusic = document.getElementById('navMusic');
  var isPlaying = false;

  function updateUI(playing) {
    var playIcons = document.querySelectorAll('.play-icon');
    var pauseIcons = document.querySelectorAll('.pause-icon');
    playIcons.forEach(function(el){ el.style.display = playing ? 'none' : 'block'; });
    pauseIcons.forEach(function(el){ el.style.display = playing ? 'block' : 'none'; });
    if (playing) {
      musicPlayer.classList.add('playing');
      if (navMusic) navMusic.querySelector('.nav-music-btn').classList.add('playing');
      if (musicStatus) musicStatus.textContent = '播放中';
    } else {
      musicPlayer.classList.remove('playing');
      if (navMusic) navMusic.querySelector('.nav-music-btn').classList.remove('playing');
      if (musicStatus) musicStatus.textContent = '已暂停';
    }
  }

  function loadTrack(index) {
    currentIndex = index;
    bgm.src = PLAYLIST[index].src;
    if (musicTitle) musicTitle.textContent = PLAYLIST[index].name;
    if (navMusicTitle) navMusicTitle.textContent = PLAYLIST[index].name;
    localStorage.setItem('music_index', index);
  }

  function play() {
    bgm.play().then(function() {
      isPlaying = true;
      updateUI(true);
      localStorage.setItem('music_playing', '1');
    }).catch(function() {
      if (musicStatus) musicStatus.textContent = '加载失败';
    });
  }

  function pause() {
    bgm.pause();
    isPlaying = false;
    updateUI(false);
    localStorage.setItem('music_playing', '0');
  }

  function toggle() {
    if (isPlaying) pause(); else play();
  }

  function nextTrack() {
    var next = (currentIndex + 1) % PLAYLIST.length;
    loadTrack(next);
    if (isPlaying) play();
  }

  function prevTrack() {
    var prev = (currentIndex - 1 + PLAYLIST.length) % PLAYLIST.length;
    loadTrack(prev);
    if (isPlaying) play();
  }

  // 事件绑定（移动端播放器）
  musicBtn.addEventListener('click', toggle);
  document.getElementById('musicPrev').addEventListener('click', prevTrack);
  document.getElementById('musicNext').addEventListener('click', nextTrack);

  // 事件绑定（PC端导航栏播放器）
  if (navMusicBtn) {
    navMusicBtn.addEventListener('click', toggle);
  }
  var navMusicPrev = document.getElementById('navMusicPrev');
  var navMusicNext = document.getElementById('navMusicNext');
  if (navMusicPrev) navMusicPrev.addEventListener('click', prevTrack);
  if (navMusicNext) navMusicNext.addEventListener('click', nextTrack);

  bgm.addEventListener('ended', nextTrack); // 自动下一首

  // 加载当前曲目
  loadTrack(currentIndex);

  // 如果之前在播放，尝试恢复（浏览器可能阻止自动播放，需要用户交互）
  if (savedPlaying) {
    if (musicStatus) musicStatus.textContent = '点击继续播放';
    bgm.play().then(function() {
      isPlaying = true;
      updateUI(true);
    }).catch(function() {
      // 自动播放被阻止，等待用户点击
    });
  }

  // 暴露全局函数（兼容旧页面）
  window.toggleMusic = toggle;
})();
