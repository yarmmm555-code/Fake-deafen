(function (exports) {
  "use strict";
  const { before } = vendetta.patcher;
  const { findByProps } = vendetta.metro;
  const { FluxDispatcher } = vendetta.metro.common;
  const { showConfirmationAlert } = vendetta.ui.alerts;

  let unpatch;
  let fakeOn = false;

  const onSelect = (e) => {
    if (!e || !e.channelId) {
      fakeOn = false;
      return;
    }
    showConfirmationAlert({
      title: "Fake Deafen",
      content: "Enable fake deafen?",
      confirmText: "Yes",
      cancelText: "No",
      onConfirm: () => { fakeOn = true; },
      onCancel: () => { fakeOn = false; },
    });
  };

  exports.onLoad = () => {
    FluxDispatcher.subscribe("VOICE_CHANNEL_SELECT", onSelect);
    const Gateway = findByProps("voiceStateUpdate");
    if (Gateway) {
      unpatch = before("voiceStateUpdate", Gateway, (args) => {
        if (fakeOn && args[0] && typeof args[0] === "object") {
          args[0].selfDeaf = true;
          args[0].selfMute = true;
        }
      });
    }
  };

  exports.onUnload = () => {
    FluxDispatcher.unsubscribe("VOICE_CHANNEL_SELECT", onSelect);
    if (unpatch) unpatch();
    fakeOn = false;
  };

  return exports;
})({});
