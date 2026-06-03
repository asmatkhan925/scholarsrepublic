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
  let frameStart = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.cream, fontFamily: "Arial, Helvetica, sans-serif" }}>
      <AnimatedBackground />
      <Brand />
      {scenes.map((scene, index) => {
        const duration = Math.max(1, Math.round((scene.duration || 1.5) * fps));
        const sequence = (
          <Sequence key={`${scene.title}-${index}`} from={frameStart} durationInFrames={duration}>
            <SceneCard scene={scene} index={index} total={scenes.length} />
          </Sequence>
        );
        frameStart += duration;
        return sequence;
      })}
      <Progress totalFrames={durationInFrames} />
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

function AnimatedBackground() {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 36) * 36;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(170deg, #083729 0%, #0f4f3a 13%, #fbf7ee 31%, #fbf7ee 100%)",
        }}
      />
      <FloatingBlob left={760 + drift} top={170} size={560} color="rgba(232, 242, 236, 0.82)" />
      <FloatingBlob left={-230 - drift} top={1160} size={610} color="rgba(245, 234, 208, 0.88)" />
      <FloatingBlob left={770 - drift / 2} top={1280} size={360} color="rgba(237, 247, 242, 0.92)" />
      <div
        style={{
          position: "absolute",
          left: 88,
          right: 88,
          top: 284,
          bottom: 346,
          borderRadius: 64,
          background: colors.paper,
          boxShadow: `0 32px 80px ${colors.shadow}`,
          border: "3px solid #eadfc9",
        }}
      />
    </AbsoluteFill>
  );
}

function FloatingBlob({ left, top, size, color }: { left: number; top: number; size: number; color: string }) {
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: size,
        height: size,
        borderRadius: size,
        background: color,
        filter: "blur(1px)",
      }}
    />
  );
}

function Brand() {
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 72,
          top: 78,
          padding: "18px 34px",
          borderRadius: 42,
          background: "#ffffff",
          color: colors.pine,
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
          borderRadius: 12,
          background: colors.gold,
        }}
      />
    </>
  );
}

function SceneCard({ scene, index, total }: { scene: ReelScene; index: number; total: number }) {
  const type = scene.scene_type || "scholarship";
  if (type === "hook") {
    return <HookScene scene={scene} />;
  }
  if (type === "cta") {
    return <CtaScene scene={scene} />;
  }
  return <ScholarshipScene scene={scene} index={index} total={total} />;
}

function HookScene({ scene }: { scene: ReelScene }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headline = spring({ frame, fps, config: { damping: 18, stiffness: 90 } });
  const subOpacity = interpolate(frame, [8, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <Badge top={452}>{scene.label || "Scholarship update"}</Badge>
      <Title y={790 - (1 - headline) * 74}>{scene.title}</Title>
      <Subtitle y={1048} opacity={subOpacity}>
        {scene.subheadline || scene.blocks?.[0] || "Scholarships to review"}
      </Subtitle>
      <Pill top={1248} opacity={subOpacity}>ScholarsRepublic.org</Pill>
    </AbsoluteFill>
  );
}

function ScholarshipScene({ scene }: { scene: ReelScene; index: number; total: number }) {
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
          background: colors.pine,
          transform: `scale(${badge})`,
          color: "#fff",
          fontSize: 68,
          fontWeight: 900,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {rank}
      </div>
      <Badge top={408} left={328} width={490}>{scene.label || "Scholarship"}</Badge>
      <div style={{ transform: `translateY(${(1 - card) * 84}px)`, opacity: card }}>
        <Title y={800} size={70}>{scene.title}</Title>
        {blocks[0] ? <Subtitle y={1116}>{blocks[0]}</Subtitle> : null}
        {blocks[1] ? (
          <Pill top={1236} scale={deadlinePulse}>{blocks[1]}</Pill>
        ) : null}
        {scene.action_line ? <ActionLine top={1386}>{scene.action_line}</ActionLine> : null}
      </div>
      <Footer />
    </AbsoluteFill>
  );
}

function CtaScene({ scene }: { scene: ReelScene }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const zoom = spring({ frame, fps, config: { damping: 18, stiffness: 80 } });
  const blocks = scene.blocks || [];
  return (
    <AbsoluteFill>
      <div style={{ transform: `scale(${0.94 + zoom * 0.06})`, opacity: zoom }}>
        <Title y={790} size={80}>{scene.title}</Title>
        <Pill top={1054}>{scene.subheadline || "Official links on Scholars Republic"}</Pill>
        <Subtitle y={1348}>{blocks[blocks.length - 1] || "ScholarsRepublic.org"}</Subtitle>
      </div>
    </AbsoluteFill>
  );
}

function Badge({
  children,
  top,
  left = 218,
  width = 644,
}: {
  children: React.ReactNode;
  top: number;
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
        background: "#f5ead0",
        color: colors.pine,
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
  size = 88,
}: {
  children: React.ReactNode;
  y: number;
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
        color: colors.ink,
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

function Subtitle({ children, y, opacity = 1 }: { children: React.ReactNode; y: number; opacity?: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 150,
        right: 150,
        top: y - 38,
        color: colors.muted,
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
  opacity = 1,
  scale = 1,
}: {
  children: React.ReactNode;
  top: number;
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
        background: colors.deepPine,
        color: "#ffffff",
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

function ActionLine({ children, top }: { children: React.ReactNode; top: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 238,
        right: 238,
        top,
        minHeight: 80,
        borderRadius: 42,
        background: "#e8f2ec",
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

function Footer() {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 246,
        color: colors.muted,
        fontSize: 30,
        fontWeight: 700,
        textAlign: "center",
      }}
    >
      ScholarsRepublic.org
    </div>
  );
}

function Progress({ totalFrames }: { totalFrames: number }) {
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
          background: "#e7ded1",
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
          background: colors.gold,
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
