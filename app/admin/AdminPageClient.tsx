"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import ConfirmDialog from '@/components/shared/ConfirmDialog';

type SessionUser = { role?: string };
type TabKey = 'anime' | 'history';

interface AnimeRow {
  id: number;
  title: string;
  original_title: string | null;
  status: string;
  score: number | null;
  progress: number;
  totalEpisodes: number | null;
  createdAt: string;
}

interface HistoryRow {
  id: number;
  animeId: number;
  animeTitle: string;
  episode: number;
  watchedAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  watching: '追番中',
  completed: '已看完',
  dropped: '已弃坑',
  plan_to_watch: '计划看',
};

const STATUS_COLOR: Record<string, string> = {
  watching: 'text-emerald-400',
  completed: 'text-blue-400',
  dropped: 'text-zinc-500',
  plan_to_watch: 'text-amber-400',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─────────────────────────────────────────────
// Shared: search bar + delete button + pagination
// ─────────────────────────────────────────────

function SearchBar({ value, onChange, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative flex-1">
      <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/[0.04] border border-white/10 text-base text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-400/30 focus:bg-white/[0.06] transition-all"
      />
    </div>
  );
}

function DeleteButton({ count, onClick, disabled }: {
  count: number;
  onClick: () => void;
  disabled: boolean;
}) {
  if (count === 0) return null;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-medium hover:bg-red-500/20 transition-all disabled:opacity-50 whitespace-nowrap"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
      </svg>
      删除选中 ({count})
    </button>
  );
}

