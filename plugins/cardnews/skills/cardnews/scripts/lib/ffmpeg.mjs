import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function run(bin, args) {
  const result = spawnSync(bin, args, { encoding: "utf8" });
  if (result.error) {
    throw new Error(`${bin} failed to start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const tail = `${result.stderr || ""}\n${result.stdout || ""}`.trim().slice(-2000);
    throw new Error(`${bin} ${args.slice(0, 6).join(" ")} … exited ${result.status}\n${tail}`);
  }
  return result.stdout;
}

export function have(bin) {
  const result = spawnSync("bash", ["-lc", `command -v ${bin}`], { encoding: "utf8" });
  return result.status === 0 && Boolean(result.stdout.trim());
}

function motionFilter({ width, height, seconds, motion }) {
  const fps = 30;
  const frames = Math.max(1, Math.round(seconds * fps));
  const coverW = Math.round(width * 1.5);
  const coverH = Math.round(height * 1.5);
  const base = `scale=${coverW}:${coverH}:force_original_aspect_ratio=increase,crop=${coverW}:${coverH}`;
  if (motion === "pan-right" || motion === "pan-left" || motion === "pan-up" || motion === "pan-down") {
    const travelX = coverW - width;
    const travelY = coverH - height;
    const x =
      motion === "pan-right"
        ? `(${travelX})*t/${seconds}`
        : motion === "pan-left"
          ? `(${travelX})*(1-t/${seconds})`
          : String(Math.round(travelX / 2));
    const y =
      motion === "pan-down"
        ? `(${travelY})*t/${seconds}`
        : motion === "pan-up"
          ? `(${travelY})*(1-t/${seconds})`
          : String(Math.round(travelY / 2));
    return {
      vf: `${base},crop=${width}:${height}:x='${x}':y='${y}',fps=${fps},setsar=1,format=yuv420p`,
      still: false,
    };
  }
  const zoom =
    motion === "zoom-out" ? `1.12-0.12*on/${frames - 1}` : `1+0.12*on/${frames - 1}`;
  return {
    vf: [
      base,
      `zoompan=z='${zoom}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}:fps=${fps}`,
      "setsar=1",
      "format=yuv420p",
    ].join(","),
    still: false,
  };
}

export function photoMotion({ input, output, width, height, seconds, motion, crf }) {
  const { vf } = motionFilter({ width, height, seconds, motion: motion || "zoom-in" });
  run("ffmpeg", [
    "-y",
    "-loop",
    "1",
    "-i",
    input,
    "-vf",
    vf,
    "-t",
    String(seconds),
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    String(crf),
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    output,
  ]);
}

export function cutVideo({ input, output, width, height, seconds, start, crf }) {
  const vf = `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},fps=30,setsar=1,format=yuv420p`;
  const args = ["-y"];
  if (start) args.push("-ss", String(start));
  args.push(
    "-i",
    input,
    "-t",
    String(seconds),
    "-vf",
    vf,
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    String(crf),
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    output,
  );
  run("ffmpeg", args);
}

export function overlayPng({ video, png, output, crf, grain = true, preset = "fast" }) {
  const base = grain
    ? "[0:v]eq=contrast=1.04:saturation=0.96,noise=alls=7:allf=t,format=yuv420p[base];[base][1:v]overlay=0:0:format=auto,setsar=1,format=yuv420p[out]"
    : "[0:v][1:v]overlay=0:0:format=auto,setsar=1,format=yuv420p[out]";
  run("ffmpeg", [
    "-y",
    "-i",
    video,
    "-i",
    png,
    "-filter_complex",
    base,
    "-map",
    "[out]",
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    preset,
    "-crf",
    String(crf),
    "-profile:v",
    "high",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    output,
  ]);
}

export function holdStill({ image, output, seconds, crf, preset = "fast" }) {
  run("ffmpeg", [
    "-y",
    "-loop",
    "1",
    "-i",
    image,
    "-t",
    String(seconds),
    "-vf",
    "scale=1080:1350,setsar=1,fps=30,eq=contrast=1.04:saturation=0.96,noise=alls=7:allf=t,format=yuv420p",
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    preset,
    "-crf",
    String(crf),
    "-profile:v",
    "high",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    output,
  ]);
}

