import { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  continueRender,
  delayRender,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";

const INK = "#0b0c0f";
const JADE = "#8FE8D6";
const EASE = Easing.bezier(0.16, 1, 0.3, 1);
const TRANSITION = 12;

function Fonts() {
  const [handle] = useState(() => delayRender("cardnews-fonts"));
  useEffect(() => {
    const faces = [
      ["400", "fonts/Pretendard-Regular.woff2"],
      ["700", "fonts/Pretendard-Bold.woff2"],
      ["800", "fonts/Pretendard-ExtraBold.woff2"],
      ["900", "fonts/Pretendard-Black.woff2"],
    ].map(([weight, file]) => new FontFace("P", `url(${staticFile(file)})`, { weight }));
    faces.push(new FontFace("Noto Serif CJK KR", `url(${staticFile("fonts/noto-serif-kr-korean-700-normal.woff2")})`, { weight: "700" }));
    Promise.all(faces.map((face) => face.load().then((loaded) => document.fonts.add(loaded))))
      .catch((error) => console.error(error))
      .finally(() => continueRender(handle));
  }, [handle]);
  return null;
}

function presentationFor(preset) {
  if (preset === "kinetic") return slide({ direction: "from-bottom" });
  if (preset === "push") return slide({ direction: "from-right" });
  if (preset === "tally") return wipe();
  return fade();
}

function clampFade(frame, start, length = 10) {
  return interpolate(frame, [start, start + length], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
}

function Words({ text, start, highlight, preset }) {
  const frame = useCurrentFrame();
  const words = String(text || "").split(/\s+/).filter(Boolean);
  return (
    <div style={{ fontWeight: 800, fontSize: 64, lineHeight: 1.22, letterSpacing: "-0.035em" }}>
      {words.map((word, index) => {
        const delay = start + index * (preset === "kinetic" || preset === "tally" ? 4 : 2);
        const shown = clampFade(frame, delay, 9);
        const y = interpolate(shown, [0, 1], [26, 0]);
        const blur = preset === "kinetic" ? interpolate(shown, [0, 1], [6, 0]) : 0;
        const scale = interpolate(shown, [0, 1], [0.96, 1]);
        const isHit = highlight && index === words.length - 1;
        const draw = isHit ? clampFade(frame, delay + 4, 12) : 0;
        return (
          <span
            key={`${word}-${index}`}
            style={{
              display: "inline-block",
              marginRight: 14,
              opacity: shown,
              transform: `translateY(${y}px) scale(${scale})`,
              filter: blur > 0.2 ? `blur(${blur}px)` : undefined,
              position: "relative",
            }}
          >
            {isHit ? (
              <span
                style={{
                  position: "absolute",
                  left: -8,
                  right: -8,
                  top: "16%",
                  bottom: "10%",
                  background: JADE,
                  transform: `scaleX(${draw}) rotate(-2deg)`,
                  transformOrigin: "left center",
                  zIndex: 0,
                }}
              />
            ) : null}
            <span style={{ position: "relative", zIndex: 1, color: isHit && draw > 0.72 ? INK : "#fff" }}>{word}</span>
          </span>
        );
      })}
    </div>
  );
}

function Scene({ beat, preset }) {
  const frame = useCurrentFrame();
  const duration = Math.max(1, beat.frames || 90);
  const ken = interpolate(frame, [0, duration], [1, 1.07], { extrapolateRight: "clamp" });
  const drift = interpolate(frame, [0, duration], [10, -10], { extrapolateRight: "clamp" });
  const pan = beat.motion === "pan-right" ? interpolate(frame, [0, duration], [-24, 24]) : beat.motion === "pan-up" ? 0 : 0;
  const mask = preset === "editorial" ? interpolate(frame, [0, 16], [100, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE }) : 0;
  const rule = clampFade(frame, 4, 14);
  const countFrom = Number(beat.count);
  const hasCount = Number.isFinite(countFrom);
  const counted = hasCount
    ? Math.round(interpolate(frame, [6, Math.min(42, duration - 8)], [0, countFrom], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }))
    : 0;
  const lines = (beat.lines || []).filter(Boolean).slice(0, 2);

  return (
    <AbsoluteFill style={{ background: INK, fontFamily: "P, sans-serif", color: "#fff" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 760, height: 1160, overflow: "hidden" }}>
        {beat.image ? (
          <Img
            src={staticFile(beat.image)}
            style={{
              width: 1080,
              height: 1350,
              transform: `translate3d(${pan}px, ${drift}px, 0) scale(${ken})`,
              transformOrigin: "center 40%",
            }}
          />
        ) : (
          <div style={{ width: 1080, height: 1350, background: INK }} />
        )}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 860,
          background: `linear-gradient(180deg, ${INK} 0%, ${INK} 78%, rgba(11,12,15,0) 100%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 72,
          right: 168,
          top: 214,
          clipPath: `inset(0 ${mask}% 0 0)`,
          transform: `translateY(${drift * 0.28}px)`,
        }}
      >
        <div style={{ width: 52 * rule, height: 4, background: JADE, marginBottom: 18 }} />
        {beat.kicker ? (
          <div style={{ fontWeight: 600, fontSize: 20, letterSpacing: "0.14em", color: JADE, marginBottom: 12 }}>
            {beat.kicker}
          </div>
        ) : null}
        {hasCount ? (
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
            <div style={{ fontWeight: 900, fontSize: preset === "tally" ? 132 : 96, letterSpacing: "-0.05em", lineHeight: 0.9 }}>
              {counted.toLocaleString("ko-KR")}
            </div>
            {beat.countUnit ? (
              <div style={{ fontWeight: 700, fontSize: 28, color: JADE }}>{beat.countUnit}</div>
            ) : null}
          </div>
        ) : null}
        {lines.map((line, i) => (
          <Words
            key={line}
            text={line}
            start={8 + i * 7}
            highlight={preset === "kinetic" || preset === "tally" ? i === 0 : false}
            preset={preset}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
}

function Masthead({ channel }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ position: "absolute", left: 72, right: 168, top: 108, fontFamily: "P, sans-serif" }}>
      <div style={{ height: 4, background: "rgba(255,255,255,0.18)", borderRadius: 2 }}>
        <div style={{ width: `${progress * 100}%`, height: "100%", background: JADE }} />
      </div>
      <div
        style={{
          marginTop: 16,
          fontWeight: 600,
          fontSize: 18,
          letterSpacing: "0.16em",
          color: "rgba(255,255,255,0.72)",
        }}
      >
        {channel}
      </div>
    </div>
  );
}

export function Reel({ preset = "editorial", channel = "", beats = [], music = "", narration = "" }) {
  const items = [];
  beats.forEach((beat, i) => {
    items.push(
      <TransitionSeries.Sequence key={`s-${i}`} durationInFrames={beat.frames}>
        <Scene beat={beat} preset={preset} />
      </TransitionSeries.Sequence>,
    );
    if (i < beats.length - 1) {
      items.push(
        <TransitionSeries.Transition
          key={`t-${i}`}
          presentation={presentationFor(preset)}
          timing={linearTiming({ durationInFrames: TRANSITION })}
        />,
      );
    }
  });

  return (
    <AbsoluteFill style={{ background: INK }}>
      <Fonts />
      <TransitionSeries>{items}</TransitionSeries>
      <Masthead channel={channel} />
      {music ? <Audio src={staticFile(music)} volume={narration ? 0.2 : 0.85} /> : null}
      {narration ? <Audio src={staticFile(narration)} volume={1} /> : null}
    </AbsoluteFill>
  );
}

export const TRANSITION_FRAMES = TRANSITION;
