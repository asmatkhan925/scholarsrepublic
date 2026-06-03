import React from "react";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type ReelScene = {
  scene_type?: "hook" | "scholarship" | "cta" | string;
  title?: string;
  subheadline?: string;
  blocks?: string[];
  label?: string;
  rank?: string | number | null;
  action_line?: string;
  duration?: number;
};

export type ReelProps = {
  title: string;
  reelType: "closing_soon" | "prepare_early" | "single_scholarship" | "collection";
  templateKey: string;
  scenes: ReelScene[];
  durationSeconds: number;
};

const colors = {
  cream: "#fbf7ee",
  paper: "#fffdf8",
  pine: "#0f4f3a",
  deepPine: "#083729",
  gold: "#d7a642",
  muted: "#60766d",
  ink: "#17342a",
  shadow: "rgba(23, 52, 42, 0.18)",
};

export function SocialReel(props: ReelProps) {
  const scenes = props.scenes?.length ? props.scenes.slice(0, 5) : fallbackScenes(props);
  const { fps, durationInFrames } = useVideoConfig();
  const variant = getVariant(props.templateKey, props.reelType);
  let frameStart = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: variant.base, fontFamily: "Arial, Helvetica, sans-serif" }}>
      <AnimatedBackground variant={variant} />
      <Brand variant={variant} />
      {scenes.map((scene, index) => {
        const duration = Math.max(1, Math.round((scene.duration || 1.5) * fps));
        const sequence = (
          <Sequence key={`${scene.title}-${index}`} from={frameStart} durationInFrames={duration}>
            <SceneCard scene={scene} index={index} total={scenes.length} variant={variant} />
          </Sequence>
        );
        frameStart += duration;
        return sequence;
      })}
      <Progress totalFrames={durationInFrames} variant={variant} />
    </AbsoluteFill>
  );
}

export function ClosingSoonPremium(props: ReelProps) {
  return <SocialReel {...props} reelType="closing_soon" templateKey="closing_soon_premium_v3" />;
}

export function PrepareEarlyPremium(props: ReelProps) {
  return <SocialReel {...props} reelType="prepare_early" templateKey="prepare_early_premium_v3" />;
}

export function SingleScholarshipPremium(props: ReelProps) {
  return (
    <SocialReel
      {...props}
      reelType="single_scholarship"
      templateKey="single_scholarship_premium_v3"
    />
  );
}

type Variant = {
  key: string;
  family: "elegant" | "dark" | "prepare" | "spotlight" | "legacy";
  base: string;
  card: string;
  ink: string;
  muted: string;
  pill: string;
  pillText: string;
  accent: string;
  brandBg: string;
  brandText: string;
  shadow: string;
};

function getVariant(templateKey: string, reelType: ReelProps["reelType"]): Variant {
  if (templateKey === "closing_soon_dark_v1" || templateKey === "closing_soon_dark_accent_v1") {
    return {
      key: templateKey,
      family: "dark",
      base: colors.deepPine,
      card: colors.paper,
      ink: colors.ink,
      muted: colors.muted,
      pill: colors.gold,
      pillText: colors.deepPine,
      accent: colors.gold,
      brandBg: "rgba(255,253,248,0.96)",
      brandText: colors.deepPine,
      shadow: "rgba(0,0,0,0.28)",
    };
  }
  if (
    templateKey === "prepare_early_elegant_v1" ||
    templateKey === "prepare_early_premium_v31" ||
    reelType === "prepare_early"
  ) {
    return {
      key: templateKey,
      family: "prepare",
      base: "#fbf8f0",
      card: "#fffef9",
      ink: colors.ink,
      muted: colors.muted,
      pill: colors.pine,
      pillText: "#ffffff",
      accent: "#cfa44c",
      brandBg: "#ffffff",
      brandText: colors.pine,
      shadow: "rgba(23,52,42,0.14)",
    };
  }
  if (
    templateKey === "single_spotlight_elegant_v1" ||
    templateKey === "single_scholarship_spotlight_v1" ||
    reelType === "single_scholarship"
  ) {
    return {
      key: templateKey,
      family: "spotlight",
      base: colors.cream,
      card: "#fffefb",
      ink: colors.ink,
      muted: colors.muted,
      pill: colors.deepPine,
      pillText: "#ffffff",
      accent: colors.gold,
      brandBg: "#ffffff",
      brandText: colors.pine,
      shadow: "rgba(23,52,42,0.18)",
    };
  }
  return {
    key: templateKey,
    family: templateKey === "closing_soon_elegant_v1" ? "elegant" : "legacy",
    base: colors.cream,
    card: colors.paper,
    ink: colors.ink,
    muted: colors.muted,
    pill: colors.gold,
    pillText: colors.deepPine,
    accent: colors.gold,
    brandBg: "#ffffff",
    brandText: colors.pine,
    shadow: colors.shadow,
  };
}

