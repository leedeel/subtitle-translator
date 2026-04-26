// Language data for translation services

export interface Language {
  value: string;
  name: string;
}

export const languages: Language[] = [
  { value: "auto", name: "Auto Detect / 自动检测" },
  { value: "af", name: "Afrikaans / 南非荷兰语" },
  { value: "sq", name: "Albanian / 阿尔巴尼亚语" },
  { value: "am", name: "Amharic / 阿姆哈拉语" },
  { value: "ar", name: "Arabic / 阿拉伯语" },
  { value: "hy", name: "Armenian / 亚美尼亚语" },
  { value: "az", name: "Azerbaijani / 阿塞拜疆语" },
  { value: "eu", name: "Basque / 巴斯克语" },
  { value: "be", name: "Belarusian / 白俄罗斯语" },
  { value: "bn", name: "Bengali / 孟加拉语" },
  { value: "bs", name: "Bosnian / 波斯尼亚语" },
  { value: "bg", name: "Bulgarian / 保加利亚语" },
  { value: "ca", name: "Catalan / 加泰罗尼亚语" },
  { value: "ceb", name: "Cebuano / 宿务语" },
  { value: "ny", name: "Chichewa / 齐切瓦语" },
  { value: "zh", name: "Chinese (Simplified) / 中文(简体)" },
  { value: "zh-hant", name: "Chinese (Traditional) / 中文(繁体)" },
  { value: "co", name: "Corsican / 科西嘉语" },
  { value: "hr", name: "Croatian / 克罗地亚语" },
  { value: "cs", name: "Czech / 捷克语" },
  { value: "da", name: "Danish / 丹麦语" },
  { value: "nl", name: "Dutch / 荷兰语" },
  { value: "en", name: "English / 英语" },
  { value: "eo", name: "Esperanto / 世界语" },
  { value: "et", name: "Estonian / 爱沙尼亚语" },
  { value: "tl", name: "Filipino / 菲律宾语" },
  { value: "fil", name: "Filipino / 菲律宾语" },
  { value: "fi", name: "Finnish / 芬兰语" },
  { value: "fr", name: "French / 法语" },
  { value: "fy", name: "Frisian / 弗里斯兰语" },
  { value: "gl", name: "Galician / 加利西亚语" },
  { value: "ka", name: "Georgian / 格鲁吉亚语" },
  { value: "de", name: "German / 德语" },
  { value: "el", name: "Greek / 希腊语" },
  { value: "gu", name: "Gujarati / 古吉拉特语" },
  { value: "ht", name: "Haitian Creole / 海地克里奥尔语" },
  { value: "ha", name: "Hausa / 豪萨语" },
  { value: "haw", name: "Hawaiian / 夏威夷语" },
  { value: "he", name: "Hebrew / 希伯来语" },
  { value: "iw", name: "Hebrew / 希伯来语" },
  { value: "hi", name: "Hindi / 印地语" },
  { value: "hmn", name: "Hmong / 苗语" },
  { value: "hu", name: "Hungarian / 匈牙利语" },
  { value: "is", name: "Icelandic / 冰岛语" },
  { value: "ig", name: "Igbo / 伊博语" },
  { value: "id", name: "Indonesian / 印度尼西亚语" },
  { value: "ga", name: "Irish / 爱尔兰语" },
  { value: "it", name: "Italian / 意大利语" },
  { value: "ja", name: "Japanese / 日语" },
  { value: "jw", name: "Javanese / 爪哇语" },
  { value: "kn", name: "Kannada / 卡纳达语" },
  { value: "kk", name: "Kazakh / 哈萨克语" },
  { value: "km", name: "Khmer / 高棉语" },
  { value: "ko", name: "Korean / 韩语" },
  { value: "ku", name: "Kurdish (Kurmanji) / 库尔德语" },
  { value: "ky", name: "Kyrgyz / 吉尔吉斯语" },
  { value: "lo", name: "Lao / 老挝语" },
  { value: "la", name: "Latin / 拉丁语" },
  { value: "lv", name: "Latvian / 拉脱维亚语" },
  { value: "lt", name: "Lithuanian / 立陶宛语" },
  { value: "lb", name: "Luxembourgish / 卢森堡语" },
  { value: "mk", name: "Macedonian / 马其顿语" },
  { value: "mg", name: "Malagasy / 马拉加斯语" },
  { value: "ms", name: "Malay / 马来语" },
  { value: "ml", name: "Malayalam / 马拉雅拉姆语" },
  { value: "mt", name: "Maltese / 马耳他语" },
  { value: "mi", name: "Maori / 毛利语" },
  { value: "mr", name: "Marathi / 马拉地语" },
  { value: "mn", name: "Mongolian / 蒙古语" },
  { value: "my", name: "Myanmar (Burmese) / 缅甸语" },
  { value: "ne", name: "Nepali / 尼泊尔语" },
  { value: "no", name: "Norwegian / 挪威语" },
  { value: "or", name: "Odia / 奥里亚语" },
  { value: "ps", name: "Pashto / 普什图语" },
  { value: "fa", name: "Persian / 波斯语" },
  { value: "pl", name: "Polish / 波兰语" },
  { value: "pt", name: "Portuguese / 葡萄牙语" },
  { value: "pa", name: "Punjabi / 旁遮普语" },
  { value: "ro", name: "Romanian / 罗马尼亚语" },
  { value: "ru", name: "Russian / 俄语" },
  { value: "sm", name: "Samoan / 萨摩亚语" },
  { value: "gd", name: "Scots Gaelic / 苏格兰盖尔语" },
  { value: "sr", name: "Serbian / 塞尔维亚语" },
  { value: "st", name: "Sesotho / 塞索托语" },
  { value: "sn", name: "Shona / 绍纳语" },
  { value: "sd", name: "Sindhi / 信德语" },
  { value: "si", name: "Sinhala / 僧伽罗语" },
  { value: "sk", name: "Slovak / 斯洛伐克语" },
  { value: "sl", name: "Slovenian / 斯洛文尼亚语" },
  { value: "so", name: "Somali / 索马里语" },
  { value: "es", name: "Spanish / 西班牙语" },
  { value: "su", name: "Sundanese / 巽他语" },
  { value: "sw", name: "Swahili / 斯瓦希里语" },
  { value: "sv", name: "Swedish / 瑞典语" },
  { value: "tg", name: "Tajik / 塔吉克语" },
  { value: "ta", name: "Tamil / 泰米尔语" },
  { value: "tt", name: "Tatar / 鞑靼语" },
  { value: "te", name: "Telugu / 泰卢固语" },
  { value: "th", name: "Thai / 泰语" },
  { value: "tr", name: "Turkish / 土耳其语" },
  { value: "tk", name: "Turkmen / 土库曼语" },
  { value: "uk", name: "Ukrainian / 乌克兰语" },
  { value: "ur", name: "Urdu / 乌尔都语" },
  { value: "ug", name: "Uyghur / 维吾尔语" },
  { value: "uz", name: "Uzbek / 乌兹别克语" },
  { value: "vi", name: "Vietnamese / 越南语" },
  { value: "cy", name: "Welsh / 威尔士语" },
  { value: "xh", name: "Xhosa / 科萨语" },
  { value: "yi", name: "Yiddish / 意第绪语" },
  { value: "yo", name: "Yoruba / 约鲁巴语" },
  { value: "zu", name: "Zulu / 祖鲁语" },
];

