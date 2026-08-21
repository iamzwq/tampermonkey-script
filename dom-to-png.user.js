// ==UserScript==
// @name         DOM 元素导出为图片
// @namespace    https://github.com/dom-to-png
// @version      1.0.0
// @description  页面中显示一个按钮，点击后可用鼠标选择页面元素，选定后直接下载为 PNG 图片
// @author       you
// @match        https://github.com/*
// @match        https://*.github.com/*
// @match        https://x.com/*
// @match        https://*.x.com/*
// @match        https://md2card.com/*
// @match        https://*.md2card.com/*
// @match        https://www.zhihu.com/*
// @match        https://*.zhihu.com/*
// @require      https://cdn.jsdelivr.net/npm/modern-screenshot@4.7.0/dist/index.min.js
// @run-at       document-idle
// @grant        none
// @noframes
// ==/UserScript==

(function () {
  "use strict";

  const PREFIX = "__d2p_";
  const Z = 2147483647;

  // 标记脚本自身元素，选择时跳过
  const OWN = PREFIX + "own";

  let selecting = false;
  let hoverEl = null;
  let outputMode = "download";

  // ---- 图标 ----
  const ICON_MAIN =
    '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" d="M2 5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zm18 0H4v11.1l5.172-5.171a1 1 0 0 1 1.414 0l4.242 4.243l1.415-1.415a1 1 0 0 1 1.414 0L20 16.101zm-6 3.5a1.5 1.5 0 1 1 3 0a1.5 1.5 0 0 1-3 0" clip-rule="evenodd"/></svg>';
  const ICON_DOWNLOAD =
    '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" d="m12 16l-5-5l1.4-1.45l2.6 2.6V4h2v8.15l2.6-2.6L17 11zm-6 4q-.825 0-1.412-.587T4 18v-3h2v3h12v-3h2v3q0 .825-.587 1.413T18 20z"/></svg>';
  const ICON_COPY =
    '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><g fill="currentColor"><path d="M20.926 7.074A3.67 3.67 0 0 1 22 9.667v8.666A3.667 3.667 0 0 1 18.333 22H9.667A3.667 3.667 0 0 1 6 18.333V9.667q0-.053.005-.102A3.66 3.66 0 0 1 9.667 6h8.666c.973 0 1.905.386 2.593 1.074"/><path d="M17.374 3.514a1 1 0 1 1-1.748.972C15.405 4.088 15.284 4 15 4H5c-.548 0-1 .452-1 1v9.998c0 .36.194.692.507.87a1 1 0 1 1-.99 1.738A3 3 0 0 1 2 15V5c0-1.652 1.348-3 3-3h10c1.094 0 1.828.533 2.374 1.514"/></g></svg>';

  // ---- 样式注入 ----
  const STYLE_ID = PREFIX + "style";
  const styleText = `
    .${PREFIX}wrap {
      position: fixed;
      right: 20px;
      bottom: 20px;
      z-index: ${Z};
      display: flex;
      flex-direction: column-reverse;
      align-items: center;
      gap: 10px;
    }
    .${PREFIX}iconbtn {
      width: 44px;
      height: 44px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      color: #fff;
      background: #13c2c2;
      border: none;
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      cursor: pointer;
      user-select: none;
      position: relative;
      transition: background 0.15s ease;
    }
    .${PREFIX}iconbtn:hover { background: #36cfc9; }
    .${PREFIX}iconbtn.${PREFIX}active { background: #ff4d4f; }
    .${PREFIX}iconbtn svg { display: block; }
    .${PREFIX}iconbtn[data-tip]::after {
      content: attr(data-tip);
      position: absolute;
      right: 100%;
      top: 50%;
      transform: translateY(-50%);
      margin-right: 10px;
      white-space: nowrap;
      padding: 4px 8px;
      font-size: 12px;
      line-height: 1.2;
      color: #fff;
      background: rgba(0, 0, 0, 0.8);
      border-radius: 4px;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.12s ease;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .${PREFIX}iconbtn[data-tip]:hover::after { opacity: 1; }
    .${PREFIX}actions {
      display: flex;
      flex-direction: column-reverse;
      align-items: center;
      gap: 10px;
      opacity: 0;
      transform: translateY(8px) scale(0.9);
      pointer-events: none;
      transition: opacity 0.15s ease, transform 0.15s ease;
    }
    .${PREFIX}wrap:hover .${PREFIX}actions {
      opacity: 1;
      transform: none;
      pointer-events: auto;
    }
    .${PREFIX}overlay {
      position: fixed;
      z-index: ${Z - 1};
      pointer-events: none;
      background: rgba(19, 194, 194, 0.15);
      border: 2px solid #13c2c2;
      border-radius: 2px;
      box-sizing: border-box;
      display: none;
    }
    .${PREFIX}tip {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: ${Z};
      padding: 8px 16px;
      font-size: 13px;
      color: #fff;
      background: rgba(0, 0, 0, 0.75);
      border-radius: 6px;
      pointer-events: none;
      display: none;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .${PREFIX}selecting, .${PREFIX}selecting * { cursor: crosshair !important; }
  `;

  // ---- UI 元素（延迟创建，供自愈复用）----
  const wrap = document.createElement("div");
  wrap.className = `${PREFIX}wrap`;
  wrap.setAttribute(OWN, "1");

  const mainBtn = document.createElement("button");
  mainBtn.className = `${PREFIX}iconbtn`;
  mainBtn.innerHTML = ICON_MAIN;
  mainBtn.setAttribute(OWN, "1");

  const actions = document.createElement("div");
  actions.className = `${PREFIX}actions`;
  actions.setAttribute(OWN, "1");

  const btn = document.createElement("button");
  btn.className = `${PREFIX}iconbtn`;
  btn.innerHTML = ICON_DOWNLOAD;
  btn.setAttribute("data-tip", "截取元素");
  btn.setAttribute(OWN, "1");

  const copyBtn = document.createElement("button");
  copyBtn.className = `${PREFIX}iconbtn`;
  copyBtn.innerHTML = ICON_COPY;
  copyBtn.setAttribute("data-tip", "复制元素");
  copyBtn.setAttribute(OWN, "1");

  actions.appendChild(btn);
  actions.appendChild(copyBtn);
  wrap.appendChild(actions);
  wrap.appendChild(mainBtn);

  const overlay = document.createElement("div");
  overlay.className = `${PREFIX}overlay`;
  overlay.setAttribute(OWN, "1");

  const tip = document.createElement("div");
  tip.className = `${PREFIX}tip`;
  tip.textContent = "移动鼠标高亮元素，点击选择，按 Esc 取消";
  tip.setAttribute(OWN, "1");

  // 注入样式与 UI，幂等；SPA 替换 DOM 后可重复调用恢复
  function ensureUI() {
    if (!document.body) return;
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.setAttribute(OWN, "1");
      style.textContent = styleText;
      (document.head || document.documentElement).appendChild(style);
    }
    if (!wrap.isConnected) document.body.appendChild(wrap);
    if (!overlay.isConnected) document.body.appendChild(overlay);
    if (!tip.isConnected) document.body.appendChild(tip);
    restorePos();
  }

  // ---- 选择模式 ----
  function isOwn(el) {
    return el && typeof el.closest === "function" && el.closest(`[${OWN}]`);
  }

  function updateOverlay(el) {
    const r = el.getBoundingClientRect();
    overlay.style.display = "block";
    overlay.style.left = r.left + "px";
    overlay.style.top = r.top + "px";
    overlay.style.width = r.width + "px";
    overlay.style.height = r.height + "px";
  }

  function onMouseMove(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || isOwn(el)) {
      overlay.style.display = "none";
      hoverEl = null;
      return;
    }
    hoverEl = el;
    updateOverlay(el);
  }

  function onClick(e) {
    if (isOwn(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    const target = hoverEl;
    const mode = outputMode;
    stopSelecting();
    if (target) capture(target, mode);
  }

  function onKeyDown(e) {
    if (e.key === "Escape") stopSelecting();
  }

  function startSelecting(mode) {
    selecting = true;
    outputMode = mode;
    const active = mode === "copy" ? copyBtn : btn;
    active.classList.add(`${PREFIX}active`);
    tip.style.display = "block";
    document.documentElement.classList.add(`${PREFIX}selecting`);
    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);
  }

  function stopSelecting() {
    selecting = false;
    hoverEl = null;
    btn.classList.remove(`${PREFIX}active`);
    copyBtn.classList.remove(`${PREFIX}active`);
    tip.style.display = "none";
    overlay.style.display = "none";
    document.documentElement.classList.remove(`${PREFIX}selecting`);
    document.removeEventListener("mousemove", onMouseMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKeyDown, true);
  }

  btn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (draggedThisPress) return; // 拖动结束时不触发点击
    if (selecting) stopSelecting();
    else startSelecting("download");
  });

  copyBtn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (draggedThisPress) return; // 拖动结束时不触发点击
    if (selecting) stopSelecting();
    else startSelecting("copy");
  });

  // ---- 拖动按钮 ----
  const POS_KEY = PREFIX + "pos";
  let draggedThisPress = false;

  function applyPos(left, top) {
    const w = wrap.offsetWidth || 44;
    const h = wrap.offsetHeight || 44;
    left = Math.max(0, Math.min(left, window.innerWidth - w));
    top = Math.max(0, Math.min(top, window.innerHeight - h));
    wrap.style.left = left + "px";
    wrap.style.top = top + "px";
    wrap.style.right = "auto";
    wrap.style.bottom = "auto";
  }

  function restorePos() {
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (!raw) return;
      const p = JSON.parse(raw);
      if (typeof p.left === "number" && typeof p.top === "number")
        applyPos(p.left, p.top);
    } catch (_) {}
  }

  wrap.addEventListener("pointerdown", function (e) {
    if (e.button !== 0) return;
    e.preventDefault();
    draggedThisPress = false;
    const rect = wrap.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    const startX = e.clientX;
    const startY = e.clientY;

    function onMove(ev) {
      if (!draggedThisPress && Math.hypot(ev.clientX - startX, ev.clientY - startY) < 4)
        return;
      draggedThisPress = true;
      applyPos(ev.clientX - offsetX, ev.clientY - offsetY);
    }
    function onUp() {
      document.removeEventListener("pointermove", onMove, true);
      document.removeEventListener("pointerup", onUp, true);
      if (draggedThisPress) {
        const r = wrap.getBoundingClientRect();
        try {
          localStorage.setItem(POS_KEY, JSON.stringify({ left: r.left, top: r.top }));
        } catch (_) {}
        // 让本次 pointerup 后的 click 被忽略，随后复位标志
        setTimeout(function () {
          draggedThisPress = false;
        }, 0);
      }
    }
    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("pointerup", onUp, true);
  });

  // ---- 导出为图片 ----
  async function capture(el, mode) {
    const lib = window.modernScreenshot;
    if (!lib || typeof lib.domToPng !== "function") {
      showToast("截图库未加载成功，请刷新重试", true);
      return;
    }
    if (mode === "copy") {
      await copyToClipboard(el, lib);
    } else {
      await downloadPng(el, lib);
    }
  }

  async function downloadPng(el, lib) {
    showToast("正在生成图片...");
    try {
      const dataUrl = await lib.domToPng(el, {
        scale: 2,
        backgroundColor: "#ffffff",
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `element-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast("已下载");
    } catch (err) {
      console.error("[dom-to-png] 生成图片失败:", err);
      showToast("生成图片失败：" + (err && err.message ? err.message : "未知错误"), true);
    }
  }

  async function copyToClipboard(el, lib) {
    if (!navigator.clipboard || typeof window.ClipboardItem === "undefined") {
      showToast("当前浏览器不支持复制图片到剪贴板", true);
      return;
    }
    showToast("正在复制到剪贴板...");
    try {
      const blob = await lib.domToBlob(el, {
        scale: 2,
        backgroundColor: "#ffffff",
        type: "image/png",
      });
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      showToast("已复制到剪贴板");
    } catch (err) {
      console.error("[dom-to-png] 复制到剪贴板失败:", err);
      showToast("复制失败：" + (err && err.message ? err.message : "未知错误"), true);
    }
  }

  // ---- 轻量提示 ----
  let toastTimer = null;
  function showToast(text, isError) {
    tip.textContent = text;
    tip.style.display = "block";
    tip.style.background = isError ? "rgba(255, 77, 79, 0.9)" : "rgba(0, 0, 0, 0.75)";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      if (!selecting) tip.style.display = "none";
      tip.textContent = "移动鼠标高亮元素，点击选择，按 Esc 取消";
      tip.style.background = "rgba(0, 0, 0, 0.75)";
    }, 2000);
  }

  // ---- 启动与自愈 ----
  function boot() {
    if (document.body) {
      ensureUI();
    } else {
      // body 尚未就绪时等待
      new MutationObserver(function (_, obs) {
        if (document.body) {
          obs.disconnect();
          ensureUI();
        }
      }).observe(document.documentElement, { childList: true });
    }
  }

  boot();

  // SPA 路由变化后重新注入（Tampermonkey 提供）
  if (typeof window.onurlchange === "undefined") {
    // 兜底：hook history API 触发自定义事件
    ["pushState", "replaceState"].forEach(function (fn) {
      const orig = history[fn];
      history[fn] = function () {
        const ret = orig.apply(this, arguments);
        window.dispatchEvent(new Event("__d2p_urlchange"));
        return ret;
      };
    });
    window.addEventListener("popstate", ensureUI);
    window.addEventListener("__d2p_urlchange", ensureUI);
  } else {
    window.addEventListener("urlchange", ensureUI);
  }

  // 定时自愈：站点重渲染移除了按钮时重新注入
  setInterval(ensureUI, 2000);
})();
