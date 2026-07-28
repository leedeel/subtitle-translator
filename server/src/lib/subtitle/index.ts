// Subtitle file handling utilities

// VTT/SRT time regex
export const VTT_SRT_TIME = /^(?:\d+:)?\d{2}:\d{2}[,.]\d{1,3} --> (?:\d+:)?\d{2}:\d{2}[,.]\d{1,3}/;

// LRC time regex
export const LRC_TIME_REGEX = /^\[\d{2}:\d{2}(\.\d{2,3})?\]/;
const LRC_METADATA_REGEX = /^\[(ar|ti|al|by|offset|re|ve):/i;

export const detectSubtitleFormat = (lines: string[]): "ass" | "vtt" | "srt" | "lrc" | "error" => {
  const nonEmptyLines = lines.slice(0, 50).filter((line) => line.trim().length > 0);
  let assCount = 0,
    vttCount = 0,
    srtCount = 0,
    lrcCount = 0;

  for (let i = 0; i < nonEmptyLines.length; i++) {
    const trimmed = nonEmptyLines[i].trim();

    if (/^\[script info\]/i.test(trimmed)) return "ass";
    if (i === 0 && /^WEBVTT($|\s)/i.test(trimmed)) return "vtt";

    if (/^dialogue:\s*\d+,[^,]*,[^,]*,/i.test(trimmed)) {
      assCount++;
    }
    if (VTT_SRT_TIME.test(trimmed)) {
      if (trimmed.includes(",")) {
        srtCount++;
      } else if (trimmed.includes(".")) {
        vttCount++;
      }
    }
    if (LRC_TIME_REGEX.test(trimmed)) {
      lrcCount++;
    }
    if (LRC_METADATA_REGEX.test(trimmed)) {
      lrcCount++;
    }
  }

  if (assCount > 0 && assCount >= Math.max(vttCount, srtCount, lrcCount)) {
    return "ass";
  }
  if (lrcCount > 0 && lrcCount >= Math.max(vttCount, srtCount)) {
    return "lrc";
  }
  if (vttCount > srtCount) return "vtt";
  if (srtCount > 0) return "srt";
  return "error";
};

const INTEGER_REGEX = /^\d+$/;
const isValidSubtitleLine = (str: string): boolean => {
  const trimmedStr = str.trim();
  return trimmedStr !== "" && !INTEGER_REGEX.test(trimmedStr);
};

export const filterSubLines = (lines: string[], fileType: string) => {
  const contentLines: string[] = [];
  const contentIndices: number[] = [];
  const styleBlockLines: string[] = [];
  let startExtracting = false;
  let assContentStartIndex = 9;
  let formatFound = false;

  if (fileType === "ass") {
    const eventIndex = lines.findIndex((line) => line.trim() === "[Events]");
    if (eventIndex !== -1) {
      for (let i = eventIndex; i < lines.length; i++) {
        if (lines[i].startsWith("Format:")) {
          const formatLine = lines[i];
          assContentStartIndex = formatLine.split(",").length - 1;
          formatFound = true;
          break;
        }
      }
    }

    if (!formatFound) {
      const dialogueLines = lines.filter((line) => line.startsWith("Dialogue:")).slice(0, 100);
      if (dialogueLines.length > 0) {
        const commaCounts = dialogueLines.map((line) => line.split(",").length - 1);
        assContentStartIndex = Math.min(...commaCounts);
      }
    }
  }

  lines.forEach((line, index) => {
    let isContent = false;
    let extractedContent = "";
    const trimmedLine = line.trim();

    if (fileType === "srt" || fileType === "vtt") {
      if (!startExtracting) {
        const isTimecode = /^[\d:,]+ --> [\d:,]+/.test(line) || /^[\d:.]+ --> [\d:.]+/.test(line);
        if (isTimecode) {
          startExtracting = true;
        }
      }

      if (startExtracting) {
        if (fileType === "vtt") {
          const isTimecode = /^[\d:.]+ --> [\d:.]+/.test(trimmedLine);
          const isWebVTTHeader = trimmedLine.startsWith("WEBVTT");
          const isComment = trimmedLine.startsWith("#");
          isContent = isValidSubtitleLine(line) && !isTimecode && !isWebVTTHeader && !isComment;
          extractedContent = line.replace(/<\/?c>/g, "").replace(/<[\d:.]+>/g, "");
        } else {
          const isTimecode = /^[\d:,]+ --> [\d:,]+/.test(trimmedLine);
          isContent = isValidSubtitleLine(line) && !isTimecode;
          extractedContent = line;
        }
      }
    } else if (fileType === "lrc") {
      if (!startExtracting && LRC_TIME_REGEX.test(trimmedLine)) {
        startExtracting = true;
      }

      if (startExtracting) {
        extractedContent = trimmedLine.replace(/\[\d{2}:\d{2}(\.\d{2,3})?\]/g, "").trim();
        isContent = isValidSubtitleLine(line);
      }
    } else if (fileType === "ass") {
      if (!startExtracting && trimmedLine.startsWith("Dialogue:")) {
        startExtracting = true;
      }

      if (startExtracting) {
        const parts = line.split(",");
        if (line.startsWith("Dialogue:") && parts.length > assContentStartIndex) {
          extractedContent = parts.slice(assContentStartIndex).join(",").trim();
          isContent = isValidSubtitleLine(line);
        }
      }
    }

    if (isContent) {
      contentLines.push(extractedContent);
      contentIndices.push(index);
    }
  });

  return { contentLines, contentIndices, styleBlockLines, assContentStartIndex };
};

const TIME_REGEX = /^(?:(\d+):)?(\d{2}):(\d{2})[,.](\d{1,3})$/;
const SRT_TIME_LINE_REGEX = /^((?:\d+:)?\d{2}:\d{2},\d{1,3})\s*-->\s*((?:\d+:)?\d{2}:\d{2},\d{1,3})(?:\s+.*)?$/;

export interface SrtCue {
  timeLineIndex: number;
  start: string;
  end: string;
  textLines: string[];
}

export const normalizeSrtTimestamp = (time: string): string => {
  const match = time.match(TIME_REGEX);
  if (!match) return time;

  const [, hours, minutes, seconds, ms] = match;
  const normalizedHours = Number.parseInt(hours || "0", 10).toString().padStart(2, "0");
  const normalizedMilliseconds = ms.padEnd(3, "0");
  return `${normalizedHours}:${minutes}:${seconds},${normalizedMilliseconds}`;
};

export const parseSrtCues = (lines: string[]): SrtCue[] => {
  const cues: SrtCue[] = [];
  let lineIndex = 0;

  while (lineIndex < lines.length) {
    const timeLineMatch = lines[lineIndex].trim().match(SRT_TIME_LINE_REGEX);
    if (!timeLineMatch) {
      lineIndex++;
      continue;
    }

    const textLines: string[] = [];
    let nextLineIndex = lineIndex + 1;

    while (nextLineIndex < lines.length) {
      const line = lines[nextLineIndex];
      const trimmedLine = line.trim();

      if (trimmedLine === "" || SRT_TIME_LINE_REGEX.test(trimmedLine)) {
        break;
      }

      const followingLine = lines[nextLineIndex + 1]?.trim();
      if (INTEGER_REGEX.test(trimmedLine) && followingLine && SRT_TIME_LINE_REGEX.test(followingLine)) {
        break;
      }

      textLines.push(line);
      nextLineIndex++;
    }

    cues.push({
      timeLineIndex: lineIndex,
      start: timeLineMatch[1],
      end: timeLineMatch[2],
      textLines,
    });
    lineIndex = nextLineIndex;
  }

  return cues;
};

export const convertTimeToAss = (time: string): string => {
  const match = time.match(TIME_REGEX);
  if (!match) return time;
  const [, hours, minutes, seconds, ms] = match;
  // 处理毫秒：转换为厘秒（1厘秒=10毫秒），向下取整
  const milliseconds = parseInt(ms.padEnd(3, "0"), 10); // 确保3位数
  const centiseconds = Math.floor(milliseconds / 10); // 毫秒→厘秒
  const msValue = centiseconds.toString().padStart(2, "0"); // 确保两位格式
  return `${parseInt(hours || "0", 10)}:${minutes}:${seconds}.${msValue}`;
};

const ASS_LEADING_TAGS_REGEX = /^(\{[^}]*\})+/;
const ASS_ALL_TAGS_REGEX = /\{[^}]*\}/g;
const ASS_NEWLINE_REGEX = /\\[Nn]/g;

