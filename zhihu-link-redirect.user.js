// ==UserScript==
// @name        知乎外链自动跳转
// @namespace   Violentmonkey Scripts
// @match       *://example.org/*
// @grant       none
// @version     1.0
// @author      -
// @description 自动跳转知乎外链中间页
// @match        *://link.zhihu.com/*
// @match        *://link.zhihu.com/?target=*
// @match        *://*.zhihu.com/*
// @run-at       document-start
// ==/UserScript==
(function () {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const target = params.get("target");
  if (target) {
    window.location.replace(decodeURIComponent(target));
    return;
  }
})();
