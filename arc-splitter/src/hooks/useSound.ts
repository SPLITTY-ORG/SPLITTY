import { useRef } from "react";

type SoundType =
  | "click"
  | "success"
  | "error"
  | "stamp"
  | "step"
  | "tab"
  | "start"
  | "await"
  | "confirm"
  | "gateway";

export function useSound() {
  const ctx = useRef<AudioContext | null>(null);
  const muted = useRef(
    localStorage.getItem("splitty-muted") === "true" || false
  );

  const play = (type: SoundType) => {
    if (muted.current) return;
    if (!ctx.current) {
      ctx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const context = ctx.current;
    const now = context.currentTime;

    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.connect(gain);
    gain.connect(context.destination);

    let freq = 700;
    let duration = 0.06;
    let oscType: OscillatorType = "square";

    switch (type) {
      case "click":
        freq = 720;
        duration = 0.05;
        oscType = "square";
        break;
      case "success":
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.setValueAtTime(880, now + 0.09);
        osc.frequency.setValueAtTime(1180, now + 0.18);
        duration = 0.08;
        oscType = "sine";
        break;
      case "error":
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.setValueAtTime(180, now + 0.1);
        duration = 0.15;
        oscType = "sawtooth";
        break;
      case "stamp":
        freq = 220;
        duration = 0.12;
        oscType = "square";
        break;
      case "step":
        freq = 660;
        duration = 0.06;
        oscType = "sine";
        break;
      case "tab":
        freq = 500;
        duration = 0.04;
        oscType = "sine";
        break;
      case "start":
        freq = 550;
        duration = 0.06;
        oscType = "sine";
        break;
      case "await":
        freq = 600;
        duration = 0.08;
        oscType = "sine";
        break;
      case "confirm":
        freq = 750;
        duration = 0.05;
        oscType = "sine";
        break;
      case "gateway":
        freq = 480;
        duration = 0.07;
        oscType = "square";
        break;
      default:
        freq = 700;
        duration = 0.06;
        oscType = "square";
    }

    osc.type = oscType;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.start(now);
    osc.stop(now + duration + 0.01);
  };

  const setMuted = (value: boolean) => {
    muted.current = value;
    localStorage.setItem("splitty-muted", String(value));
  };

  const toggleMute = () => {
    const newVal = !muted.current;
    setMuted(newVal);
    if (!newVal) play("click");
    return newVal;
  };

  return { play, muted: muted.current, setMuted, toggleMute };
}
