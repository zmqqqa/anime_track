const USER_AGENT = 'AnimeTrack/1.0 (https://github.com/zmqqqa/AnimeTrack)';
const MAX_CAST_MEMBERS = 10;
const FETCH_TIMEOUT_MS = 8000;
const SEASON_PATTERN = /第([一二三四五六七八九十0-9两]+)(?:季|期)|(?:^|\s)([0-9]+)期|season\s*([0-9]+)|s([0-9]+)|([0-9]+)(?:st|nd|rd|th)\s+season|([0-9]+)丁目/i;
const FOLLOW_UP_SEASON_PATTERN = /第[二三四五六七八九十2-9两]+(?:季|期)|(?:^|\s)[2-9]期|season\s*[2-9]|s[2-9]|[2-9](?:st|nd|rd|th)\s+season|[2-9]丁目/i;

function parseChineseSeasonNumber(token) {
  const normalized = String(token || '').trim();
  if (!normalized) return null;
  if (/^[0-9]+$/.test(normalized)) return Number(normalized);

  const map = {
    '零': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
  };

  if (normalized === '十') return 10;
  if (normalized.startsWith('十')) {
    const tail = normalized.slice(1);
    return 10 + (map[tail] || 0);
  }
  if (normalized.endsWith('十')) {
    const head = normalized.slice(0, -1);
    return (map[head] || 0) * 10;
  }
  if (normalized.includes('十')) {
    const [head, tail] = normalized.split('十');
    return (map[head] || 0) * 10 + (map[tail] || 0);
  }
  return map[normalized] || null;
}

function parseJapaneseSeasonNumber(token) {
  const normalized = String(token || '').trim().toLowerCase();
  if (!normalized) return null;
  const map = {
    'いち': 1, 'に': 2, 'さん': 3, 'よん': 4, 'し': 4, 'ご': 5,
    'ろく': 6, 'なな': 7, 'しち': 7, 'はち': 8, 'きゅう': 9, 'く': 9,
    'じゅう': 10,
  };
  return map[normalized] || null;
}

function parseCircledSeasonNumber(token) {
  const normalized = String(token || '').trim();
  const map = {
    '①': 1, '②': 2, '③': 3, '④': 4, '⑤': 5,
    '⑥': 6, '⑦': 7, '⑧': 8, '⑨': 9, '⑩': 10,
  };
  return map[normalized] || null;
}

function parseBangumiNumericSuffixSeason(value) {
  const match = String(value || '').trim().match(/。\s*([0-9]{1,2})$/);
  if (!match) return null;

  const season = Number(match[1]);
  return Number.isFinite(season) && season > 0 ? season : null;
}

function extractSeasonNumber(value) {
  const match = String(value || '').match(SEASON_PATTERN);
  if (!match) return parseBangumiNumericSuffixSeason(value);
  return parseChineseSeasonNumber(match[1]) || Number(match[2]) || Number(match[3]) || Number(match[4]) || Number(match[5]) || Number(match[6]) || parseJapaneseSeasonNumber(match[7]) || parseCircledSeasonNumber(match[8]) || parseBangumiNumericSuffixSeason(value) || null;
}

