// ==UserScript==
// @name         135编辑器页面简化
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  移除135编辑器页面中的多余元素，简化界面
// @author       You
// @match        https://www.135editor.com/beautify_editor.html*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  "use strict";

  // 要删除的元素选择器列表
  const selectorsToRemove = [
    ".left_side__menu",
    ".snow",
    ".w2",
    ".vs-model",
    "#compatibilityBox",
    ".logo-box",
    ".nav-box .zhong",
    "#fixed-side-bar",
    "#add_xiaoshi",
  ];

  // 删除元素的函数
  function removeElements() {
    selectorsToRemove.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element) => {
        if (element) {
          element.remove();
          console.log(`已移除元素: ${selector}`);
        }
      });
    });
  }

  // 页面加载完成后执行
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", removeElements);
  } else {
    removeElements();
  }

  // 使用 MutationObserver 监听动态添加的元素
  const observer = new MutationObserver(() => {
    removeElements();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