export function grainStill({ input, output }) {
  run("ffmpeg", [
    "-y",
    "-i",
    input,
    "-vf",
    "noise=alls=7:allf=t,format=rgb24",
    "-frames:v",
    "1",
    output,
  ]);
}

export function concatVideos({ files, output }) {
  const list = path.join(path.dirname(output), ".concat.txt");
  const body = files
    .map((file) => `file '${file.replace(/'/g, "'\\''")}'`)
    .join("\n");
  fs.writeFileSync(list, body);
  run("ffmpeg", [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    list,
    "-c",
    "copy",
    "-movflags",
    "+faststart",
    output,
  ]);
  fs.unlinkSync(list);
}

export function mixAudio({ video, audio, output, duck }) {
  const filter = duck
    ? "[1:a]volume=1.0[nar];[2:a]volume=0.22[bed];[nar][bed]amix=inputs=2:duration=first:dropout_transition=0[a]"
    : "[1:a]volume=1.0[a]";
  const args = ["-y", "-i", video, "-i", audio];
  if (duck) args.push("-i", duck);
  args.push(
    "-filter_complex",
    filter,
    "-map",
    "0:v",
    "-map",
    "[a]",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-shortest",
    "-movflags",
    "+faststart",
    output,
  );
  run("ffmpeg", args);
}

export function contactSheet({ files, output }) {
  const n = files.length;
  if (n === 1) {
    run("ffmpeg", ["-y", "-i", files[0], "-vf", "scale=270:338:force_original_aspect_ratio=increase,crop=270:338", "-frames:v", "1", "-q:v", "3", output]);
    return { cols: 1, rows: 1 };
  }
  const cols = n > 6 ? 5 : Math.min(n, 5);
  const rows = Math.ceil(n / cols);
  const cellW = 270;
  const cellH = 338;
  const inputs = [];
  files.forEach((file) => inputs.push("-i", file));
  const scales = files
    .map((_, i) => `[${i}:v]scale=${cellW}:${cellH}:force_original_aspect_ratio=increase,crop=${cellW}:${cellH}[s${i}]`)
    .join(";");
  const layout = files
    .map((_, i) => {
      const x = (i % cols) * cellW;
      const y = Math.floor(i / cols) * cellH;
      return `${x}_${y}`;
    })
    .join("|");
  const labels = files.map((_, i) => `[s${i}]`).join("");
  run("ffmpeg", [
    "-y",
    ...inputs,
    "-filter_complex",
    `${scales};${labels}xstack=inputs=${n}:layout=${layout},format=yuvj420p`,
    "-frames:v",
    "1",
    "-q:v",
    "3",
    output,
  ]);
  return { cols, rows };
}

export function probe(file) {
  const stdout = run("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height,sample_aspect_ratio,display_aspect_ratio,codec_name,pix_fmt,avg_frame_rate:format=duration,size",
    "-of",
    "json",
    file,
  ]);
  const json = JSON.parse(stdout);
  const stream = json.streams?.[0] || {};
  return {
    width: stream.width,
    height: stream.height,
    sar: stream.sample_aspect_ratio || "1:1",
    dar: stream.display_aspect_ratio || "",
    codec: stream.codec_name,
    pix: stream.pix_fmt,
    duration: Number(json.format?.duration || 0),
    size: Number(json.format?.size || 0),
  };
}

export function assertFrame(file, width, height) {
  const info = probe(file);
  const problems = [];
  if (info.width !== width || info.height !== height) {
    problems.push(`${info.width}x${info.height}, expected ${width}x${height}`);
  }
  if (info.sar && info.sar !== "1:1" && info.sar !== "N/A") {
    problems.push(`SAR ${info.sar}, expected 1:1`);
  }
  if (path.extname(file) === ".mp4") {
    if (info.codec !== "h264") problems.push(`codec ${info.codec}`);
    if (info.pix !== "yuv420p") problems.push(`pix_fmt ${info.pix}`);
  }
  if (problems.length) {
    throw new Error(`${path.basename(file)} ${problems.join("; ")}`);
  }
  return info;
}
