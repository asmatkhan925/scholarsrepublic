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
  blackGreen: "#041f18",
  gold: "#d7a642",
  softGold: "#f5ead0",
  softGreen: "#e8f2ec",
  muted: "#60766d",
  ink: "#17342a",
};

type Family =
  | "closing_light"
  | "closing_dark"
  | "closing_kinetic"
  | "prepare"
  | "spotlight"
  | "legacy";

type Variant = {
  key: string;
  family: Family;
  base: string;
  ink: string;
  muted: string;
  accent: string;
  pill: string;
  pillText: string;
  card: string;
  brandText: string;
};

export function SocialReel(props: ReelProps) {
  const scenes = props.scenes?.length ? props.scenes.slice(0, 5) : fallbackScenes(props);
  const { fps, durationInFrames } = useVideoConfig();
  const variant = getVariant(props.templateKey, props.reelType);
  let frameStart = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: variant.base, fontFamily: "Arial, Helvetica, sans-serif" }}>
      <TemplateBackground variant={variant} />
      {variant.family !== "closing_dark" ? <Brand variant={variant} /> : null}
      {scenes.map((scene, index) => {
        const duration = Math.max(1, Math.round((scene.duration || 1.5) * fps));
        const sequence = (
          <Sequence key={`${scene.title}-${index}`} from={frameStart} durationInFrames={duration}>
            <Scene scene={scene} index={index} total={scenes.length} variant={variant} />
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

function getVariant(templateKey: string, reelType: ReelProps["reelType"]): Variant {
  if (templateKey === "closing_soon_dark_premium_v1" || templateKey === "closing_soon_dark_accent_v1") {
    return {
      key: templateKey,
      family: "closing_dark",
      base: colors.deepPine,
      ink: "#fffdf8",
      muted: "rgba(255,253,248,0.72)",
      accent: colors.gold,
      pill: colors.gold,
      pillText: colors.deepPine,
      card: colors.paper,
      brandText: "#fffdf8",
    };
  }
  if (templateKey === "closing_soon_minimal_kinetic_v1") {
    return {
      key: templateKey,
      family: "closing_kinetic",
      base: "#fffdf8",
      ink: colors.deepPine,
      muted: colors.muted,
      accent: colors.gold,
      pill: colors.pine,
      pillText: "#ffffff",
      card: "transparent",
      brandText: colors.deepPine,
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
      ink: colors.ink,
      muted: colors.muted,
      accent: "#cfa44c",
      pill: colors.pine,
      pillText: "#ffffff",
      card: "#fffef9",
      brandText: colors.pine,
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
      ink: colors.ink,
      muted: colors.muted,
      accent: colors.gold,
      pill: colors.deepPine,
      pillText: "#ffffff",
      card: "#fffefb",
      brandText: colors.pine,
    };
  }
  return {
    key: templateKey,
    family: templateKey === "closing_soon_elegant_light_v1" ? "closing_light" : "legacy",
    base: colors.cream,
    ink: colors.ink,
    muted: colors.muted,
    accent: colors.gold,
    pill: colors.gold,
    pillText: colors.deepPine,
    card: colors.paper,
    brandText: colors.pine,
  };
}

function TemplateBackground({ variant }: { variant: Variant }) {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 42) * 28;
  if (variant.family === "closing_dark") {
    return (
      <AbsoluteFill>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, #031a14 0%, #083729 54%, #0f4f3a 100%)" }} />
        <Shape left={760 + drift} top={150} width={440} height={150} color="rgba(215,166,66,0.16)" rotate={-15} />
        <Shape left={-180 - drift} top={1250} width={620} height={210} color="rgba(255,253,248,0.07)" rotate={18} />
        <div style={{ position: "absolute", left: 72, top: 84, color: colors.paper, fontSize: 38, fontWeight: 900 }}>
          Scholars Republic
        </div>
      </AbsoluteFill>
    );
  }
  if (variant.family === "closing_kinetic") {
    return (
      <AbsoluteFill>
        <div style={{ position: "absolute", inset: 0, background: "#fffdf8" }} />
        <div style={{ position: "absolute", left: 0, top: 0, width: 34, height: "100%", background: colors.pine }} />
        <Shape left={706 + drift} top={244} width={430} height={74} color="rgba(15,79,58,0.12)" rotate={-8} />
        <Shape left={-96 - drift} top={1350} width={390} height={66} color="rgba(215,166,66,0.24)" rotate={12} />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            variant.family === "prepare"
              ? "linear-gradient(180deg, #0f4f3a 0%, #0f4f3a 12%, #fbf8f0 12%, #fbf8f0 88%, #083729 88%, #083729 100%)"
              : "linear-gradient(180deg, #083729 0%, #0f4f3a 15%, #fbf7ee 15%, #fbf7ee 84%, #083729 84%, #083729 100%)",
        }}
      />
      <Shape left={710 + drift} top={230} width={420} height={150} color="rgba(245,234,208,0.86)" rotate={-12} />
      <Shape left={-190 - drift} top={1190} width={520} height={190} color="rgba(232,242,236,0.92)" rotate={14} />
      <div
        style={{
          position: "absolute",
          left: 82,
          right: 82,
          top: 282,
          bottom: 334,
          borderRadius: variant.family === "prepare" ? 30 : 44,
          background: variant.card,
          boxShadow: "0 32px 80px rgba(23,52,42,0.18)",
          border: "3px solid #eadfc9",
        }}
      />
      {variant.family === "prepare" ? <ChecklistRail /> : null}
    </AbsoluteFill>
  );
}

function ChecklistRail() {
  return (
    <div style={{ position: "absolute", left: 130, top: 380, width: 70, height: 1040 }}>
      {[0, 1, 2, 3].map((item) => (
        <div
          key={item}
          style={{
            position: "absolute",
            top: item * 246,
            width: 46,
            height: 46,
            borderRadius: 10,
            border: `5px solid ${colors.gold}`,
          }}
        />
      ))}
    </div>
  );
}

function Shape({
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
        borderRadius: 40,
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
          borderRadius: variant.family === "closing_kinetic" ? 0 : 8,
          background: variant.family === "closing_kinetic" ? "transparent" : "#ffffff",
          color: variant.brandText,
          fontWeight: 900,
          fontSize: 38,
          letterSpacing: 0,
          border: variant.family === "closing_kinetic" ? "0" : "2px solid #eadfc9",
        }}
      >
        Scholars Republic
      </div>
      <div
        style={{
          position: "absolute",
          left: 106,
          top: 168,
          width: variant.family === "closing_kinetic" ? 310 : 240,
          height: 16,
          borderRadius: 8,
          background: variant.accent,
        }}
      />
    </>
  );
}