function AnimatedBackground({ variant }: { variant: Variant }) {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 48) * 24;
  const dark = variant.family === "dark";
  const prepare = variant.family === "prepare";
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: dark
            ? "linear-gradient(165deg, #05291f 0%, #0b3c2d 48%, #0f4f3a 100%)"
            : prepare
              ? "linear-gradient(180deg, #0d4936 0%, #0f4f3a 14%, #fbf8f0 14%, #fbf8f0 86%, #0f4f3a 86%, #083729 100%)"
              : "linear-gradient(180deg, #083729 0%, #0f4f3a 15%, #fbf7ee 15%, #fbf7ee 84%, #0f4f3a 84%, #083729 100%)",
        }}
      />
      <FloatingShape left={714 + drift} top={224} width={420} height={156} color={dark ? "rgba(215,166,66,0.16)" : "rgba(245,234,208,0.82)"} rotate={-12} />
      <FloatingShape left={-190 - drift} top={1170} width={520} height={190} color={dark ? "rgba(255,253,248,0.08)" : "rgba(232,242,236,0.92)"} rotate={14} />
      <FloatingShape left={760 - drift / 2} top={1394} width={360} height={128} color={dark ? "rgba(255,255,255,0.06)" : "rgba(245,234,208,0.72)"} rotate={-8} />
      {variant.family === "legacy" ? <StackBackplates /> : null}
      <div
        style={{
          position: "absolute",
          left: dark ? 94 : 82,
          right: dark ? 94 : 82,
          top: dark ? 302 : 282,
          bottom: dark ? 332 : 334,
          borderRadius: 44,
          background: variant.card,
          boxShadow: `0 32px 80px ${variant.shadow}`,
          border: `3px solid ${dark ? "rgba(245,234,208,0.9)" : "#eadfc9"}`,
        }}
      />
    </AbsoluteFill>
  );
}

function StackBackplates() {
  return (
    <>
      <div style={{ position: "absolute", left: 78, top: 370, width: 850, height: 1160, borderRadius: 60, background: "rgba(15,79,58,0.12)" }} />
      <div style={{ position: "absolute", left: 100, top: 344, width: 850, height: 1160, borderRadius: 60, background: "rgba(215,166,66,0.18)" }} />
    </>
  );
}

function FloatingShape({
  left,
  top,
  width,
  height,
  color,
  rotate,
}: {
  left: number;
  top: number;
  width: number;
  height: number;
  color: string;
  rotate: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width,
        height,
        borderRadius: 42,
        background: color,
        transform: `rotate(${rotate}deg)`,
      }}
    />
  );
}

function Brand({ variant }: { variant: Variant }) {
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 72,
          top: 78,
          padding: "18px 34px",
          borderRadius: 8,
          background: variant.brandBg,
          color: variant.brandText,
          fontWeight: 800,
          fontSize: 39,
          letterSpacing: 0,
          border: "2px solid #eadfc9",
        }}
      >
        Scholars Republic
      </div>
      <div
        style={{
          position: "absolute",
          left: 106,
          top: 168,
          width: 240,
          height: 16,
          borderRadius: 8,
          background: variant.accent,
        }}
      />
    </>
  );
}

function SceneCard({
  scene,
  index,
  total,
  variant,
}: {
  scene: ReelScene;
  index: number;
  total: number;
  variant: Variant;
}) {
  const type = scene.scene_type || "scholarship";
  if (type === "hook") {
    return <HookScene scene={scene} variant={variant} />;
  }
  if (type === "cta") {
    return <CtaScene scene={scene} variant={variant} />;
  }
  return <ScholarshipScene scene={scene} index={index} total={total} variant={variant} />;
}

