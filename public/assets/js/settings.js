(function () {
  const root = document.documentElement;
  const title = localStorage.getItem("websiteTitle");
  const icon = localStorage.getItem("websiteIcon");
  const theme = localStorage.getItem("theme") || "midnight";

  root.dataset.theme = theme;

  if (title) document.title = title;

  if (icon) {
    let favicon = document.querySelector("link[rel='icon']");
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      document.head.appendChild(favicon);
    }
    favicon.href = icon;
  }

  window.OneMMUN3Settings = {
    save({ title: nextTitle, icon: nextIcon, theme: nextTheme, cloakPreset: nextPreset, cloakHost: nextHost, textCloaking }) {
      localStorage.setItem("websiteTitle", nextTitle || "1MMUN3");
      localStorage.setItem("websiteIcon", nextIcon || "/favicon.ico");
      localStorage.setItem("theme", nextTheme || "midnight");
      if (nextPreset) localStorage.setItem("websiteCloakPreset", nextPreset);
      if (nextHost) localStorage.setItem("websiteCloakHost", nextHost);
      if (typeof textCloaking === 'boolean') localStorage.setItem("textCloakingEnabled", String(textCloaking));
    },
    clear() {
      localStorage.removeItem("websiteTitle");
      localStorage.removeItem("websiteIcon");
      localStorage.removeItem("theme");
      localStorage.removeItem("autoAB");
      localStorage.removeItem("websiteCloakPreset");
      localStorage.removeItem("websiteCloakHost");
      localStorage.removeItem("textCloakingEnabled");
      localStorage.removeItem("textCloakPopupSeen");
    },
  };
})();
