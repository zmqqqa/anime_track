const DEFAULT_AI_URL = 'https://api.deepseek.com/chat/completions';

function normalizeAiApiUrl(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return DEFAULT_AI_URL;
  }

  const withoutTrailingSlash = normalized.replace(/\/+$/, '');
  if (/ark\.cn-[^.]+\.volces\.com\/api\/v\d+$/i.test(withoutTrailingSlash)) {
    return `${withoutTrailingSlash}/chat/completions`;
  }

  return withoutTrailingSlash;
}

function shouldUseJsonFormat(apiUrl, model) {
  const override = String(process.env.AI_JSON_FORMAT ?? '').trim().toLowerCase();
  if (['false', '0', 'off', 'no'].includes(override)) {
    return false;
  }

  if (['true', '1', 'on', 'yes'].includes(override)) {
    return true;
  }

  if (String(apiUrl || '').includes('.volces.com') || String(model || '').toLowerCase().startsWith('ep-')) {
    return false;
  }

  return true;
}

const AI_API_URL = normalizeAiApiUrl(process.env.AI_API_URL);
const AI_MODEL = String(process.env.AI_MODEL || '').trim() || 'deepseek-chat';

function getAiApiKey() {
  return String(process.env.AI_API_KEY || process.env.DEEPSEEK_API_KEY || '').trim();
}

function uniqueStrings(values) {
  const seen = new Set();
  const result = [];

  for (const value of values) {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function toOptionalString(value) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

function toOptionalNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return undefined;
}

function toOptionalBoolean(value) {
  return typeof value === 'boolean' ? value : undefined;
}

function toOptionalDateString(value) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toStringArray(value) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalized = uniqueStrings(value.map((item) => (typeof item === 'string' ? item : String(item ?? ''))));
  return normalized.length > 0 ? normalized : undefined;
}

function parseJsonFromAiContent(content) {
  const normalized = String(content || '').trim();
  if (!normalized) {
    return null;
  }

  try {
    return JSON.parse(normalized);
  } catch {
    const fencedMatch = normalized.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const fencedContent = fencedMatch?.[1]?.trim();
    if (fencedContent) {
      try {
        return JSON.parse(fencedContent);
      } catch {
        // Fall through to generic object extraction.
      }
    }

    const objectMatch = normalized.match(/\{[\s\S]*\}/);
    const objectContent = objectMatch?.[0]?.trim();
    if (!objectContent) {
      return null;
    }

    try {
      return JSON.parse(objectContent);
    } catch {
      return null;
    }
  }
}

async function requestAiJson(messages, apiKey, temperature = 0.1) {
  if (!apiKey) {
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages,
        temperature,
        ...(shouldUseJsonFormat(AI_API_URL, AI_MODEL) ? { response_format: { type: 'json_object' } } : {}),
      }),
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('AI request failed:', response.status, detail);
      return null;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      return null;
    }

    return parseJsonFromAiContent(content);
  } catch (error) {
    console.error('AI request error:', error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchAiAnimeMetadata(queryName, providedApiKey) {
  const normalizedQuery = String(queryName || '').trim();
  if (!normalizedQuery) {
    return null;
  }

  const apiKey = String(providedApiKey || getAiApiKey()).trim();
  const payload = await requestAiJson(
    [
      {
        role: 'system',
        content: '你是动漫资料整理助手，只输出 JSON，不输出解释。信息不确定时宁可留空，不要编造。',
      },
      {
        role: 'user',
        content: `
请识别这部动画，并返回 JSON。

原始名字：${normalizedQuery}

返回结构：
{
  "officialTitle": "标准简体中文标题",
  "originalTitle": "日文原始标题",
  "totalEpisodes": 12,
  "durationMinutes": 24,
  "synopsis": "简体中文简介",
  "tags": ["校园", "喜剧"],
  "premiereDate": "YYYY-MM-DD 或 null",
  "isFinished": true,
  "coverUrl": null
}

字段要求：
1. officialTitle 必须是“具体动画条目”的标准简体中文标题，不是漫画、轻小说、游戏或整个原作系列名。
2. 如果是分季、续作、剧场版、OVA、OAD，返回该具体动画条目的标题。
3. 如果某一季有稳定通行的官方中文副标题，优先返回副标题形式，例如“南家三姐妹 再来一碗”；不要强行改写成“南家三姐妹 第二季”。
4. originalTitle 是最关键的字段之一，必须返回该动画条目在日本官方使用的日文标题（含日文汉字、假名、英文混写均可），例如"SPY×FAMILY Season 2""僕のヒーローアカデミア""Re:ゼロから始める異世界生活"。这个字段会被用来搜索 Bangumi 等数据库，所以必须是可搜索的准确标题，不要返回中文翻译。
5. 所有字段都必须对应动画版本本身，不要混入漫画连载开始时间、原作书名或企划信息。
6. premiereDate 是该动画第一集的电视/网络首播日期，精确到日。如果该季动画是 2022 年播出的，就不能填 2025 年的日期。不确定就填 null，绝对不要猜测。
7. 注意区分不同季度：例如"间谍过家家"第一季首播于 2022 年 4 月，第二季首播于 2023 年 10 月，不要搞混。
如果无法识别，也返回同结构，但未知字段用 null 或空数组。`,
      },
    ],
    apiKey,
    0.1
  );

  if (!payload) {
    return null;
  }

  return {
    title: toOptionalString(payload.officialTitle) || normalizedQuery,
    originalTitle: toOptionalString(payload.originalTitle),
    totalEpisodes: toOptionalNumber(payload.totalEpisodes),
    durationMinutes: toOptionalNumber(payload.durationMinutes),
    summary: toOptionalString(payload.synopsis),
    tags: toStringArray(payload.tags),
    premiereDate: toOptionalDateString(payload.premiereDate),
    isFinished: toOptionalBoolean(payload.isFinished),
    coverUrl: toOptionalString(payload.coverUrl),
  };
}

module.exports = {
  getAiApiKey,
  fetchAiAnimeMetadata,
};