function HookScene({ scene, variant }: { scene: ReelScene; variant: Variant }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headline = spring({ frame, fps, config: { damping: 18, stiffness: 90 } });
  const subOpacity = interpolate(frame, [8, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <Badge top={452} variant={variant}>{scene.label || "Scholarship update"}</Badge>
      <Title y={760 - (1 - headline) * 66} size={variant.family === "spotlight" ? 96 : 98} variant={variant}>{scene.title}</Title>
      <Subtitle y={1048} opacity={subOpacity} variant={variant}>
        {scene.subheadline || scene.blocks?.[0] || "Scholarships to review"}
      </Subtitle>
      <Pill top={1248} opacity={subOpacity} variant={variant}>ScholarsRepublic.org</Pill>
    </AbsoluteFill>
  );
}

function ScholarshipScene({
  scene,
  variant,
}: {
  scene: ReelScene;
  index: number;
  total: number;
  variant: Variant;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const card = spring({ frame, fps, config: { damping: 20, stiffness: 95 } });
  const badge = spring({ frame: Math.max(0, frame - 4), fps, config: { damping: 10, stiffness: 160 } });
  const deadlinePulse = interpolate(frame, [18, 27, 36], [1, 1.04, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const blocks = scene.blocks || [];
  const rank = scene.rank || "01";
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 128,
          top: 382,
          width: 156,
          height: 156,
          borderRadius: 48,
          background: variant.family === "dark" || variant.family === "legacy" ? colors.gold : colors.pine,
          transform: `scale(${badge})`,
          color: variant.family === "dark" || variant.family === "legacy" ? colors.deepPine : "#fff",
          fontSize: 68,
          fontWeight: 900,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {rank}
      </div>
      <Badge top={408} left={328} width={490} variant={variant}>{scene.label || "Scholarship"}</Badge>
      <div style={{ transform: `translateY(${(1 - card) * 84}px)`, opacity: card }}>
        <Title y={variant.family === "legacy" ? 790 : 800} size={variant.family === "spotlight" ? 78 : 72} variant={variant}>{scene.title}</Title>
        {blocks[0] ? <Subtitle y={1116} variant={variant}>{blocks[0]}</Subtitle> : null}
        {blocks[1] ? (
          <Pill top={1236} scale={deadlinePulse} variant={variant}>{blocks[1]}</Pill>
        ) : null}
        {scene.action_line ? <ActionLine top={1386} variant={variant}>{scene.action_line}</ActionLine> : null}
      </div>
      <Footer variant={variant} />
    </AbsoluteFill>
  );
}

function CtaScene({ scene, variant }: { scene: ReelScene; variant: Variant }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const zoom = spring({ frame, fps, config: { damping: 18, stiffness: 80 } });
  const blocks = scene.blocks || [];
  return (
    <AbsoluteFill>
      <div style={{ transform: `scale(${0.94 + zoom * 0.06})`, opacity: zoom }}>
        <Title y={790} size={84} variant={variant}>{scene.title}</Title>
        <Pill top={1054} variant={variant}>{scene.subheadline || "Official links on Scholars Republic"}</Pill>
        <Subtitle y={1348} variant={variant}>{blocks[blocks.length - 1] || "ScholarsRepublic.org"}</Subtitle>
      </div>
    </AbsoluteFill>
  );
}

function Badge({
  children,
  top,
  variant,
  left = 218,
  width = 644,
}: {
  children: React.ReactNode;
  top: number;
  variant: Variant;
  left?: number;
  width?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width,
        height: 86,
        borderRadius: 44,
        background: variant.family === "dark" ? "rgba(255,253,248,0.94)" : "#f5ead0",
        color: variant.family === "dark" ? colors.deepPine : colors.pine,
        fontWeight: 900,
        fontSize: 26,
        textTransform: "uppercase",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        letterSpacing: 1,
      }}
    >
      {children}
    </div>
  );
}

function Title({
  children,
  y,
  variant,
  size = 88,
}: {
  children: React.ReactNode;
  y: number;
  variant: Variant;
  size?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: 150,
        right: 150,
        top: y - 128,
        minHeight: 256,
        color: variant.ink,
        fontWeight: 950,
        fontSize: size,
        lineHeight: 1.06,
        textAlign: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textWrap: "balance",
      }}
    >
      {children}
    </div>
  );
}

function Subtitle({
  children,
  y,
  variant,
  opacity = 1,
}: {
  children: React.ReactNode;
  y: number;
  variant: Variant;
  opacity?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: 150,
        right: 150,
        top: y - 38,
        color: variant.muted,
        fontSize: 44,
        fontWeight: 700,
        lineHeight: 1.18,
        textAlign: "center",
        opacity,
      }}
    >
      {children}
    </div>
  );
}

function Pill({
  children,
  top,
  variant,
  opacity = 1,
  scale = 1,
}: {
  children: React.ReactNode;
  top: number;
  variant: Variant;
  opacity?: number;
  scale?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: 190,
        right: 190,
        top,
        minHeight: 100,
        borderRadius: 54,
        background: variant.pill,
        color: variant.pillText,
        fontSize: 38,
        fontWeight: 900,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        opacity,
        transform: `scale(${scale})`,
        padding: "0 36px",
      }}
    >
      {children}
    </div>
  );
}

function ActionLine({ children, top, variant }: { children: React.ReactNode; top: number; variant: Variant }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 238,
        right: 238,
        top,
        minHeight: 80,
        borderRadius: 42,
        background: variant.family === "dark" ? "rgba(255,253,248,0.92)" : "#e8f2ec",
        color: colors.pine,
        fontSize: 28,
        fontWeight: 900,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}

function Footer({ variant }: { variant: Variant }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 246,
        color: variant.muted,
        fontSize: 30,
        fontWeight: 700,
        textAlign: "center",
      }}
    >
      ScholarsRepublic.org
    </div>
  );
}

function Progress({ totalFrames, variant }: { totalFrames: number; variant: Variant }) {
  const frame = useCurrentFrame();
  const width = interpolate(frame, [0, totalFrames - 1], [0, 936], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 72,
          bottom: 114,
          width: 936,
          height: 18,
          borderRadius: 12,
          background: variant.family === "dark" ? "rgba(255,253,248,0.20)" : "#e7ded1",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 72,
          bottom: 114,
          width,
          height: 18,
          borderRadius: 12,
          background: variant.accent,
        }}
      />
    </>
  );
}

function fallbackScenes(props: ReelProps): ReelScene[] {
  return [
    {
      scene_type: "hook",
      title: props.title || "Scholarship alert",
      subheadline: "Scholars Republic",
      duration: props.durationSeconds || 5,
    },
  ];
}
