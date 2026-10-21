#!/usr/bin/env python3
"""Decode an export and check its planned duration, cadence, size and audio state.

Uses Python's standard library and FFprobe (system or the repo's Remotion binary).
Visual typing/pacing/click causality still require playback review.
"""

import argparse
from fractions import Fraction
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess
import sys


def find_ffprobe(explicit):
    if explicit:
        resolved = shutil.which(explicit)
        if resolved:
            return Path(resolved).resolve()
        candidate = Path(explicit).expanduser().resolve()
        if candidate.is_file():
            return candidate
        raise ValueError(f"FFprobe not found: {explicit}")
    installed = shutil.which("ffprobe")
    if installed:
        return Path(installed).resolve()
    repo = Path(__file__).resolve().parents[4]
    host = {"Darwin": "darwin", "Windows": "win32", "Linux": "linux"}.get(platform.system())
    arch = "arm64" if platform.machine().lower() in {"arm64", "aarch64"} else "x64"
    executable = "ffprobe.exe" if host == "win32" else "ffprobe"
    packages = repo / "demo-video" / "node_modules" / "@remotion"
    for suffix in ("", "-gnu", "-musl"):
        candidate = packages / f"compositor-{host}-{arch}{suffix}" / executable
        if candidate.is_file():
            return candidate
    raise ValueError("FFprobe unavailable. Install video dependencies or pass --ffprobe PATH.")


def inspect_video(args):
    video = args.video.expanduser().resolve()
    if not video.is_file() or video.stat().st_size == 0:
        raise ValueError(f"Video is missing or empty: {video}")
    fps = Fraction(args.fps)
    expected = Fraction(args.expected_seconds)
    if fps <= 0 or expected <= 0:
        raise ValueError("Expected duration and fps must be positive.")
    exact_frames = fps * expected
    if exact_frames.denominator != 1:
        raise ValueError("Planned duration × fps must be a whole number of frames.")
    probe = find_ffprobe(args.ffprobe)
    env = os.environ.copy()
    if probe.parent.name.startswith("compositor-"):
        variable = "DYLD_LIBRARY_PATH" if platform.system() == "Darwin" else "LD_LIBRARY_PATH"
        env[variable] = str(probe.parent) + (os.pathsep + env[variable] if env.get(variable) else "")
    command = [
        str(probe), "-v", "error", "-count_frames", "-show_frames",
        "-show_entries",
        "stream=codec_type,codec_name,width,height,r_frame_rate,avg_frame_rate,time_base,start_time,nb_read_frames:"
        "frame=media_type,best_effort_timestamp_time:format=duration",
        "-of", "json", str(video),
    ]
    result = subprocess.run(command, env=env, capture_output=True, text=True)
    if result.returncode or result.stderr.strip():
        raise ValueError("FFprobe reported a decode error: " + result.stderr.strip()[-1200:])
    data = json.loads(result.stdout)
    streams = data.get("streams", [])
    videos = [stream for stream in streams if stream.get("codec_type") == "video"]
    if len(videos) != 1:
        raise ValueError(f"Expected one video stream, found {len(videos)}.")
    stream = videos[0]
    audio_count = sum(s.get("codec_type") == "audio" for s in streams)
    frames = [f for f in data.get("frames", []) if f.get("media_type") == "video"]
    timestamps = [float(f["best_effort_timestamp_time"]) for f in frames if "best_effort_timestamp_time" in f]
    duration = float(data.get("format", {}).get("duration", 0))
    frame_duration = 1 / float(fps)
    tick = float(Fraction(stream.get("time_base", "1/90000")))
    cadence_tolerance = max(0.00001, 2 * tick)
    duration_tolerance = max(0.001, frame_duration / 2)
    errors = []
    width = stream.get("width")
    height = stream.get("height")
    if args.exact_dimensions:
        if (width, height) != (args.min_width, args.min_height):
            errors.append(
                f"Size is {width}×{height}; expected exactly {args.min_width}×{args.min_height}."
            )
    elif width is None or height is None or width < args.min_width or height < args.min_height:
        errors.append(
            f"Size is {width}×{height}; must be at least {args.min_width}×{args.min_height}."
        )
    for field in ("r_frame_rate", "avg_frame_rate"):
        if Fraction(stream.get(field, "0")) != fps:
            errors.append(f"{field} is {stream.get(field)}; expected {fps}.")
    if len(frames) != int(exact_frames) or int(stream.get("nb_read_frames", -1)) != int(exact_frames):
        errors.append(f"Decoded {len(frames)} frames; expected {int(exact_frames)}.")
    if abs(duration - float(expected)) > duration_tolerance:
        errors.append(f"Duration is {duration:.6f}s; expected {float(expected):.6f}s.")
    if len(timestamps) != len(frames) or not timestamps:
        errors.append("Missing presentation timestamps on decoded frames.")
    max_cadence_error = 0
    if timestamps:
        if abs(timestamps[0]) > cadence_tolerance:
            errors.append(f"First video frame starts at {timestamps[0]:.6f}s instead of zero.")
        deltas = [b - a for a, b in zip(timestamps, timestamps[1:])]
        if any(delta <= 0 for delta in deltas):
            errors.append("Decoded frame timestamps are not strictly increasing.")
        max_cadence_error = max((abs(delta - frame_duration) for delta in deltas), default=0)
        if max_cadence_error > cadence_tolerance:
            errors.append(f"Frame cadence deviates by up to {max_cadence_error:.6f}s; inspect cuts/time bases.")
        if abs(timestamps[-1] + frame_duration - float(expected)) > duration_tolerance:
            errors.append("Last frame does not end at the planned duration.")
    if args.silent and audio_count:
        errors.append(f"Expected silent footage; found {audio_count} audio stream(s).")
    if args.audio and not audio_count:
        errors.append("Expected narration/audio, but the export has no audio stream.")
    return {
        "ok": not errors, "video": str(video), "ffprobe": str(probe),
        "codec": stream.get("codec_name"), "width": width, "height": height,
        "minWidth": args.min_width, "minHeight": args.min_height,
        "exactDimensions": args.exact_dimensions,
        "fps": stream.get("avg_frame_rate"), "timeBase": stream.get("time_base"),
        "durationSeconds": duration, "plannedSeconds": float(expected),
        "decodedFrames": len(frames), "plannedFrames": int(exact_frames),
        "audioStreams": audio_count, "maxCadenceErrorSeconds": round(max_cadence_error, 9),
        "errors": errors,
        "visualReviewRequired": "Watch typing, click causality, framing and transitions at normal speed.",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("video", type=Path)
    parser.add_argument("--expected-seconds", required=True)
    parser.add_argument("--fps", default="30")
    parser.add_argument("--min-width", type=int, default=1920, help="Minimum decoded width (default: 1920).")
    parser.add_argument("--min-height", type=int, default=1080, help="Minimum decoded height (default: 1080).")
    parser.add_argument(
        "--exact-dimensions",
        action="store_true",
        help="Require width and height to match --min-width and --min-height exactly.",
    )
    audio = parser.add_mutually_exclusive_group()
    audio.add_argument("--silent", action="store_true")
    audio.add_argument("--audio", action="store_true")
    parser.add_argument("--ffprobe")
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    try:
        report = inspect_video(args)
    except (ValueError, OSError, KeyError, json.JSONDecodeError) as error:
        report = {"ok": False, "errors": [str(error)]}
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
