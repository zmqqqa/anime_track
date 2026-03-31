"use client";

import Link from 'next/link';
import { useMemo } from 'react';
import {
  ArrowUpRightIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  SparklesIcon,
  StarIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { useAnimeData } from '@/hooks/useAnimeData';

const distributionColors = ['#7be7ff', '#62f0c2', '#9ae66e', '#f4bf62', '#f08ac2', '#74858a'];
const episodeBucketOrder: Record<string, number> = {
  '1-3 集': 0,
  '4-11 集': 1,
  '12-13 集': 2,
  '14-26 集': 3,
  '27+ 集': 4,
};

function formatPremiere(value?: string) {
  if (!value) return '未补充';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'short' }).format(date);
}

function getEpisodeBucketLabel(totalEpisodes?: number) {
  if (!totalEpisodes || totalEpisodes <= 0) {
    return undefined;
  }

  if (totalEpisodes <= 3) return '1-3 集';
  if (totalEpisodes <= 11) return '4-11 集';
  if (totalEpisodes <= 13) return '12-13 集';
  if (totalEpisodes <= 26) return '14-26 集';
  return '27+ 集';
}

type DistributionItem = {
  label: string;
  value: number;
  color: string;
};

function AtlasRingChart({ data }: { data: DistributionItem[] }) {
  const size = 208;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let offset = 0;

  return (
    <div className="relative flex h-[208px] w-[208px] items-center justify-center">
      <svg width={size} height={size} className="-rotate-90 drop-shadow-[0_12px_28px_rgba(0,0,0,0.35)]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(125, 145, 141, 0.16)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {data.map((item) => {
          const dash = total > 0 ? (item.value / total) * circumference : 0;
          const segment = (
            <circle
              key={item.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              fill="none"
              strokeLinecap="round"
            />
          );
          offset += dash;
          return segment;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-[radial-gradient(circle,rgba(8,18,16,0.96),rgba(8,18,16,0.88)_58%,transparent_59%)] text-center">
        <div className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">片库构成</div>
        <div className="mt-2 text-3xl font-mono text-zinc-100">{total}</div>
        <div className="mt-1 text-xs text-zinc-500">有总集数记录的作品</div>
      </div>
    </div>
  );
}

export default function AnimeAtlasPage() {
  const { animeList, animeTagStats, isLoading: animeLoading } = useAnimeData();

  const data = useMemo(() => {
    const episodeBucketCounts: Record<string, number> = {};
    const castCounts: Record<string, number> = {};

    animeList.forEach((anime) => {
      const episodeBucket = getEpisodeBucketLabel(anime.totalEpisodes);
      if (episodeBucket) {
        episodeBucketCounts[episodeBucket] = (episodeBucketCounts[episodeBucket] || 0) + 1;
      }

      if (Array.isArray(anime.cast)) {
        anime.cast.forEach((name) => {
          const normalized = String(name || '').trim();
          if (!normalized) return;
          castCounts[normalized] = (castCounts[normalized] || 0) + 1;
        });
      }
    });

    const scored = animeList
      .filter((anime) => typeof anime.score === 'number')
      .sort((left, right) => {
        const scoreDiff = (right.score ?? 0) - (left.score ?? 0);
        if (scoreDiff !== 0) return scoreDiff;
        return left.title.localeCompare(right.title, 'zh-CN');
      })
      .slice(0, 9);

    const premiered = animeList
      .filter((anime) => anime.premiereDate)
      .sort((left, right) => new Date(right.premiereDate ?? 0).getTime() - new Date(left.premiereDate ?? 0).getTime())
      .slice(0, 6);

    const metadataRichness = animeList.length
      ? Math.round(
          (animeList.filter((anime) => [anime.originalTitle, anime.score, anime.totalEpisodes, Array.isArray(anime.cast) && anime.cast.length > 0 ? 'cast' : '', anime.premiereDate, anime.summary].filter(Boolean).length >= 4).length /
            animeList.length) *
            100
        )
      : 0;

    return {
      scored,
      premiered,
      topEpisodeBuckets: Object.entries(episodeBucketCounts)
        .sort((left, right) => episodeBucketOrder[left[0]] - episodeBucketOrder[right[0]])
        .slice(0, 6),
      topVoiceActors: Object.entries(castCounts)
        .sort((left, right) => right[1] - left[1])
        .slice(0, 8),
      episodeDistribution: Object.entries(episodeBucketCounts)
        .sort((left, right) => episodeBucketOrder[left[0]] - episodeBucketOrder[right[0]])
        .map(([label, value], index) => ({
          label,
          value,
          color: distributionColors[index % distributionColors.length],
        })),
      metadataRichness,
    };
  }, [animeList]);

  const loading = animeLoading;
  const tagRows = animeTagStats.slice(0, 10);
  const tagMax = tagRows.reduce((max, item) => Math.max(max, item.count), 1);

  return (
    <main className="p-4 lg:p-8 pb-24 space-y-6 lg:space-y-8 animate-fade-in relative">
      <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_top_left,rgba(86,211,156,0.08),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(93,214,242,0.08),transparent_26%)]" />

      <section className="glass-panel-strong rounded-[36px] p-8 lg:p-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_35%),linear-gradient(135deg,rgba(86,211,156,0.1),transparent_42%,rgba(93,214,242,0.08))]" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4 max-w-3xl">
            <Link href="/" className="inline-flex items-center gap-1 text-zinc-400 hover:text-white text-sm transition-colors">
              <ChevronLeftIcon className="w-4 h-4" /> 返回总览
            </Link>
            <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-tight text-zinc-50">作品元数据图谱</h1>
            <p className="text-sm md:text-base text-zinc-400 leading-7">
              这里专门展示你的片库由哪些集数层级、声优排行、标签和作品评分构成。比起首页，它更偏向“片库剖面图”。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 min-w-full lg:min-w-[320px] lg:max-w-[360px]">
            <div className="surface-card rounded-[24px] p-4">
              <div className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">Library</div>
              <div className="mt-2 text-2xl font-mono text-zinc-100">{animeList.length}</div>
              <div className="text-xs text-zinc-500 mt-1">当前入库作品</div>
            </div>
            <div className="surface-card rounded-[24px] p-4">
              <div className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">Richness</div>
              <div className="mt-2 text-2xl font-mono text-emerald-300">{data.metadataRichness}%</div>
              <div className="text-xs text-zinc-500 mt-1">档案完整度</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 relative z-10">
        <div className="xl:col-span-5 glass-panel rounded-[32px] p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-6">
            <SparklesIcon className="w-5 h-5 text-emerald-300" />
            <h2 className="text-xl font-display font-semibold text-zinc-100">集数分布</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-center">
            <div className="surface-card rounded-[30px] p-6 flex flex-col items-center justify-center gap-4">
              <AtlasRingChart data={data.episodeDistribution} />
              <div className="text-center text-sm leading-6 text-zinc-400">
                按总集数区间看你的片库构成
              </div>
            </div>
            <div className="space-y-3">
              {data.topEpisodeBuckets.map(([name, count], index) => (
                <div key={name} className="surface-card-muted rounded-[20px] px-4 py-3">
                  <div className="flex items-center justify-between gap-3 text-sm text-zinc-300">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: distributionColors[index % distributionColors.length] }} />
                      <span className="truncate">{name}</span>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-zinc-400">{count} 部</div>
                      <div className="mt-0.5 text-[11px] text-zinc-600">
                        {data.episodeDistribution.length ? Math.round((count / Math.max(data.episodeDistribution.reduce((sum, item) => sum + item.value, 0), 1)) * 100) : 0}%
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(count / Math.max(data.topEpisodeBuckets.reduce((max, [, value]) => Math.max(max, value), 1), 1)) * 100}%`,
                        background: `linear-gradient(90deg, ${distributionColors[index % distributionColors.length]}, rgba(255,255,255,0.92))`,
                      }}
                    />
                  </div>
                </div>
              ))}
              {!data.topEpisodeBuckets.length && <div className="text-sm text-zinc-500">总集数字段还比较稀疏。</div>}
            </div>
          </div>
        </div>

        <div className="xl:col-span-7 glass-panel rounded-[32px] p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-6">
            <TagIcon className="w-5 h-5 text-cyan-300" />
            <h2 className="text-xl font-display font-semibold text-zinc-100">标签排行</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px] gap-6">
            <div className="space-y-3">
              {tagRows.map((tag) => (
                <div key={tag.tag} className="surface-card-muted rounded-[22px] px-4 py-3">
                  <div className="flex items-center justify-between gap-3 text-sm text-zinc-300">
                    <span>{tag.tag}</span>
                    <span className="text-zinc-500">{tag.count} 部</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300" style={{ width: `${(tag.count / tagMax) * 100}%` }} />
                  </div>
                </div>
              ))}
              {!tagRows.length && <div className="text-sm text-zinc-500">标签数据还不够多，后续可以多用 AI 补全。</div>}
            </div>
            <div className="surface-card rounded-[28px] p-5 flex flex-col justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">标签摘要</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {tagRows.slice(0, 6).map((tag) => (
                    <span key={tag.tag} className="surface-pill rounded-full px-3 py-1.5 text-xs text-zinc-300">
                      {tag.tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-[24px] border border-cyan-300/15 bg-cyan-300/8 p-4">
                <div className="flex items-center gap-2 text-cyan-100">
                  <SparklesIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">AI 补全建议</span>
                </div>
                <p className="mt-2 text-sm text-zinc-300 leading-6">
                  如果这里字段还偏空，可以继续走详情页 AI 补充，totalEpisodes、premiereDate、cast、summary 这些会让图谱更完整。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 relative z-10">
        <div className="xl:col-span-7 glass-panel rounded-[32px] p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-6">
            <StarIcon className="w-5 h-5 text-amber-300" />
            <h2 className="text-xl font-display font-semibold text-zinc-100">作品评分</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.scored.map((anime, index) => (
              <Link key={anime.id} href={`/anime/${anime.id}`} className="group surface-card-muted rounded-[28px] overflow-hidden hover:border-amber-300/20 transition-all duration-300">
                <div className="h-40 bg-zinc-900/70 bg-cover bg-center" style={anime.coverUrl ? { backgroundImage: `linear-gradient(180deg, rgba(7,17,15,0.05), rgba(7,17,15,0.9)), url(${anime.coverUrl})` } : undefined} />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Rank #{index + 1}</div>
                      <div className="mt-1 text-lg text-zinc-100 truncate">{anime.title}</div>
                      <div className="text-xs text-zinc-500 truncate">{anime.originalTitle ?? '未补充原名'}</div>
                    </div>
                    <div className="shrink-0 rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-sm text-amber-100">
                      {anime.score?.toFixed(1)}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            {!data.scored.length && <div className="text-sm text-zinc-500">评分字段还不够丰富，之后可以继续补齐。</div>}
          </div>
        </div>

        <div className="xl:col-span-5 space-y-6">
          <div className="glass-panel rounded-[32px] p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-6">
              <TagIcon className="w-5 h-5 text-violet-300" />
              <h2 className="text-xl font-display font-semibold text-zinc-100">声优排行</h2>
            </div>
            <div className="space-y-2.5">
              {data.topVoiceActors.map(([name, count], index) => (
                <div key={name} className="surface-card-muted rounded-[18px] px-4 py-3 text-sm text-zinc-300">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.04] text-[11px] font-mono text-zinc-400">
                        {index + 1}
                      </span>
                      <span className="truncate">{name}</span>
                    </div>
                    <span className="text-zinc-500 shrink-0">{count} 部</span>
                  </div>
                </div>
              ))}
              {!data.topVoiceActors.length && <div className="text-sm text-zinc-500">声优信息还没有形成排行。</div>}
            </div>
          </div>

          <div className="glass-panel rounded-[32px] p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-6">
              <CalendarDaysIcon className="w-5 h-5 text-sky-300" />
              <h2 className="text-xl font-display font-semibold text-zinc-100">追番列表中最近开播作品</h2>
            </div>
            <div className="space-y-3">
              {data.premiered.map((anime) => (
                <Link key={anime.id} href={`/anime/${anime.id}`} className="group surface-card-muted flex items-center justify-between gap-3 rounded-[20px] px-4 py-3 hover:border-sky-300/20 transition-all">
                  <div className="min-w-0">
                    <div className="text-sm text-zinc-200 truncate">{anime.title}</div>
                    <div className="text-xs text-zinc-500 truncate">{formatPremiere(anime.premiereDate)} · {anime.totalEpisodes ? `${anime.totalEpisodes} 集` : '集数未补充'}</div>
                  </div>
                  <ArrowUpRightIcon className="w-4 h-4 text-zinc-600 group-hover:text-sky-300 transition-colors" />
                </Link>
              ))}
              {!data.premiered.length && <div className="text-sm text-zinc-500">首播日期字段暂时较少。</div>}
            </div>
          </div>
        </div>
      </section>

      {loading && (
        <div className="text-sm text-zinc-500 font-mono px-2">ATLAS_LOADING...</div>
      )}
    </main>
  );
}