// ==UserScript==
// @name         微信公众号HTML粘贴助手
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  允许在微信公众号编辑器中直接粘贴HTML代码并渲染
// @author       You
// @match        https://mp.weixin.qq.com/cgi-bin/appmsg*
// @match        https://mp.weixin.qq.com/*
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
  "use strict";

  console.log("微信公众号HTML粘贴助手已启动");

  // 等待编辑器加载
  function waitForEditor() {
    const checkEditor = setInterval(() => {
      // 查找微信公众号编辑器
      const editor =
        document.querySelector("#edui1_iframeholder iframe") ||
        document.querySelector(".edui-editor-iframeholder iframe") ||
        document.querySelector('iframe[id^="ueditor"]');

      if (editor) {
        clearInterval(checkEditor);
        console.log("找到编辑器，正在初始化HTML粘贴功能...");
        initHTMLPaste(editor);
      }
    }, 500);

    // 30秒后停止检查
    setTimeout(() => clearInterval(checkEditor), 30000);
  }

  // 初始化HTML粘贴功能
  function initHTMLPaste(editorFrame) {
    try {
      const editorDoc =
        editorFrame.contentDocument || editorFrame.contentWindow.document;
      const editorBody = editorDoc.body;

      if (!editorBody) {
        console.error("无法访问编辑器内容");
        return;
      }

      console.log("编辑器初始化成功");

      // 拦截粘贴事件
      editorBody.addEventListener(
        "paste",
        function (e) {
          const clipboardData = e.clipboardData || window.clipboardData;
          const htmlData = clipboardData.getData("text/html");
          const textData = clipboardData.getData("text/plain");

          // 如果粘贴的内容看起来像HTML代码
          if (
            textData &&
            (textData.trim().startsWith("<") || textData.includes("</"))
          ) {
            e.preventDefault();
            e.stopPropagation();

            console.log("检测到HTML代码，正在渲染...");

            // 插入HTML内容
            insertHTML(editorDoc, textData);
            return false;
          }

          // 如果有HTML格式数据，也允许粘贴
          if (htmlData) {
            console.log("检测到HTML格式内容");
            // 让默认行为处理，或者自定义处理
          }
        },
        true,
      );

      // 添加快捷按钮
      addHTMLPasteButton(editorDoc);
    } catch (error) {
      console.error("初始化编辑器失败:", error);
    }
  }

  // 插入HTML内容
  function insertHTML(editorDoc, html) {
    try {
      const selection = editorDoc.getSelection();
      const range = selection.getRangeAt(0);

      // 创建临时容器来解析HTML
      const tempDiv = editorDoc.createElement("div");
      tempDiv.innerHTML = html;

      // 插入内容
      range.deleteContents();

      // 逐个插入节点
      const fragment = editorDoc.createDocumentFragment();
      while (tempDiv.firstChild) {
        fragment.appendChild(tempDiv.firstChild);
      }

      range.insertNode(fragment);

      // 移动光标到插入内容之后
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);

      console.log("HTML内容插入成功");
    } catch (error) {
      console.error("插入HTML失败:", error);
      alert("插入HTML失败，请检查HTML格式是否正确");
    }
  }

  // 添加HTML粘贴按钮
  function addHTMLPasteButton(editorDoc) {
    // 在页面主文档中添加按钮（不是在iframe中）
    if (document.getElementById("html-paste-btn")) return;

    const button = document.createElement("button");
    button.id = "html-paste-btn";
    button.innerHTML = "📝 粘贴HTML";
    button.style.cssText = `
      position: fixed;
      top: 100px;
      right: 20px;
      z-index: 99999;
      padding: 12px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      transition: all 0.3s ease;
    `;

    button.addEventListener("mouseenter", function () {
      this.style.transform = "translateY(-2px)";
      this.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.6)";
    });

    button.addEventListener("mouseleave", function () {
      this.style.transform = "translateY(0)";
      this.style.boxShadow = "0 4px 15px rgba(102, 126, 234, 0.4)";
    });

    button.addEventListener("click", function () {
      const html = prompt("请粘贴HTML代码：");
      if (html) {
        insertHTML(editorDoc, html);
      }
    });

    document.body.appendChild(button);
  }

  // 页面加载完成后执行
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", waitForEditor);
  } else {
    waitForEditor();
  }

  // 监听页面变化，处理动态加载的编辑器
  const observer = new MutationObserver(function () {
    if (!document.getElementById("html-paste-btn")) {
      waitForEditor();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
