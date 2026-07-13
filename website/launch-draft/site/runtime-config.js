(function () {
  "use strict";

  var config = window.__ZAKI_WEBSITE_ENV__ || {};
  var appBase = String(config.APP_BASE_URL || "https://app.chatzaki.com").replace(/\/$/, "");

  document.documentElement.dataset.websiteVersion = String(config.VERSION || "5.0.0");
  document.documentElement.dataset.websiteEnvironment = String(config.ENVIRONMENT || "production");

  document.querySelectorAll('a[href^="https://app.chatzaki.com"]').forEach(function (link) {
    var current = new URL(link.getAttribute("href"));
    link.setAttribute("href", appBase + current.pathname + current.search + current.hash);
  });
}());
