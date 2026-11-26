(function (exports) {
  "use strict";
  const { before, after } = vendetta.patcher;
  const { findByProps, findByName } = vendetta.metro;
  const { React, ReactNative, FluxDispatcher } = vendetta.metro.common;
  const { showToast } = vendetta.ui.toasts;
  const { View, Text, Pressable } = ReactNative;

  let unpatches = [];
  let fakeOn = false;
  const listeners = new Set();
  let inVoice = false;

  const notify = () => listeners.forEach((f) => f());

  const force = (obj) => {
    if (fakeOn && obj && typeof obj === "object") {
      obj.selfDeaf = true;
      obj.selfMute = true;
    }
  };

  const onSelect = (e) => {
    inVoice = !!(e && e.channelId);
    if (!inVoice) fakeOn = false;
    notify();
  };

  const Panel = () => {
    const [, setTick] = React.useState(0);
    React.useEffect(() => {
      const f = () => setTick((n) => n + 1);
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
          onPress: () => {
            fakeOn = !fakeOn;
            notify();
            showToast(fakeOn ? "Fake Deafen: ON" : "Fake Deafen: OFF");
          },
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

    // عرض اللوحة فوق التطبيق
    let rootName = "none";
    for (const n of ["AppContainer", "App", "RootContainer"]) {
      const mod = findByName(n, false);
      if (mod && typeof mod.default === "function") {
        rootName = n;
        unpatches.push(
          after("default", mod, (args, ret) =>
            React.createElement(
              View,
              { style: { flex: 1 } },
              ret,
              React.createElement(Panel)
            )
          )
        );
        break;
      }
    }

    // تعديل حالة الصوت
    unpatches.push(
      before("dispatch", FluxDispatcher, (args) => {
        const ev = args[0];
        if (ev && ev.type === "VOICE_STATE_UPDATES" && ev.voiceStates) {
          ev.voiceStates.forEach(force);
        }
      })
    );
    let found = [];
    for (const n of ["voiceStateUpdate", "updateVoiceState", "setVoiceState"]) {
      const mod = findByProps(n);
      if (mod && typeof mod[n] === "function") {
        found.push(n);
        unpatches.push(before(n, mod, (args) => force(args[0])));
      }
    }

    showToast("UI: " + rootName + " | Found: " + (found.join(", ") || "none"));
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