function Pagination({ page, totalPages, pageSize, total, onPageChange }: {
  page: number;
  totalPages: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-white/5">
      <p className="text-sm text-zinc-500">
        第 {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} 条，共 {total} 条
      </p>
      <div className="flex items-center gap-1.5">
        {[
          { label: '首页', disabled: page <= 1, onClick: () => onPageChange(1) },
          { label: '上一页', disabled: page <= 1, onClick: () => onPageChange(Math.max(1, page - 1)) },
        ].map((btn) => (
          <button key={btn.label} onClick={btn.onClick} disabled={btn.disabled}
            className="px-3 py-2 rounded-xl text-sm text-zinc-400 hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
            {btn.label}
          </button>
        ))}
        <span className="px-3 py-2 text-sm text-zinc-300 tabular-nums">{page} / {totalPages}</span>
        {[
          { label: '下一页', disabled: page >= totalPages, onClick: () => onPageChange(Math.min(totalPages, page + 1)) },
          { label: '末页', disabled: page >= totalPages, onClick: () => onPageChange(totalPages) },
        ].map((btn) => (
          <button key={btn.label} onClick={btn.onClick} disabled={btn.disabled}
            className="px-3 py-2 rounded-xl text-sm text-zinc-400 hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-400 focus:ring-emerald-400/30 focus:ring-offset-0 cursor-pointer"
    />
  );
}

function SkeletonRows({ cols, rows = 8 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-white/[0.03]">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-5 py-4">
              <div className="h-5 bg-white/5 rounded-lg animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─────────────────────────────────────────────
// Anime Records Tab
// ─────────────────────────────────────────────

function AnimeTab() {
  const [records, setRecords] = useState<AnimeRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ ids: number[] } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/anime?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRecords(data.records);
      setTotal(data.total);
    } catch {
      toast.error('加载番剧列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleSearchInput = (value: string) => {
    setSearchInput(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
      setSelected(new Set());
    }, 400);
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected(selected.size === records.length ? new Set() : new Set(records.map((r) => r.id)));
  };

  const handleDelete = async (ids: number[]) => {
    setDeleting(true);
    try {
      const res = await fetch('/api/admin/anime', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error();
      toast.success(`已删除 ${ids.length} 条番剧记录`);
      setSelected((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      fetchRecords();
    } catch {
      toast.error('删除失败');
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <SearchBar value={searchInput} onChange={handleSearchInput} placeholder="搜索番剧名称..." />
        <DeleteButton count={selected.size} onClick={() => setConfirmDelete({ ids: Array.from(selected) })} disabled={deleting} />
      </div>

      <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 text-zinc-400 text-left text-sm">
                <th className="px-5 py-4 w-12"><Checkbox checked={records.length > 0 && selected.size === records.length} onChange={toggleSelectAll} /></th>
                <th className="px-5 py-4 font-medium">ID</th>
                <th className="px-5 py-4 font-medium">标题</th>
                <th className="px-5 py-4 font-medium">状态</th>
                <th className="px-5 py-4 font-medium">评分</th>
                <th className="px-5 py-4 font-medium">进度</th>
                <th className="px-5 py-4 font-medium">创建时间</th>
                <th className="px-5 py-4 font-medium w-20">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={8} />
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-zinc-500 text-base">
                    {search ? '没有找到匹配的番剧' : '暂无番剧记录'}
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className={`border-b border-white/[0.03] transition-colors ${selected.has(r.id) ? 'bg-emerald-400/[0.04]' : 'hover:bg-white/[0.02]'}`}>
                    <td className="px-5 py-4"><Checkbox checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} /></td>
                    <td className="px-5 py-4 text-zinc-500 tabular-nums text-sm">{r.id}</td>
                    <td className="px-5 py-4">
                      <div className="text-zinc-200 font-medium text-base truncate max-w-xs" title={r.title}>{r.title}</div>
                      {r.original_title && (
                        <div className="text-zinc-500 text-sm mt-0.5 truncate max-w-xs" title={r.original_title}>{r.original_title}</div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-sm font-medium ${STATUS_COLOR[r.status] || 'text-zinc-400'}`}>
                        {STATUS_LABEL[r.status] || r.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-zinc-300 tabular-nums text-sm">{r.score != null ? `${r.score} 分` : '—'}</td>
                    <td className="px-5 py-4 text-zinc-300 tabular-nums text-sm">
                      {r.progress}{r.totalEpisodes ? ` / ${r.totalEpisodes}` : ''} 集
                    </td>
                    <td className="px-5 py-4 text-zinc-400 tabular-nums text-sm">{formatDate(r.createdAt)}</td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => setConfirmDelete({ ids: [r.id] })}
                        disabled={deleting}
                        className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                        title="删除"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} pageSize={pageSize} total={total} onPageChange={setPage} />
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="确认删除番剧"
        message={
          confirmDelete && confirmDelete.ids.length > 1
            ? `确定要删除选中的 ${confirmDelete.ids.length} 部番剧吗？相关的观看记录也会一起删除，此操作不可撤销。`
            : '确定要删除这部番剧吗？相关的观看记录也会一起删除，此操作不可撤销。'
        }
        confirmText="删除"
        variant="danger"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete.ids)}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}

// ─────────────────────────────────────────────
// History Records Tab
// ─────────────────────────────────────────────

function HistoryTab() {
  const [records, setRecords] = useState<HistoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ ids: number[] } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/history?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRecords(data.records);
      setTotal(data.total);
    } catch {
      toast.error('加载历史记录失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleSearchInput = (value: string) => {
    setSearchInput(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
      setSelected(new Set());
    }, 400);
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected(selected.size === records.length ? new Set() : new Set(records.map((r) => r.id)));
  };

  const handleDelete = async (ids: number[]) => {
    setDeleting(true);
    try {
      if (ids.length === 1) {
        const res = await fetch(`/api/admin/history/${ids[0]}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
      } else {
        const res = await fetch('/api/admin/history', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        });
        if (!res.ok) throw new Error();
      }
      toast.success(`已删除 ${ids.length} 条记录`);
      setSelected((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      fetchRecords();
    } catch {
      toast.error('删除失败');
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <SearchBar value={searchInput} onChange={handleSearchInput} placeholder="搜索番剧名称..." />
        <DeleteButton count={selected.size} onClick={() => setConfirmDelete({ ids: Array.from(selected) })} disabled={deleting} />
      </div>

      <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 text-zinc-400 text-left text-sm">
                <th className="px-5 py-4 w-12"><Checkbox checked={records.length > 0 && selected.size === records.length} onChange={toggleSelectAll} /></th>
                <th className="px-5 py-4 font-medium">ID</th>
                <th className="px-5 py-4 font-medium">番剧名称</th>
                <th className="px-5 py-4 font-medium">集数</th>
                <th className="px-5 py-4 font-medium">观看时间</th>
                <th className="px-5 py-4 font-medium w-20">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={6} />
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-zinc-500 text-base">
                    {search ? '没有找到匹配的记录' : '暂无历史记录'}
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className={`border-b border-white/[0.03] transition-colors ${selected.has(r.id) ? 'bg-emerald-400/[0.04]' : 'hover:bg-white/[0.02]'}`}>
                    <td className="px-5 py-4"><Checkbox checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} /></td>
                    <td className="px-5 py-4 text-zinc-500 tabular-nums text-sm">{r.id}</td>
                    <td className="px-5 py-4 text-zinc-200 font-medium text-base truncate max-w-xs" title={r.animeTitle}>{r.animeTitle}</td>
                    <td className="px-5 py-4 text-zinc-300 tabular-nums text-sm">第 {r.episode} 集</td>
                    <td className="px-5 py-4 text-zinc-400 tabular-nums text-sm">{formatDate(r.watchedAt)}</td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => setConfirmDelete({ ids: [r.id] })}
                        disabled={deleting}
                        className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                        title="删除"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} pageSize={pageSize} total={total} onPageChange={setPage} />
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="确认删除"
        message={
          confirmDelete && confirmDelete.ids.length > 1
            ? `确定要删除选中的 ${confirmDelete.ids.length} 条观看记录吗？此操作不可撤销。`
            : '确定要删除这条观看记录吗？此操作不可撤销。'
        }
        confirmText="删除"
        variant="danger"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete.ids)}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

export default function AdminPageClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = (session?.user as SessionUser | undefined)?.role;

  const [activeTab, setActiveTab] = useState<TabKey>('anime');

  useEffect(() => {
    if (status === 'authenticated' && role !== 'admin') {
      router.replace('/');
    }
  }, [status, role, router]);

  if (status === 'loading' || (status === 'authenticated' && role !== 'admin')) {
    return <main className="p-6 text-zinc-400">验证权限中...</main>;
  }

  return (
    <main className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-display tracking-tight text-zinc-100">数据管理</h1>
        <p className="text-base text-zinc-500 mt-2">管理番剧条目和观看记录</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/5 w-fit">
        {([
          { key: 'anime' as TabKey, label: '番剧记录', count: null },
          { key: 'history' as TabKey, label: '观看历史', count: null },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white/10 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'anime' ? <AnimeTab /> : <HistoryTab />}
    </main>
  );
}