export const isMethodSupportedForLanguage = (method: string, language: string): boolean => {
  const methodLower = method.toLowerCase();
  const langLower = language.toLowerCase();

  // Special cases for different translation methods
  if (methodLower === "gtxfreeapi" || methodLower === "webgoogletranslate") {
    const supported = [
      "af", "sq", "am", "ar", "hy", "az", "eu", "be", "bn", "bs", "bg", "ca", "ceb", "ny", "zh", "zh-hans", "zh-hant", "co", "hr", "cs", "da", "nl", "en", "eo", "et", "tl", "fil", "fi", "fr", "fy", "gl", "ka", "de", "el", "gu", "ht", "ha", "haw", "he", "iw", "hi", "hmn", "hu", "is", "ig", "id", "ga", "it", "ja", "jw", "kn", "kk", "km", "ko", "ku", "ky", "lo", "la", "lv", "lt", "lb", "mk", "mg", "ms", "ml", "mt", "mi", "mr", "mn", "my", "ne", "no", "or", "ps", "fa", "pl", "pt", "pa", "ro", "ru", "sm", "gd", "sr", "st", "sn", "sd", "si", "sk", "sl", "so", "es", "su", "sw", "sv", "tg", "ta", "tt", "te", "th", "tr", "tk", "uk", "ur", "ug", "uz", "vi", "cy", "xh", "yi", "yo", "zu",
    ];
    return supported.includes(langLower);
  }

  if (methodLower === "deepl" || methodLower === "deeplx") {
    const supported = [
      "bg", "cs", "da", "de", "el", "en", "es", "et", "fi", "fr", "hu", "id", "it", "ja", "ko", "lt", "lv", "nb", "nl", "pl", "pt", "pt-br", "pt-pt", "ro", "ru", "sk", "sl", "sv", "tr", "uk", "zh", "zh-hans", "zh-hant",
    ];
    return supported.includes(langLower);
  }

  if (methodLower === "qwenmt") {
    const supported = [
      "zh", "zh-hans", "zh-hant", "en", "ar", "es", "fr", "de", "ja", "ko", "ru", "pt", "it", "tr", "vi", "th", "ms", "id", "nl", "hi", "bn", "ta", "te", "mr", "gu", "kn", "ml", "fa", "ur", "he", "uk", "pl", "ro", "hu", "cs", "sv", "fi", "da", "no", "fi", "tr", "el", "bg", "sr", "hr", "sk", "sl", "et", "lv", "lt", "is", "mt",
    ];
    return supported.includes(langLower);
  }

  if (methodLower === "google") {
    const supported = [
      "af", "sq", "am", "ar", "hy", "az", "eu", "be", "bn", "bs", "bg", "ca", "ceb", "ny", "zh", "zh-hans", "zh-hant", "co", "hr", "cs", "da", "nl", "en", "eo", "et", "tl", "fil", "fi", "fr", "fy", "gl", "ka", "de", "el", "gu", "ht", "ha", "haw", "he", "iw", "hi", "hmn", "hu", "is", "ig", "id", "ga", "it", "ja", "jw", "kn", "kk", "km", "ko", "ku", "ky", "lo", "la", "lv", "lt", "lb", "mk", "mg", "ms", "ml", "mt", "mi", "mr", "mn", "my", "ne", "no", "or", "ps", "fa", "pl", "pt", "pa", "ro", "ru", "sm", "gd", "sr", "st", "sn", "sd", "si", "sk", "sl", "so", "es", "su", "sw", "sv", "tg", "ta", "tt", "te", "th", "tr", "tk", "uk", "ur", "ug", "uz", "vi", "cy", "xh", "yi", "yo", "zu",
    ];
    return supported.includes(langLower);
  }

  if (methodLower === "azure") {
    const supported = [
      "af", "sq", "am", "ar", "hy", "az", "eu", "be", "bn", "bs", "bg", "ca", "ceb", "ny", "zh", "zh-hans", "zh-hant", "co", "hr", "cs", "da", "nl", "en", "eo", "et", "tl", "fil", "fi", "fr", "fy", "gl", "ka", "de", "el", "gu", "ht", "ha", "haw", "he", "iw", "hi", "hmn", "hu", "is", "ig", "id", "ga", "it", "ja", "jw", "kn", "kk", "km", "ko", "ku", "ky", "lo", "la", "lv", "lt", "lb", "mk", "mg", "ms", "ml", "mt", "mi", "mr", "mn", "my", "ne", "no", "or", "ps", "fa", "pl", "pt", "pa", "ro", "ru", "sm", "gd", "sr", "st", "sn", "sd", "si", "sk", "sl", "so", "es", "su", "sw", "sv", "tg", "ta", "tt", "te", "th", "tr", "tk", "uk", "ur", "ug", "uz", "vi", "cy", "xh", "yi", "yo", "zu",
    ];
    return supported.includes(langLower);
  }

  // For LLM providers, support most common languages
  if (methodLower === "openai" || methodLower === "claude" || methodLower === "gemini" || methodLower === "qwen" || methodLower === "moonshot" || methodLower === "zhipu" || methodLower === "doubao" || methodLower === "grok" || methodLower === "mistral" || methodLower === "perplexity" || methodLower === "openrouter" || methodLower === "groq" || methodLower === "siliconflow" || methodLower === "nvidia" || methodLower === "azureopenai" || methodLower === "llm" || methodLower === "deepseek") {
    const lllSupported = [
      "en", "zh", "zh-hans", "zh-hant", "ja", "ko", "fr", "de", "es", "it", "ru", "pt", "ar", "hi", "tr", "vi", "th", "id", "nl", "pl", "uk", "sv", "fi", "da", "no", "cs", "el", "he", "ro", "hu", "bg", "sk", "hr", "sl", "et", "lv", "lt", "is", "mt", "ga", "cy", "ms", "sw", "fa", "ur", "bn", "ta", "te", "mr", "gu", "kn", "ml", "pa", "ne", "si", "my", "km", "lo", "ka", "hy", "az", "kk", "ky", "uz", "be", "uk", "sq", "mk", "af", "am", "so", "ha", "ig", "yo", "zu", "xh",
    ];
    return lllSupported.includes(langLower);
  }

  return true;
};