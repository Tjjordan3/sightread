(function () {
  try {
    var raw = localStorage.getItem("sightread_settings");
    if (!raw) return;
    var theme = JSON.parse(raw).theme || "auto";
    var dark =
      theme === "dark" ||
      (theme === "auto" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  } catch (e) {
    /* ignore invalid settings */
  }
})();