function stripSeasonLabel(value) {
  return String(value || '')
    .replace(/\s*第[一二三四五六七八九十0-9两]+(?:季|期)\s*/gi, ' ')
    .replace(/(?:^|\s)[0-9]+期\s*/g, ' ')
    .replace(/\s*season\s*[0-9]+\s*/gi, ' ')
    .replace(/\s+s[0-9]+\s*/gi, ' ')
    .replace(/\s*[0-9]+(?:st|nd|rd|th)\s+season\s*/gi, ' ')
    .replace(/\s*[0-9]+丁目\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildBangumiSearchQueries(title) {
  const normalized = String(title || '').trim();
  const stripped = stripSeasonLabel(normalized);
  const seasonNumber = extractSeasonNumber(normalized);

  const queries = [];
  if (seasonNumber === 1 && stripped && stripped !== normalized) {
    queries.push(stripped, normalized);
  } else {
    queries.push(normalized);
    if (stripped && stripped !== normalized) {
      queries.push(stripped);
    }
  }

  return uniqueValues(queries);
}

function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function uniqueValues(values) {
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

function normalizeDate(value) {
  if (!value) {
    return undefined;
  }

  const trimmed = String(value).trim();
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

function setFieldValue(result, providerMeta, field, value, site, query, extra = {}) {
  if (value === undefined || value === null || value === '') {
    return;
  }

  if (result[field] !== undefined && result[field] !== null && result[field] !== '') {
    return;
  }

  result[field] = value;
  providerMeta.fieldSources[field] = {
    site,
    query: query || null,
    ...extra,
  };
}

function pickBangumiSubject(subjects, title) {
  let subject = subjects.find((item) => item.name_cn === title || item.name === title);

  if (!subject) {
    const seasonNumber = extractSeasonNumber(title);
    if (!seasonNumber) {
      subject = subjects.find((item) => {
        const itemName = item.name_cn || item.name || '';
        return !FOLLOW_UP_SEASON_PATTERN.test(itemName);
      });
    } else {
      subject = subjects.find((item) => {
        const itemName = item.name_cn || item.name || '';
        const itemSeason = extractSeasonNumber(itemName);

        if (seasonNumber === 1) {
          return itemSeason === 1 || !FOLLOW_UP_SEASON_PATTERN.test(itemName);
        }

        return itemSeason === seasonNumber;
      });

      if (!subject && seasonNumber === 1) {
        subject = subjects.find((item) => {
          const itemName = item.name_cn || item.name || '';
          return !FOLLOW_UP_SEASON_PATTERN.test(itemName);
        });
      }
    }
  }

  return subject || subjects[0] || null;
}

async function fetchBangumiSubject(title) {
  const queries = buildBangumiSearchQueries(title);

  for (const query of queries) {
    const res = await fetchWithTimeout('https://api.bgm.tv/v0/search/subjects?limit=5', {
      method: 'POST',
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keyword: query,
        filter: { type: [2] },
        sort: 'match',
      }),
    });

    if (!res.ok) {
      continue;
    }

    const data = await res.json();
    if (!data?.data || !Array.isArray(data.data) || data.data.length === 0) {
      continue;
    }

    const subject = pickBangumiSubject(data.data, title);
    if (subject) {
      return subject;
    }
  }

  return null;
}

async function fetchBangumiSubjectDetail(subjectId) {
  try {
    const res = await fetchWithTimeout(`https://api.bgm.tv/v0/subjects/${subjectId}`, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    if (!res.ok) {
      return null;
    }

    return res.json();
  } catch (error) {
    console.error('Bangumi subject detail fetch failed', error);
    return null;
  }
}

async function fetchBangumiEpisodeDuration(subjectId) {
  try {
    const res = await fetchWithTimeout(`https://api.bgm.tv/v0/episodes?subject_id=${subjectId}&type=0&limit=1`, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    const ep = data?.data?.[0];
    if (ep?.duration_seconds && ep.duration_seconds > 0) {
      return Math.round(ep.duration_seconds / 60);
    }
    return null;
  } catch {
    return null;
  }
}

function extractBangumiTags(detail) {
  if (!Array.isArray(detail?.tags) || detail.tags.length === 0) return [];
  return detail.tags
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 10)
    .map((t) => t.name)
    .filter(Boolean);
}

function extractBangumiIsFinished(detail) {
  if (!Array.isArray(detail?.infobox)) return undefined;
  const endEntry = detail.infobox.find((i) => i.key === '播放结束');
  if (!endEntry?.value) return undefined;
  const endDate = new Date(String(endEntry.value).replace(/(\d{4})年(\d{1,2})月(\d{1,2})日/, '$1-$2-$3'));
  if (Number.isNaN(endDate.getTime())) return undefined;
  return endDate < new Date();
}

async function fetchBangumiCharacters(subjectId) {
  try {
    const res = await fetchWithTimeout(`https://api.bgm.tv/v0/subjects/${subjectId}/characters`, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

function extractBangumiCast(detail) {
  const characters = Array.isArray(detail) ? detail : Array.isArray(detail?.crt) ? detail.crt : [];
  if (characters.length === 0) return [];

  return uniqueValues(
    characters
      .map((character) => {
        const actors = Array.isArray(character?.actors) ? character.actors : [];
        return actors[0]?.name || null;
      })
      .filter(Boolean)
  ).slice(0, MAX_CAST_MEMBERS);
}

function extractBangumiCastAliases(detail) {
  const characters = Array.isArray(detail) ? detail : Array.isArray(detail?.crt) ? detail.crt : [];
  if (characters.length === 0) return [];

  return uniqueValues(
    characters.flatMap((character) => {
      const actors = Array.isArray(character?.actors) ? character.actors : [];
      const primary = actors[0];
      return primary ? [primary.name, primary.name_cn].filter(Boolean) : [];
    })
  );
}

async function fetchAnimeMetadata(title) {
  const normalizedTitle = String(title || '').trim();
  if (!normalizedTitle) {
    return null;
  }

  const result = {};
  const providerMeta = {
    fieldSources: {},
    bangumiQuery: normalizedTitle,
    bangumiSubjectId: null,
  };
  let found = false;

  try {
    const bangumiSubject = await fetchBangumiSubject(normalizedTitle);

    if (bangumiSubject) {
      providerMeta.bangumiSubjectId = Number(bangumiSubject.id) || null;

      const bgmCover = bangumiSubject.images?.large || bangumiSubject.images?.common || bangumiSubject.images?.medium;
      if (bgmCover) {
        setFieldValue(result, providerMeta, 'coverUrl', String(bgmCover).replace('http://', 'https://'), 'bangumi', normalizedTitle);
      }

      if (bangumiSubject.name_cn) {
        setFieldValue(result, providerMeta, 'title', bangumiSubject.name_cn, 'bangumi', normalizedTitle);
      }

      if (bangumiSubject.name) {
        setFieldValue(result, providerMeta, 'originalTitle', bangumiSubject.name, 'bangumi', normalizedTitle);
      }

      const bangumiSubjectDate = normalizeDate(bangumiSubject.date || bangumiSubject.air_date);
      if (bangumiSubjectDate) {
        setFieldValue(result, providerMeta, 'premiereDate', bangumiSubjectDate, 'bangumi', normalizedTitle);
      }

      if (bangumiSubject.id) {
        const bangumiDetail = await fetchBangumiSubjectDetail(Number(bangumiSubject.id));

        if (bangumiDetail) {
          const bangumiDetailDate = normalizeDate(bangumiDetail.date || bangumiDetail.air_date);
          if (bangumiDetailDate) {
            setFieldValue(result, providerMeta, 'premiereDate', bangumiDetailDate, 'bangumi', normalizedTitle);
          }

          if (bangumiDetail.total_episodes && Number(bangumiDetail.total_episodes) > 0) {
            setFieldValue(result, providerMeta, 'totalEpisodes', Number(bangumiDetail.total_episodes), 'bangumi', normalizedTitle);
          } else if (bangumiDetail.eps && Number(bangumiDetail.eps) > 0) {
            setFieldValue(result, providerMeta, 'totalEpisodes', Number(bangumiDetail.eps), 'bangumi', normalizedTitle);
          }

          if (bangumiDetail.rating?.score) {
            setFieldValue(result, providerMeta, 'score', Number(bangumiDetail.rating.score), 'bangumi', normalizedTitle);
          }

          if (bangumiDetail.summary) {
            setFieldValue(result, providerMeta, 'summary', bangumiDetail.summary, 'bangumi', normalizedTitle);
          }

          const bangumiTags = extractBangumiTags(bangumiDetail);
          if (bangumiTags.length > 0) {
            setFieldValue(result, providerMeta, 'tags', bangumiTags, 'bangumi', normalizedTitle);
          }

          const bangumiIsFinished = extractBangumiIsFinished(bangumiDetail);
          if (bangumiIsFinished !== undefined) {
            setFieldValue(result, providerMeta, 'isFinished', bangumiIsFinished, 'bangumi', normalizedTitle);
          }

          const bangumiCharacters = await fetchBangumiCharacters(Number(bangumiSubject.id));
          const bangumiCast = extractBangumiCast(bangumiCharacters);
          if (bangumiCast.length > 0) {
            setFieldValue(result, providerMeta, 'cast', bangumiCast, 'bangumi', normalizedTitle);
            const bangumiCastAliases = extractBangumiCastAliases(bangumiCharacters);
            setFieldValue(result, providerMeta, 'castAliases', bangumiCastAliases, 'bangumi', normalizedTitle);
          }

          const durationMinutes = await fetchBangumiEpisodeDuration(Number(bangumiSubject.id));
          if (durationMinutes) {
            setFieldValue(result, providerMeta, 'durationMinutes', durationMinutes, 'bangumi', normalizedTitle);
          }
        }
      }

      found = true;
    }
  } catch (error) {
    console.error('Bangumi search failed', error);
  }

  if (!found) {
    return null;
  }

  result.__providerMeta = providerMeta;
  return result;
}

function normalizeQueries(queries) {
  const rawQueries = Array.isArray(queries[0]) && queries.length === 1 ? queries[0] : queries;
  return uniqueValues(rawQueries);
}

async function fetchAnimeMetadataByQueriesDetailed(...queries) {
  const dedupedQueries = normalizeQueries(queries);

  for (const query of dedupedQueries) {
    const metadata = await fetchAnimeMetadata(query);
    if (metadata) {
      return { metadata, query };
    }
  }

  return { metadata: null, query: dedupedQueries[0] || '' };
}

async function fetchAnimeMetadataByQueries(...queries) {
  const result = await fetchAnimeMetadataByQueriesDetailed(...queries);
  return result.metadata;
}

module.exports = {
  fetchAnimeMetadata,
  fetchAnimeMetadataByQueries,
  fetchAnimeMetadataByQueriesDetailed,
};