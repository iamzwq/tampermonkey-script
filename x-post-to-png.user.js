// ==UserScript==
// @name         X.com 帖子导出 PNG
// @namespace    http://tampermonkey.net/
// @version      4.0.0
// @description  在 X.com 帖子操作菜单（「…」按钮）中添加「导出为 PNG」选项，一键截图保存推文
// @author       You
// @match        https://x.com/*
// @match        https://twitter.com/*
// @grant        GM_xmlhttpRequest
// @connect      pbs.twimg.com
// @connect      abs.twimg.com
// @connect      ton.twimg.com
// @noframes
// @require      https://cdnjs.cloudflare.com/ajax/libs/dom-to-image/2.6.0/dom-to-image.min.js
// ==/UserScript==

(function () {
  "use strict";

  const INJECTED_ATTR = "data-tweet-png-injected";
  let pendingTweet = null;

  // ── 1. 记录点击哪条推文的「…」按钮 ──────────────────────────────────────
  document.addEventListener(
    "click",
    (e) => {
      const caret = e.target.closest('[data-testid="caret"]');
      if (caret) {
        pendingTweet = caret.closest('article[data-testid="tweet"]');
      }
    },
    true,
  );

  // ── 2. 监听下拉菜单出现 ──────────────────────────────────────────────────
  new MutationObserver((mutations) => {
    for (const { addedNodes } of mutations) {
      for (const node of addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.matches?.('[role="menu"]')) injectItem(node);
        node.querySelectorAll?.('[role="menu"]').forEach(injectItem);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });

  // ── 3. 向菜单注入「导出为 PNG」按钮 ─────────────────────────────────────
  function injectItem(menu) {
    if (menu.hasAttribute(INJECTED_ATTR)) return;
    menu.setAttribute(INJECTED_ATTR, "1");
    if (!pendingTweet) return;

    const existingItem = menu.querySelector('[role="menuitem"]');
    if (!existingItem) return;

    const tweet = pendingTweet; // 闭包捕获当前推文

    // 克隆已有菜单项，保留 X.com 原生样式
    const item = existingItem.cloneNode(true);
    item.removeAttribute("data-testid");

    // 替换为相机图标
    const svg = item.querySelector("svg");
    if (svg) {
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.innerHTML =
        '<path d="M21 6.5h-3.5l-1.7-2H8.2L6.5 6.5H3c-1.1 0-2 .9-2 2V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8.5c0-1.1-.9-2-2-2zM12 17c-2.48 0-4.5-2.02-4.5-4.5S9.52 8 12 8s4.5 2.02 4.5 4.5S14.48 17 12 17zm0-7.2c-1.49 0-2.7 1.21-2.7 2.7s1.21 2.7 2.7 2.7 2.7-1.21 2.7-2.7-1.21-2.7-2.7-2.7z"/>';
    }

    // 替换文字：找最深的纯文字 span
    const spans = Array.from(item.querySelectorAll("span"));
    const textSpan = spans.find((s) => !s.children.length && s.textContent.trim());
    if (textSpan) {
      textSpan.textContent = "导出为 PNG";
    } else if (spans[0]) {
      spans[0].textContent = "导出为 PNG";
    }

    item.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      // 直接从 DOM 移除整个菜单浮层（包括遮罩），确保截图时完全不可见
      // 同时通知 React 关闭（Escape），防止状态残留
      const overlay =
        menu.closest(
          '[data-testid="sheetDialog"], [role="presentation"], [data-testid="Dropdown"]',
        ) || menu.parentElement;
      if (overlay && overlay !== document.body) {
        overlay.remove();
      } else {
        menu.remove();
      }
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
      );

      // exportAsPNG 内部有 scrollIntoView + sleep(150)，足够等待渲染完成
      exportAsPNG(tweet);
    });

    menu.appendChild(item);
  }

  // ── 工具：GM_xmlhttpRequest 将跨域图片转为 dataURL ──────────────────────
  function imageToDataUrl(url) {
    return new Promise((resolve) => {
      GM_xmlhttpRequest({
        method: "GET",
        url,
        responseType: "blob",
        timeout: 12000,
        onload: (resp) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(resp.response);
        },
        onerror: () => resolve(null),
        ontimeout: () => resolve(null),
      });
    });
  }

  // ── 4. dom-to-image 截图并下载（无弹窗，完全 canvas 渲染）────────────────
  async function exportAsPNG(article) {
    const toast = showToast("正在处理图片资源…");
    const origSrcs = new Map();

    try {
      if (typeof window.domtoimage === "undefined") {
        throw new Error("截图库未加载，请在 Tampermonkey 中重新安装脚本");
      }

      // 将推文内所有跨域 <img> 替换为 dataURL，解决 CORS 导致图片空白的问题
      const imgs = Array.from(article.querySelectorAll("img[src]"));
      await Promise.all(
        imgs.map(async (img) => {
          const src = img.getAttribute("src");
          if (!src || src.startsWith("data:") || src.startsWith("blob:")) return;
          const dataUrl = await imageToDataUrl(src);
          if (dataUrl) {
            origSrcs.set(img, src);
            img.setAttribute("src", dataUrl);
          }
        }),
      );

      updateToast(toast, "正在生成截图…");

      const scale = Math.max(window.devicePixelRatio, 2);
      const rect = article.getBoundingClientRect();

      // 获取背景色（兼容深/浅色模式）
      const rootStyle = getComputedStyle(document.documentElement);
      let bg =
        rootStyle.getPropertyValue("--color-bg-primary").trim() ||
        getComputedStyle(document.body).backgroundColor;
      if (!bg || bg === "rgba(0, 0, 0, 0)" || bg === "transparent") bg = "#ffffff";

      // dom-to-image 通过 getComputedStyle 精确序列化真实样式，质量优于 html2canvas
      const dataUrl = await window.domtoimage.toPng(article, {
        width: Math.round(rect.width * scale),
        height: Math.round(rect.height * scale),
        style: {
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: `${rect.width}px`,
          height: `${rect.height}px`,
        },
        bgcolor: bg,
        cacheBust: false,
        imagePlaceholder:
          "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==",
      });

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `tweet_${formatDate()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      updateToast(toast, "✓ PNG 已保存");
      setTimeout(() => toast.remove(), 2000);
    } catch (err) {
      console.error("[Tweet PNG Export]", err);
      updateToast(toast, `导出失败：${err.message}`);
      setTimeout(() => toast.remove(), 4000);
    } finally {
      // 无论成功与否，恢复原始 src，避免影响页面正常浏览
      for (const [img, src] of origSrcs) {
        img.setAttribute("src", src);
      }
    }
  }

  // ── Toast 工具 ───────────────────────────────────────────────────────────
  function showToast(msg) {
    const el = document.createElement("div");
    Object.assign(el.style, {
      position: "fixed",
      bottom: "28px",
      left: "50%",
      transform: "translateX(-50%)",
      background: "rgba(15,20,25,0.88)",
      color: "#fff",
      padding: "10px 22px",
      borderRadius: "24px",
      fontSize: "14px",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      zIndex: "2147483647",
      pointerEvents: "none",
      boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
      backdropFilter: "blur(8px)",
    });
    el.textContent = msg;
    document.body.appendChild(el);
    return el;
  }

  function updateToast(el, msg) {
    el.textContent = msg;
  }

  function formatDate() {
    const d = new Date();
    return (
      d.getFullYear() +
      String(d.getMonth() + 1).padStart(2, "0") +
      String(d.getDate()).padStart(2, "0") +
      "_" +
      String(d.getHours()).padStart(2, "0") +
      String(d.getMinutes()).padStart(2, "0") +
      String(d.getSeconds()).padStart(2, "0")
    );
  }
})();
