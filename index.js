(function (exports) {
  "use strict";
  const { findByProps } = vendetta.metro;
  const { showToast } = vendetta.ui.toasts;

  exports.onLoad = () => {
    const tries = [
      "setSelfDeaf",
      "toggleSelfDeaf",
      "toggleSelfMute",
      "setSelfMute",
      "selfDeaf",
      "selfMute",
      "setVoiceState",
    ];
    const found = [];
    for (const n of tries) {
      try {
        if (findByProps(n)) found.push(n);
      } catch (e) {}
    }
    showToast("Voice: " + (found.join(", ") || "none"));
  };

  exports.onUnload = () => {};
  return exports;
})({});
