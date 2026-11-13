import { Composition } from "remotion";
import { Reel } from "./Reel.jsx";

export const RemotionRoot = () => {
  return (
    <Composition
      id="CardReel"
      component={Reel}
      durationInFrames={300}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        preset: "editorial",
        channel: "",
        beats: [],
        durationInFrames: 300,
        music: "",
        narration: "",
      }}
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.max(1, Number(props.durationInFrames) || 300),
      })}
    />
  );
};