interface AssTagMap {
  leadingTags: string;
}

export const prepareAssForTranslation = (contentLines: string[]): { cleanLines: string[]; tagMaps: AssTagMap[] } => {
  const cleanLines: string[] = [];
  const tagMaps: AssTagMap[] = [];

  for (const line of contentLines) {
    let leadingTags = "";
    let remaining = line;
    const leadingMatch = line.match(ASS_LEADING_TAGS_REGEX);
    if (leadingMatch) {
      leadingTags = leadingMatch[0];
      remaining = line.substring(leadingTags.length);
    }

    remaining = remaining.replace(ASS_ALL_TAGS_REGEX, "");
    remaining = remaining.replace(ASS_NEWLINE_REGEX, "\n");

    tagMaps.push({ leadingTags });
    cleanLines.push(remaining);
  }

  return { cleanLines, tagMaps };
};

export const restoreAssAfterTranslation = (translatedLines: string[], tagMaps: AssTagMap[]): string[] => {
  return translatedLines.map((line, i) => {
    const map = tagMaps[i];
    if (!map) return line;

    let restored = line.replace(/\n/g, "\\N");

    if (map.leadingTags) {
      restored = map.leadingTags + restored;
    }

    return restored;
  });
};

export const assHeader = `[Script Info]
Title: Bilingual Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: Yes
PlayResX: 1920
PlayResY: 1080
Collisions: Normal

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Noto Sans,70,&H00FFFFFF,&H0000FFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,1,2,30,30,35,1
Style: Secondary,Noto Sans,55,&H003CF7F4,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,1,2,30,30,35,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

export const getOutputFileExtension = (fileType: string, bilingualSubtitle: boolean): string => {
  if (fileType === "lrc") {
    return "lrc";
  } else if (bilingualSubtitle || fileType === "ass") {
    return "ass";
  } else if (fileType === "vtt") {
    return "vtt";
  } else {
    return "srt";
  }
};