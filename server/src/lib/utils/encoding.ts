// File encoding detection utilities

import jschardet from "jschardet";

export const readEncoding = async (buffer: Buffer): Promise<string> => {
  const detected = jschardet.detect(buffer);

  if (detected.encoding && detected.confidence > 0.7) {
    const encoding = normalizeEncoding(detected.encoding) as BufferEncoding;
    try {
      const decoded = buffer.toString(encoding);
      if (isValidUTF8(decoded)) {
        return encoding;
      }
    } catch {
      console.warn(`Failed to decode with detected encoding: ${detected.encoding}`);
    }
  }

  return "utf-8";
};

const normalizeEncoding = (encoding: string): string => {
  const encodingLower = encoding.toLowerCase();
  const encodingMap: Record<string, string> = {
    "utf-8": "utf-8",
    "utf8": "utf-8",
    "utf-16": "utf-16le",
    "utf16": "utf-16le",
    "utf16le": "utf-16le",
    "utf16be": "utf-16be",
    "gb2312": "gbk",
    "gbk": "gbk",
    "gb18030": "gbk",
    "big5": "big5",
    "shift_jis": "shift_jis",
    "sjis": "shift_jis",
    "euc-jp": "euc-jp",
    "euc-kr": "euc-kr",
    "iso-8859-1": "latin1",
    "latin1": "latin1",
    "windows-1252": "cp1252",
    "cp1252": "cp1252",
  };

  return encodingMap[encodingLower] || encodingLower;
};

const isValidUTF8 = (str: string): boolean => {
  try {
    Buffer.from(str, "utf-8").toString("utf-8");
    return true;
  } catch {
    return false;
  }
};