function Scene({
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
  if (variant.family === "closing_dark") {
    return <DarkScene scene={scene} />;
  }
  if (variant.family === "closing_kinetic") {
    return <KineticScene scene={scene} variant={variant} />;
  }
  return <CardScene scene={scene} index={index} total={total} variant={variant} />;
}

function CardScene({
  scene,
  index,
  variant,
}: {
  scene: ReelScene;
  index: number;
  total: number;
  variant: Variant;
}) {
  const type = scene.scene_type || "scholarship";
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 20, stiffness: 95 } });
  const blocks = scene.blocks || [];
  if (type === "hook") {
    if (variant.family === "closing_light") {
      return <ElegantLightHook scene={scene} variant={variant} enter={enter} frame={frame} />;
    }
    return (
      <AbsoluteFill>
        <Badge top={452} variant={variant}>{scene.label || "Scholarship update"}</Badge>
        <Title y={760 - (1 - enter) * 66} size={98} variant={variant}>{scene.title}</Title>
        <Subtitle y={1048} opacity={fade(frame, 8, 22)} variant={variant}>
          {scene.subheadline || scene.blocks?.[0] || "Scholarships to review"}
        </Subtitle>
        <Pill top={1248} opacity={fade(frame, 10, 24)} variant={variant}>ScholarsRepublic.org</Pill>
      </AbsoluteFill>
    );
  }
  if (type === "cta") {
    return (
      <AbsoluteFill>
        <div style={{ transform: `scale(${0.94 + enter * 0.06})`, opacity: enter }}>
          <Title y={790} size={84} variant={variant}>{scene.title}</Title>
          <Pill top={1054} variant={variant}>{scene.subheadline || "Official links on Scholars Republic"}</Pill>
          <Subtitle y={1348} variant={variant}>{blocks[blocks.length - 1] || "ScholarsRepublic.org"}</Subtitle>
        </div>
      </AbsoluteFill>
    );
  }
  const badge = spring({ frame: Math.max(0, frame - 4), fps, config: { damping: 10, stiffness: 160 } });
  const deadlinePulse = interpolate(frame, [18, 27, 36], [1, 1.05, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 128,
          top: 382,
          width: 156,
          height: 156,
          borderRadius: 40,
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
        {scene.rank || index}
      </div>
      <Badge top={408} left={328} width={490} variant={variant}>{scene.label || "Scholarship"}</Badge>
      <div style={{ transform: `translateY(${(1 - enter) * 84}px)`, opacity: enter }}>
        {variant.family === "closing_light" ? (
          <ScholarshipTitle top={668} variant={variant}>{scene.title}</ScholarshipTitle>
        ) : (
          <Title y={800} size={variant.family === "spotlight" ? 78 : 72} variant={variant}>{scene.title}</Title>
        )}
        {blocks[0] ? <Subtitle y={1116} variant={variant}>{blocks[0]}</Subtitle> : null}
        {blocks[1] ? <Pill top={1236} scale={deadlinePulse} variant={variant}>{blocks[1]}</Pill> : null}
        {scene.action_line ? <ActionLine top={1386} variant={variant}>{scene.action_line}</ActionLine> : null}
      </div>
      <Footer variant={variant} />
    </AbsoluteFill>
  );
}

