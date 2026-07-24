(function () {
  "use strict";

  var config = window.__ZAKI_WEBSITE_ENV__ || {};
  var appBase = String(config.APP_BASE_URL || "https://app.chatzaki.com").replace(/\/$/, "");

  document.documentElement.dataset.websiteVersion = String(config.VERSION || "5.0.0");
  document.documentElement.dataset.websiteEnvironment = String(config.ENVIRONMENT || "production");

  function rewriteAppLink(link) {
    var current = new URL(link.getAttribute("href"));
    var rewrittenHref = appBase + current.pathname + current.search + current.hash;
    // The observer below watches href mutations. Avoid writing the same value
    // on a local/default-origin link, otherwise its own mutation is observed
    // forever and can starve the browser renderer.
    if (link.getAttribute("href") !== rewrittenHref) {
      link.setAttribute("href", rewrittenHref);
    }
  }

  function rewriteAppLinks(root) {
    if (root.matches && root.matches('a[href^="https://app.chatzaki.com"]')) {
      rewriteAppLink(root);
    }
    if (root.querySelectorAll) {
      root.querySelectorAll('a[href^="https://app.chatzaki.com"]').forEach(rewriteAppLink);
    }
  }

  rewriteAppLinks(document);

  new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.type === "attributes") rewriteAppLinks(mutation.target);
      mutation.addedNodes.forEach(function (node) {
        if (node.nodeType === Node.ELEMENT_NODE) rewriteAppLinks(node);
      });
    });
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["href"],
    childList: true,
    subtree: true
  });
}());
