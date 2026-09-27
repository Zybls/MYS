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
  @media (max-width:768px){.music-info{display:none}}
  @media (min-width:769px){.music-player{bottom:auto!important;top:80px!important;right:20px!important}}
  `;
  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // 注入HTML
  var playerHTML = `
  <audio id="bgmPlayer" preload="none"></audio>
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

  // 初始化
  var bgm = document.getElementById('bgmPlayer');
  var musicBtn = document.getElementById('musicBtn');
  var musicPlayer = document.getElementById('musicPlayer');
  var musicStatus = document.getElementById('musicStatus');
  var musicTitle = document.getElementById('musicTitle');
  var isPlaying = false;

  function loadTrack(index) {
    currentIndex = index;
    bgm.src = PLAYLIST[index].src;
    musicTitle.textContent = PLAYLIST[index].name;
    localStorage.setItem('music_index', index);
  }

  function play() {
    bgm.play().then(function() {
      isPlaying = true;
      musicBtn.querySelector('.play-icon').style.display = 'none';
      musicBtn.querySelector('.pause-icon').style.display = 'block';
      musicPlayer.classList.add('playing');
      musicStatus.textContent = '播放中';
      localStorage.setItem('music_playing', '1');
    }).catch(function() {
      musicStatus.textContent = '加载失败';
    });
  }

  function pause() {
    bgm.pause();
    isPlaying = false;
    musicBtn.querySelector('.play-icon').style.display = 'block';
    musicBtn.querySelector('.pause-icon').style.display = 'none';
    musicPlayer.classList.remove('playing');
    musicStatus.textContent = '已暂停';
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

  // 事件绑定
  musicBtn.addEventListener('click', toggle);
  document.getElementById('musicPrev').addEventListener('click', prevTrack);
  document.getElementById('musicNext').addEventListener('click', nextTrack);
  bgm.addEventListener('ended', nextTrack); // 自动下一首

  // 加载当前曲目
  loadTrack(currentIndex);

  // 如果之前在播放，尝试恢复（浏览器可能阻止自动播放，需要用户交互）
  if (savedPlaying) {
    musicStatus.textContent = '点击继续播放';
    // 尝试自动播放，如果被阻止则等待用户点击
    bgm.play().then(function() {
      isPlaying = true;
      musicBtn.querySelector('.play-icon').style.display = 'none';
      musicBtn.querySelector('.pause-icon').style.display = 'block';
      musicPlayer.classList.add('playing');
      musicStatus.textContent = '播放中';
    }).catch(function() {
      // 自动播放被阻止，等待用户点击
    });
  }

  // 暴露全局函数（兼容旧页面）
  window.toggleMusic = toggle;
})();
