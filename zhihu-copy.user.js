// ==UserScript==
// @name         知乎文章复制助手
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  解除知乎文章的复制限制，允许自由复制文章内容
// @author       You
// @match        https://zhuanlan.zhihu.com/p/*
// @match        https://www.zhihu.com/question/*
// @match        https://www.zhihu.com/answer/*
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
  "use strict";

  // 移除复制限制
  function enableCopy() {
    // 移除所有阻止复制的事件监听器
    document.body.oncopy = null;
    document.body.oncut = null;
    document.body.onselectstart = null;
    document.body.oncontextmenu = null;

    // 移除用户选择限制的CSS样式
    const style = document.createElement("style");
    style.innerHTML = `
            * {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
            }
        `;
    document.head.appendChild(style);

    // 移除所有元素上的复制限制事件
    document.querySelectorAll("*").forEach((element) => {
      element.oncopy = null;
      element.oncut = null;
      element.onselectstart = null;
      element.oncontextmenu = null;
      element.ondragstart = null;
    });

    // 阻止知乎的反复制脚本
    document.addEventListener(
      "copy",
      function (e) {
        e.stopPropagation();
      },
      true,
    );

    document.addEventListener(
      "cut",
      function (e) {
        e.stopPropagation();
      },
      true,
    );

    document.addEventListener(
      "selectstart",
      function (e) {
        e.stopPropagation();
      },
      true,
    );
  }

  // 页面加载完成后执行
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enableCopy);
  } else {
    enableCopy();
  }

  // 监听DOM变化，防止知乎动态加载内容后重新添加限制
  const observer = new MutationObserver(function (mutations) {
    enableCopy();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // 添加一个复制按钮（可选功能）
  function addCopyButton() {
    const article =
      document.querySelector(".Post-RichTextContainer") ||
      document.querySelector(".RichContent-inner") ||
      document.querySelector(".RichText");

    if (article && !document.getElementById("custom-copy-btn")) {
      const button = document.createElement("button");
      button.id = "custom-copy-btn";
      button.textContent = "📋 一键复制全文";
      button.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999;
                padding: 10px 20px;
                background: #0084ff;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            `;

      button.addEventListener("click", function () {
        const text = article.innerText;
        navigator.clipboard
          .writeText(text)
          .then(function () {
            button.textContent = "✅ 复制成功！";
            setTimeout(function () {
              button.textContent = "📋 一键复制全文";
            }, 2000);
          })
          .catch(function (err) {
            alert("复制失败，请手动选择复制");
          });
      });

      document.body.appendChild(button);
    }
  }

  // 延迟添加复制按钮，确保页面内容已加载
  setTimeout(addCopyButton, 1000);
})();
