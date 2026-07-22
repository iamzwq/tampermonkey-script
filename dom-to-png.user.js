// ==UserScript==
// @name         通用 DOM 导出图片工具
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  自定义 CSS 选择器，将任意 DOM 导出为高清图片，支持鼠标点选
// @author       iamzwq
// @match        *://*/*
// @match        file:///*
// @run-at       document-idle
// @require      https://unpkg.com/modern-screenshot@4.7.0/dist/index.js
// @grant        GM_addStyle
// @grant        GM_download
// ==/UserScript==

(function () {
  "use strict";

  /* ============================================================
       样式注入
    ============================================================ */
  GM_addStyle(`
        /* ---------- 面板 ---------- */
        #dom-exporter-panel {
          --dep-bg: #141413;
          --dep-text: #F4F4F4;
          --dep-text-muted: #565656;
          --dep-border-soft: rgba(255,255,255,0.4);
          --dep-panel-soft: #262627;
          --dep-panel-soft-hover: #565656;
          --dep-accent: #F79E1B;
          --dep-ok: #F37338;
          --dep-err: #EB001B;
          --dep-warn: #CF4500;
            position: fixed;
            top: 60px;
            right: 20px;
            z-index: 2147483647;
            width: 320px;
          background: var(--dep-bg);
          border: 1px solid var(--dep-border-soft);
            border-radius: 14px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset;
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
          color: var(--dep-text);
            user-select: none;
            overflow: hidden;
            transition: opacity 0.2s, transform 0.2s;
        }
        #dom-exporter-panel.collapsed .dep-body { display: none; }
        #dom-exporter-panel.collapsed .dep-status { display: none; }
        #dom-exporter-panel.collapsed { width: auto; }

        .dep-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            cursor: move;
          background: linear-gradient(135deg, #262627 0%, #141413 100%);
          border-bottom: 1px solid rgba(255,255,255,0.4);
        }
        .dep-header h3 {
            margin: 0;
            font-size: 13px;
            font-weight: 600;
            letter-spacing: 0.02em;
          color: #FFFFFF;
        }
        .dep-header-btns { display: flex; gap: 6px; }
        .dep-icon-btn {
            width: 26px; height: 26px;
            border: none; border-radius: 6px;
          background: var(--dep-panel-soft); color: #888;
            font-size: 13px; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            transition: background 0.15s, color 0.15s;
        }
        .dep-icon-btn:hover { background: var(--dep-panel-soft-hover); color: #FFFFFF; }

        .dep-body { padding: 14px 16px 16px; }

        /* ---------- 输入行 ---------- */
        .dep-field { margin-bottom: 12px; }
        .dep-field label {
            display: block; font-size: 11px; font-weight: 500;
          color: #E8E2DA; margin-bottom: 6px;
            text-transform: uppercase; letter-spacing: 0.06em;
        }
        .dep-input-row { display: flex; gap: 6px; }
        .dep-input {
            flex: 1; height: 36px; padding: 0 10px;
            background: #262627;
          border: 1px solid var(--dep-border-soft);
          border-radius: 8px; color: var(--dep-text);
            font-size: 13px; font-family: "SF Mono","Fira Code","Cascadia Code",monospace;
            outline: none; transition: border-color 0.15s;
        }
        .dep-input:focus { border-color: #F79E1B; }
        .dep-input::placeholder { color: #565656; }

        /* ---------- 按钮 ---------- */
        .dep-btn {
            height: 36px; padding: 0 14px; border: none; border-radius: 8px;
            font-size: 12px; font-weight: 600; cursor: pointer;
            transition: all 0.15s; white-space: nowrap; font-family: inherit;
        }
        .dep-btn-primary {
            background: linear-gradient(135deg, #EB001B 0%, #CF4500 100%); color: #FFFFFF;
        }
        .dep-btn-primary:hover { box-shadow: 0 4px 16px rgba(255,255,255,0.4); transform: translateY(-1px); }
        .dep-btn-pick {
          background: #E8E2DA; color: #9A3A0A;
            border: 1px solid rgba(255,255,255,0.4);
        }
        .dep-btn-pick:hover { background: #F4F4F4; }
        .dep-btn-pick.active { background: #EB001B; color: #FFFFFF; border-color: rgba(255,255,255,0.4); }
        .dep-btn:disabled { opacity: 0.4; pointer-events: none; }

        /* ---------- 缩放选择 ---------- */
        .dep-scale-row {
            display: flex; gap: 4px;
          background: #262627; border-radius: 8px; padding: 3px;
        }
        .dep-scale-opt {
            flex: 1; height: 30px; border: none; border-radius: 6px;
          background: transparent; color: #565656; font-size: 12px; font-weight: 600;
            cursor: pointer; transition: all 0.15s; font-family: inherit;
        }
        .dep-scale-opt.active { background: #E8E2DA; color: #9A3A0A; }
        .dep-scale-opt:hover:not(.active) { color: #F4F4F4; }

        /* ---------- 匹配计数 ---------- */
        .dep-match-count { font-size: 12px; color: #565656; padding: 6px 0 4px; min-height: 22px; }
        .dep-match-count span { color: var(--dep-accent); font-weight: 600; }

        /* ---------- 操作按钮行 ---------- */
        .dep-actions { display: flex; gap: 8px; margin-top: 10px; }
        .dep-actions .dep-btn { flex: 1; }

        /* ---------- 状态栏 ---------- */
        .dep-status {
          padding: 8px 16px; font-size: 11px; color: var(--dep-text-muted);
            border-top: 1px solid rgba(255,255,255,0.4);
            min-height: 34px; display: flex; align-items: center; gap: 8px;
        }
        .dep-status.dep-ok { color: var(--dep-ok); }
        .dep-status.dep-err { color: var(--dep-err); }
        .dep-status.dep-warn { color: var(--dep-warn); }
        .dep-spinner {
            width: 12px; height: 12px;
            border: 2px solid rgba(255,255,255,0.4);
          border-top-color: var(--dep-accent); border-radius: 50%;
            animation: dep-spin 0.6s linear infinite;
        }
        @keyframes dep-spin { to { transform: rotate(360deg); } }

        /* ---------- 选择模式 ---------- */
        #dom-exporter-overlay {
            position: fixed; inset: 0; z-index: 2147483646;
            cursor: crosshair; pointer-events: auto;
        }
        #dom-exporter-highlight {
            position: fixed; z-index: 2147483645; pointer-events: none;
          border: 2px solid #F79E1B; background: rgba(255,255,255,0.4);
            border-radius: 4px; transition: all 0.08s ease; display: none;
        }
        #dom-exporter-tooltip {
            position: fixed; z-index: 2147483647; pointer-events: none;
          padding: 4px 8px; background: #262627; color: #F4F4F4;
            font-size: 11px; font-family: "SF Mono","Fira Code",monospace;
            border-radius: 6px; border: 1px solid var(--dep-border-soft);
            white-space: nowrap; display: none; max-width: 400px;
            overflow: hidden; text-overflow: ellipsis;
        }
    `);

  /* ============================================================
       状态
    ============================================================ */
  const MSG = {
    idle: "输入选择器或点选元素开始",
    picking: "点击目标元素选中，Esc 取消",
    selected: "已选择元素",
    invalidSelector: "无效的选择器",
    needSelector: "请先输入选择器或点选元素",
    selectorSyntaxError: "选择器语法错误",
    noMatch: "未匹配到任何元素",
    noExportable: "没有可导出的元素",
    libMissing: "modern-screenshot 库未加载，请检查网络后刷新重试",
    blankResult: "导出结果异常（可能为空白图），请检查目标元素是否有可见内容",
  };

  const QUERY_ERROR = {
    none: "none",
    empty: "empty",
    syntax: "syntax",
  };

  let settings = { selector: "", scale: 2, collapsed: true };
  let isPicking = false;
  let isExporting = false;

  /* ============================================================
       构建 UI
    ============================================================ */
  const panel = document.createElement("div");
  panel.id = "dom-exporter-panel";
  panel.innerHTML = `
        <div class="dep-header">
            <h3>DOM 导出器</h3>
            <div class="dep-header-btns">
            <button class="dep-icon-btn" id="dep-hide" title="本次隐藏">✕</button>
                <button class="dep-icon-btn" id="dep-collapse" title="折叠/展开">▴</button>
            </div>
        </div>
        <div class="dep-body">
            <div class="dep-field">
                <label>CSS 选择器</label>
                <div class="dep-input-row">
                    <input class="dep-input" id="dep-selector" placeholder="例: .card, #main, div[data-id]" spellcheck="false">
                    <button class="dep-btn dep-btn-pick" id="dep-pick" title="鼠标点选元素">◎</button>
                </div>
            </div>
            <div class="dep-field">
                <label>导出缩放</label>
                <div class="dep-scale-row" id="dep-scale-row">
                    <button class="dep-scale-opt" data-scale="1">1x</button>
                    <button class="dep-scale-opt active" data-scale="2">2x</button>
                    <button class="dep-scale-opt" data-scale="3">3x</button>
                    <button class="dep-scale-opt" data-scale="4">4x</button>
                </div>
            </div>
            <div class="dep-match-count" id="dep-match-count"></div>
            <div class="dep-actions">
              <button class="dep-btn dep-btn-primary" id="dep-export">导出匹配项</button>
            </div>
        </div>
        <div class="dep-status" id="dep-status">${MSG.idle}</div>
    `;

  function appendIfMissing(node) {
    if (node.isConnected) return false;
    document.body.appendChild(node);
    return true;
  }

  function mountUi() {
    if (!document.body) {
      return false;
    }
    const mounted = [panel, overlay, highlight, tooltip].some(appendIfMissing);
    return true;
  }

  function ensureMounted() {
    if (mountUi()) return;
    const onReady = () => {
      if (!mountUi()) return;
      document.removeEventListener("DOMContentLoaded", onReady);
    };
    document.addEventListener("DOMContentLoaded", onReady);
  }

  const overlay = document.createElement("div");
  overlay.id = "dom-exporter-overlay";
  overlay.style.display = "none";

  const highlight = document.createElement("div");
  highlight.id = "dom-exporter-highlight";

  const tooltip = document.createElement("div");
  tooltip.id = "dom-exporter-tooltip";

  ensureMounted();

  // 某些站点会在路由跳转时替换 body 或清空节点，这里自动补挂 UI。
  const mountObserver = new MutationObserver(() => {
    mountUi();
  });
  mountObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  /* ============================================================
       DOM 引用
    ============================================================ */
  const $selector = panel.querySelector("#dep-selector");
  const $pick = panel.querySelector("#dep-pick");
  const $scaleRow = panel.querySelector("#dep-scale-row");
  const $matchCount = panel.querySelector("#dep-match-count");
  const $export = panel.querySelector("#dep-export");
  const $status = panel.querySelector("#dep-status");
  const $hide = panel.querySelector("#dep-hide");
  const $collapse = panel.querySelector("#dep-collapse");

  // 初始化
  $selector.value = settings.selector;
  setActiveScale(settings.scale);

  // 默认折叠
  settings.collapsed = settings.collapsed !== false;
  applyCollapse();

  /* ============================================================
       折叠
    ============================================================ */
  function applyCollapse() {
    panel.classList.toggle("collapsed", settings.collapsed);
    $collapse.textContent = settings.collapsed ? "▾" : "▴";
    requestAnimationFrame(keepPanelInViewport);
  }

  function keepPanelInViewport() {
    const rect = panel.getBoundingClientRect();
    const margin = 8;
    let nextLeft = rect.left;
    let nextTop = rect.top;

    if (rect.left < margin) nextLeft = margin;
    if (rect.top < margin) nextTop = margin;
    if (rect.right > window.innerWidth - margin) {
      nextLeft -= rect.right - (window.innerWidth - margin);
    }
    if (rect.bottom > window.innerHeight - margin) {
      nextTop -= rect.bottom - (window.innerHeight - margin);
    }

    if (nextLeft !== rect.left || nextTop !== rect.top) {
      panel.style.left = `${Math.round(nextLeft)}px`;
      panel.style.top = `${Math.round(nextTop)}px`;
      panel.style.right = "auto";
    }
  }

  $collapse.addEventListener("click", () => {
    settings.collapsed = !settings.collapsed;
    applyCollapse();
  });

  $hide.addEventListener("click", () => {
    stopPicking();
    panel.style.display = "none";
  });

  window.addEventListener("resize", keepPanelInViewport);

  /* ============================================================
       拖拽
    ============================================================ */
  (function initDrag() {
    const header = panel.querySelector(".dep-header");
    let ox, oy, px, py;
    header.addEventListener("mousedown", (e) => {
      if (e.target.closest(".dep-icon-btn")) return;
      ox = e.clientX;
      oy = e.clientY;
      const r = panel.getBoundingClientRect();
      px = r.left;
      py = r.top;
      const onMove = (ev) => {
        panel.style.left = px + ev.clientX - ox + "px";
        panel.style.top = py + ev.clientY - oy + "px";
        panel.style.right = "auto";
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        keepPanelInViewport();
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  })();

  /* ============================================================
       缩放选择
    ============================================================ */
  function setActiveScale(s) {
    settings.scale = s;
    $scaleRow.querySelectorAll(".dep-scale-opt").forEach((b) => {
      b.classList.toggle("active", Number(b.dataset.scale) === s);
    });
  }

  $scaleRow.addEventListener("click", (e) => {
    const btn = e.target.closest(".dep-scale-opt");
    if (!btn) return;
    setActiveScale(Number(btn.dataset.scale));
  });

  /* ============================================================
       选择器输入 & 匹配计数
    ============================================================ */
  let matchTimer = null;
  $selector.addEventListener("input", () => {
    settings.selector = $selector.value.trim();
    clearTimeout(matchTimer);
    matchTimer = setTimeout(updateMatchCount, 300);
  });

  function updateMatchCount() {
    const { nodes, error } = queryMatchedNodes();
    if (error === QUERY_ERROR.empty) {
      $matchCount.textContent = "";
      return;
    }
    if (error === QUERY_ERROR.syntax) {
      $matchCount.textContent = MSG.invalidSelector;
      return;
    }
    const count = nodes.length;
    $matchCount.innerHTML =
      count > 0 ? `匹配到 <span>${count}</span> 个元素` : `未找到匹配元素`;
  }
  updateMatchCount();

  function queryMatchedNodes() {
    const sel = settings.selector;
    if (!sel) return { nodes: [], error: QUERY_ERROR.empty };
    try {
      return {
        nodes: Array.from(document.querySelectorAll(sel)),
        error: QUERY_ERROR.none,
      };
    } catch (_) {
      return { nodes: [], error: QUERY_ERROR.syntax };
    }
  }

  function getPointerTarget(clientX, clientY) {
    overlay.style.pointerEvents = "none";
    const target = document.elementFromPoint(clientX, clientY);
    overlay.style.pointerEvents = "auto";
    return target;
  }

  /* ============================================================
       状态栏
    ============================================================ */
  function setStatus(msg, type = "", loading = false) {
    if (loading) {
      $status.innerHTML = `<div class="dep-spinner"></div> ${msg}`;
      $status.className = "dep-status";
      return;
    }
    $status.textContent = msg;
    $status.className = "dep-status" + (type ? ` dep-${type}` : "");
  }

  /* ============================================================
       鼠标点选模式
    ============================================================ */
  function togglePickingUi(active) {
    $pick.classList.toggle("active", active);
    $pick.textContent = active ? "✕" : "◎";
    overlay.style.display = active ? "block" : "none";
    highlight.style.display = active ? "block" : "none";
    if (!active) tooltip.style.display = "none";
  }

  function startPicking() {
    isPicking = true;
    togglePickingUi(true);
    setStatus(MSG.picking);
  }

  function stopPicking() {
    isPicking = false;
    togglePickingUi(false);
  }

  $pick.addEventListener("click", () => {
    isPicking ? stopPicking() : startPicking();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isPicking) stopPicking();
  });

  // 生成唯一 CSS 选择器
  function generateSelector(el) {
    if (el.id) return "#" + CSS.escape(el.id);
    let path = [];
    let current = el;
    while (current && current !== document.body) {
      let part = current.tagName.toLowerCase();
      if (current.id) {
        part = "#" + CSS.escape(current.id);
        path.unshift(part);
        break;
      }
      if (current.classList.length) {
        part +=
          "." +
          Array.from(current.classList)
            .map((c) => CSS.escape(c))
            .join(".");
      }
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          (c) => c.tagName === current.tagName,
        );
        if (siblings.length > 1) {
          part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
        }
      }
      path.unshift(part);
      current = current.parentElement;
    }
    return path.join(" > ");
  }

  function describeElement(el) {
    let tag = el.tagName.toLowerCase();
    if (el.id) tag += "#" + el.id;
    if (el.classList.length) tag += "." + Array.from(el.classList).slice(0, 3).join(".");
    const rect = el.getBoundingClientRect();
    tag += ` (${Math.round(rect.width)}×${Math.round(rect.height)})`;
    return tag;
  }

  overlay.addEventListener("mousemove", (e) => {
    const target = getPointerTarget(e.clientX, e.clientY);
    if (
      !target ||
      target === document.body ||
      target === panel ||
      panel.contains(target)
    ) {
      highlight.style.display = "none";
      tooltip.style.display = "none";
      return;
    }
    const rect = target.getBoundingClientRect();
    highlight.style.display = "block";
    highlight.style.left = rect.left - 1 + "px";
    highlight.style.top = rect.top - 1 + "px";
    highlight.style.width = rect.width + 2 + "px";
    highlight.style.height = rect.height + 2 + "px";
    tooltip.style.display = "block";
    tooltip.textContent = describeElement(target);
    tooltip.style.left = Math.min(rect.left, window.innerWidth - 300) + "px";
    tooltip.style.top = rect.top - 28 + "px";
  });

  overlay.addEventListener("click", (e) => {
    const target = getPointerTarget(e.clientX, e.clientY);
    if (!target || target === document.body) return;
    const sel = generateSelector(target);
    $selector.value = sel;
    settings.selector = sel;
    stopPicking();
    updateMatchCount();
    setStatus(MSG.selected, "ok");
  });

  /* ============================================================
       导出引擎 — modern-screenshot
       https://github.com/nicepkg/modern-screenshot
    ============================================================ */
  function resolveBgColor(el) {
    let node = el;
    while (node && node !== document.documentElement) {
      const bg = window.getComputedStyle(node).backgroundColor;
      if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return bg;
      node = node.parentElement;
    }
    return "#ffffff";
  }

  async function withExporterUiHidden(task) {
    const uiNodes = [panel, overlay, highlight, tooltip];
    const prev = uiNodes.map((el) => el.style.display);
    uiNodes.forEach((el) => {
      el.style.display = "none";
    });
    try {
      return await task();
    } finally {
      uiNodes.forEach((el, i) => {
        el.style.display = prev[i];
      });
    }
  }

  async function exportNode(node) {
    if (typeof window.modernScreenshot === "undefined") {
      throw new Error(MSG.libMissing);
    }
    const { domToPng } = window.modernScreenshot;
    const scale = settings.scale;

    // modern-screenshot 的 domToPng 直接返回 data URL 字符串
    // 导出时临时隐藏脚本自身 UI，避免被截入结果图。
    const dataUrl = await withExporterUiHidden(() =>
      domToPng(node, {
        scale: scale,
        backgroundColor: resolveBgColor(node),
        // 部分版本支持 features / workerUrl 等，按需扩展
      }),
    );

    if (!dataUrl || dataUrl.length < 5000) {
      throw new Error(MSG.blankResult);
    }

    return dataUrl;
  }

  /* ============================================================
       下载
    ============================================================ */
  function downloadImage(dataUrl, filename) {
    const fallbackDownload = () => {
      const a = document.createElement("a");
      a.download = filename;
      a.href = dataUrl;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };

    if (typeof GM_download !== "undefined" && dataUrl.startsWith("data:")) {
      try {
        GM_download({
          url: dataUrl,
          name: filename,
          saveAs: false,
          onerror: fallbackDownload,
          ontimeout: fallbackDownload,
        });
        return;
      } catch (_) {
        // 忽略并回退到原生下载。
      }
    }

    fallbackDownload();
  }

  function makeFilename(index, total) {
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    if (total <= 1) return `dom-export-${ts}.png`;
    return `dom-export-${ts}-${index + 1}.png`;
  }

  /* ============================================================
       导出主流程
    ============================================================ */
  async function doExport(nodes) {
    if (!nodes.length) {
      setStatus(MSG.noExportable, "err");
      return;
    }
    if (isExporting) return;
    isExporting = true;

    const total = nodes.length;
    $export.disabled = true;

    for (let i = 0; i < total; i++) {
      try {
        setStatus(`导出 ${i + 1} / ${total}...`, "", true);
        const dataUrl = await exportNode(nodes[i]);
        downloadImage(dataUrl, makeFilename(i, total));
        setStatus(`已导出 ${i + 1} / ${total}`, "ok");
        if (i < total - 1) await new Promise((r) => setTimeout(r, 600));
      } catch (err) {
        setStatus(`第 ${i + 1} 张失败: ${err.message}`, "err");
      }
    }

    $export.disabled = false;
    isExporting = false;
  }

  function resolveExportNodes() {
    const { nodes, error } = queryMatchedNodes();
    if (error === QUERY_ERROR.empty) {
      setStatus(MSG.needSelector, "warn");
      return null;
    }
    if (error === QUERY_ERROR.syntax) {
      setStatus(MSG.selectorSyntaxError, "err");
      return null;
    }
    if (!nodes.length) {
      setStatus(MSG.noMatch, "err");
      return null;
    }
    return nodes;
  }

  $export.addEventListener("click", () => {
    const nodes = resolveExportNodes();
    if (!nodes) return;
    if (nodes.length > 1) {
      setStatus(`匹配到 ${nodes.length} 个元素，将批量导出`, "warn");
    }
    doExport(nodes.length > 1 ? nodes : [nodes[0]]);
  });
})();