function ElegantLightHook({
  scene,
  variant,
  enter,
  frame,
}: {
  scene: ReelScene;
  variant: Variant;
  enter: number;
  frame: number;
}) {
  const lineWidth = interpolate(frame, [8, 24], [0, 560], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <Badge top={438} variant={variant}>Closing soon</Badge>
      <div style={{ transform: `translateY(${(1 - enter) * 58}px)`, opacity: enter }}>
        <Title y={748} size={106} variant={variant}>{scene.title}</Title>
        <div
          style={{
            position: "absolute",
            left: 220,
            top: 948,
            width: lineWidth,
            height: 16,
            borderRadius: 8,
            background: colors.gold,
          }}
        />
        <Subtitle y={1066} opacity={fade(frame, 8, 22)} variant={variant}>
          {scene.subheadline || "Check these before the deadline"}
        </Subtitle>
        <Pill top={1256} opacity={fade(frame, 12, 26)} variant={variant}>ScholarsRepublic.org</Pill>
      </div>
    </AbsoluteFill>
  );
}

function DarkScene({ scene }: { scene: ReelScene }) {
  const type = scene.scene_type || "scholarship";
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 92 } });
  const blocks = scene.blocks || [];
  if (type === "hook") {
    const lineWidth = interpolate(frame, [4, 26], [0, 690], { extrapolateRight: "clamp" });
    return (
      <AbsoluteFill>
        <div style={{ position: "absolute", left: 112, top: 530, width: lineWidth, height: 14, background: colors.gold }} />
        <div style={{ transform: `translateX(${(1 - enter) * -90}px)`, opacity: enter }}>
          <DarkTitle top={690} size={112}>{scene.title}</DarkTitle>
          <DarkSub top={1034}>{scene.subheadline || "3 scholarships to check today"}</DarkSub>
        </div>
        <DarkWebsite />
      </AbsoluteFill>
    );
  }
  if (type === "cta") {
    return (
      <AbsoluteFill>
        <DarkTitle top={690} size={98}>{scene.title}</DarkTitle>
        <div style={{ position: "absolute", left: 120, right: 120, top: 1056, color: colors.gold, fontSize: 46, fontWeight: 900, textAlign: "center" }}>
          {scene.subheadline || "Official links on Scholars Republic"}
        </div>
        <DarkWebsite large />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 104,
          right: 104,
          top: 382 + (1 - enter) * 80,
          minHeight: 970,
          borderRadius: 34,
          background: colors.paper,
          boxShadow: "0 44px 110px rgba(0,0,0,0.38)",
          opacity: enter,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 146,
          top: 438,
          width: 132,
          height: 132,
          borderRadius: 26,
          background: colors.gold,
          color: colors.deepPine,
          fontSize: 58,
          fontWeight: 950,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${enter})`,
        }}
      >
        {scene.rank || "01"}
      </div>
      <div style={{ position: "absolute", left: 318, right: 150, top: 462, color: colors.pine, fontSize: 28, fontWeight: 950, textTransform: "uppercase" }}>
        {scene.label || "Deadline"}
      </div>
      <div style={{ position: "absolute", left: 148, right: 148, top: 690, color: colors.ink, fontSize: 74, lineHeight: 1.06, fontWeight: 950, textAlign: "left" }}>
        {scene.title}
      </div>
      {blocks[0] ? (
        <div style={{ position: "absolute", left: 150, right: 150, top: 1008, color: colors.muted, fontSize: 42, fontWeight: 800 }}>
          {blocks[0]}
        </div>
      ) : null}
      {blocks[1] ? (
        <div style={{ position: "absolute", left: 150, right: 150, top: 1162, minHeight: 118, borderRadius: 18, background: colors.gold, color: colors.deepPine, fontSize: 40, fontWeight: 950, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {blocks[1]}
        </div>
      ) : null}
      {scene.action_line ? (
        <div style={{ position: "absolute", left: 150, right: 150, top: 1338, color: colors.pine, fontSize: 30, fontWeight: 950, textAlign: "center" }}>
          {scene.action_line}
        </div>
      ) : null}
    </AbsoluteFill>
  );
}

function KineticScene({ scene, variant }: { scene: ReelScene; variant: Variant }) {
  const type = scene.scene_type || "scholarship";
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 17, stiffness: 88 } });
  const underline = interpolate(frame, [8, 28], [0, 760], { extrapolateRight: "clamp" });
  const blocks = scene.blocks || [];
  if (type === "hook") {
    return (
      <AbsoluteFill>
        <div style={{ transform: `translateY(${(1 - enter) * 96}px)`, opacity: enter }}>
          <KineticTitle top={610} size={122}>{scene.title}</KineticTitle>
          <div style={{ position: "absolute", left: 130, top: 1038, width: underline, height: 18, background: colors.gold }} />
          <div style={{ position: "absolute", left: 130, right: 130, top: 1108, color: colors.muted, fontSize: 44, fontWeight: 800 }}>
            {scene.subheadline || "3 scholarships to check today"}
          </div>
        </div>
      </AbsoluteFill>
    );
  }
  if (type === "cta") {
    return (
      <AbsoluteFill>
        <KineticTitle top={700} size={96}>{scene.title}</KineticTitle>
        <div style={{ position: "absolute", left: 130, top: 1038, width: underline, height: 18, background: colors.gold }} />
        <div style={{ position: "absolute", left: 130, right: 130, top: 1194, color: colors.pine, fontSize: 52, fontWeight: 950 }}>
          ScholarsRepublic.org
        </div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 78, top: 330, color: "rgba(15,79,58,0.08)", fontSize: 320, fontWeight: 950, lineHeight: 1 }}>
        {scene.rank || "01"}
      </div>
      <div style={{ position: "absolute", left: 132, top: 418, color: colors.gold, fontSize: 42, fontWeight: 950 }}>
        {scene.rank || "01"} / {scene.label || "Scholarship"}
      </div>
      <div style={{ transform: `translateX(${(1 - enter) * 90}px)`, opacity: enter }}>
        <KineticTitle top={652} size={78}>{scene.title}</KineticTitle>
        {blocks[0] ? (
          <div style={{ position: "absolute", left: 132, right: 132, top: 1028, color: colors.muted, fontSize: 44, fontWeight: 850 }}>
            {blocks[0]}
          </div>
        ) : null}
        {blocks[1] ? <Pill top={1164} variant={variant}>{blocks[1]}</Pill> : null}
        {scene.action_line ? (
          <div style={{ position: "absolute", left: 132, right: 132, top: 1356, color: colors.pine, fontSize: 32, fontWeight: 950 }}>
            {scene.action_line}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
}

function DarkTitle({ children, top, size }: { children: React.ReactNode; top: number; size: number }) {
  return (
    <div style={{ position: "absolute", left: 112, right: 112, top, color: colors.paper, fontSize: size, lineHeight: 1.02, fontWeight: 950, textAlign: "left" }}>
      {children}
    </div>
  );
}

function DarkSub({ children, top }: { children: React.ReactNode; top: number }) {
  return (
    <div style={{ position: "absolute", left: 112, right: 112, top, color: "rgba(255,253,248,0.72)", fontSize: 48, lineHeight: 1.16, fontWeight: 800 }}>
      {children}
    </div>
  );
}

function DarkWebsite({ large = false }: { large?: boolean }) {
  return (
    <div style={{ position: "absolute", left: 112, right: 112, bottom: large ? 438 : 318, color: colors.gold, fontSize: large ? 62 : 38, fontWeight: 950, textAlign: large ? "center" : "left" }}>
      ScholarsRepublic.org
    </div>
  );
}

function KineticTitle({ children, top, size }: { children: React.ReactNode; top: number; size: number }) {
  return (
    <div style={{ position: "absolute", left: 132, right: 118, top, color: colors.deepPine, fontSize: size, lineHeight: 1.02, fontWeight: 950, textAlign: "left", textWrap: "balance" }}>
      {children}
    </div>
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
        background: variant.family === "prepare" ? colors.softGreen : "#f5ead0",
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

function ScholarshipTitle({
  children,
  top,
  variant,
}: {
  children: React.ReactNode;
  top: number;
  variant: Variant;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: 142,
        right: 142,
        top,
        minHeight: 186,
        color: variant.ink,
        fontWeight: 950,
        fontSize: 64,
        lineHeight: 1.1,
        textAlign: "center",
        display: "-webkit-box",
        WebkitBoxOrient: "vertical",
        WebkitLineClamp: 2,
        overflow: "hidden",
        textOverflow: "ellipsis",
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
        borderRadius: variant.family === "closing_kinetic" ? 16 : 54,
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
        background: variant.family === "spotlight" ? colors.softGold : colors.softGreen,
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
          height: variant.family === "closing_kinetic" ? 10 : 18,
          borderRadius: 12,
          background: variant.family === "closing_dark" ? "rgba(255,253,248,0.20)" : "#e7ded1",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 72,
          bottom: 114,
          width,
          height: variant.family === "closing_kinetic" ? 10 : 18,
          borderRadius: 12,
          background: variant.accent,
        }}
      />
    </>
  );
}

function fade(frame: number, start: number, end: number) {
  return interpolate(frame, [start, end], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
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
