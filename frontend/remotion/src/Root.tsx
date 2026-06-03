import React from "react";
import { Composition } from "remotion";

import { SocialReel, type ReelProps } from "./Reel";

const defaultProps: ReelProps = {
  title: "Scholars Republic Reel",
  reelType: "single_scholarship",
  templateKey: "single_spotlight_elegant_v1",
  durationSeconds: 5,
  scenes: [
    {
      scene_type: "hook",
      title: "Scholarship alert",
      subheadline: "Scholars Republic",
      duration: 5,
    },
  ],
};

export function RemotionRoot() {
  return (
    <Composition
      id="scholars-republic-social-reel"
      component={SocialReel}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={150}
      defaultProps={defaultProps}
      calculateMetadata={({ props }: { props: ReelProps }) => {
        const durationSeconds = Math.max(1, Number(props.durationSeconds || 5));
        return {
          durationInFrames: Math.ceil(durationSeconds * 30),
          props,
        };
      }}
    />
  );
}
