(function (exports) {
  "use strict";
  const { before, after } = vendetta.patcher;
  const { findByProps, findByName } = vendetta.metro;
  const { React, ReactNative, FluxDispatcher } = vendetta.metro.common;
  const { showToast } = vendetta.ui.toasts;
  const { View, Text, Pressable } = ReactNative;

  let unpatches = [];
  let fakeOn = false;
  let inVoice = false;
  const listeners = new Set();
  const notify = () => listeners.forEach((f) => f());

  const resend = () => {
    try {
      const V = findByProps("toggleSelfMute");
      if (!V) return;
      V.toggleSelfMute();
      setTimeout(() => V.toggleSelfMute(), 150);
    } catch (e) {}
  };

  const setFake = (v) => {
    fakeOn = v;
    notify();
    showToast(v ? "Fake Deafen: ON" : "Fake Deafen: OFF");
    resend();
  };

  const onSelect = (e) => {
    inVoice = !!(e && e.channelId);
    if (!inVoice) fakeOn = false;
    notify();
  };

  const Panel = () => {
    const [, tick] = React.useState(0);
    React.useEffect(() => {
      const f = () => tick((n) => n + 1);
      listeners.add(f);
      return () => listeners.delete(f);
    }, []);
    if (!inVoice) return null;
    return React.createElement(
      View,
      { pointerEvents: "box-none", style: { position: "absolute", left: 6, top: 220 } },
      React.createElement(
        Pressable,
        {
          onPress: () => setFake(!fakeOn),
          style: {
            backgroundColor: fakeOn ? "#ED4245" : "#2B2D31",
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 10,
            opacity: 0.92,
          },
        },
        React.createElement(
          Text,
          { style: { color: "#fff", fontSize: 12, fontWeight: "600" } },
          fakeOn ? "Fake Deafen ON" : "Fake Deafen OFF"
        )
      )
    );
  };

  exports.onLoad = () => {
    FluxDispatcher.subscribe("VOICE_CHANNEL_SELECT", onSelect);

    // اللوحة
    for (const n of ["AppContainer", "App", "RootContainer"]) {
      const mod = findByName(n, false);
      if (mod && typeof mod.default === "function") {
        unpatches.push(
          after("default", mod, (args, ret) =>
            React.createElement(View, { style: { flex: 1 } }, ret, React.createElement(Panel))
          )
        );
        break;
      }
    }

    // تعديل رسالة حالة الصوت قبل ما تنرسل للسيرفر
    unpatches.push(
      before("send", WebSocket.prototype, (args) => {
        try {
          if (!fakeOn || typeof args[0] !== "string") return;
          if (args[0].indexOf('"op":4') === -1) return;
          const p = JSON.parse(args[0]);
          if (p && p.op === 4 && p.d && p.d.channel_id) {
            p.d.self_deaf = true;
            p.d.self_mute = true;
            args[0] = JSON.stringify(p);
          }
        } catch (e) {}
      })
    );

    showToast("Fake Deafen ready");
  };

  exports.onUnload = () => {
    FluxDispatcher.unsubscribe("VOICE_CHANNEL_SELECT", onSelect);
    unpatches.forEach((u) => u());
    unpatches = [];
    fakeOn = false;
    inVoice = false;
    listeners.clear();
  };

  return exports;
})({});
