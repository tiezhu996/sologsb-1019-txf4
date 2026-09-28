import { For, Show, createEffect, createMemo, createSignal } from 'solid-js';
import { Button, Checkbox, Chip, Divider, Paper, Typography } from '@suid/material';
import type { CoderId } from '../types';
import type { useCodingStore } from '../store/coding-store';

type Store = ReturnType<typeof useCodingStore>;

export default function TranscriptPanel(props: { store: Store }) {
  const [query, setQuery] = createSignal('');
  const [selected, setSelected] = createSignal<string[]>([]);
  const [batchTheme, setBatchTheme] = createSignal('');

  const orderedSegments = createMemo(() => props.store.state.segments
    .filter((segment) => segment.transcriptId === props.store.state.activeTranscriptId)
    .sort((a, b) => a.order - b.order));

  const segments = createMemo(() => orderedSegments()
    .filter((segment) => `${segment.speaker} ${segment.text}`.toLowerCase().includes(query().toLowerCase()))
    .filter((segment) => props.store.segmentMatchesFilter(segment, props.store.segmentFilter())));

  const pendingCount = (coder: CoderId) => orderedSegments().filter((segment) => segment.assignments[coder].length === 0).length;
  const isPendingActive = (coder: CoderId) => {
    const filter = props.store.segmentFilter();
    return filter?.type === 'pending' && filter.coder === coder;
  };

  const activeFilterLabel = () => {
    const filter = props.store.segmentFilter();
    if (!filter) return '';
    if (filter.type === 'pending') {
      return `只看${filter.coder === 'A' ? props.store.state.coderA : props.store.state.coderB}未处理`;
    }
    const theme = props.store.state.themes.find((item) => item.id === filter.themeId);
    const coverage = filter.coverage === 'A' ? '甲选中' : filter.coverage === 'B' ? '乙选中' : '双方共同选中';
    return `${theme?.name ?? '未知主题'} · ${coverage}`;
  };

  createEffect(() => {
    props.store.segmentFilter();
    setSelected([]);
  });

  const toggleSelected = (id: string) => {
    setSelected((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  };

  const toggleAll = () => {
    const ids = segments().map((segment) => segment.id);
    setSelected(selected().length === ids.length ? [] : ids);
  };

  const assignBatch = () => {
    if (!batchTheme()) return;
    props.store.batchAssign(selected(), 'A', batchTheme());
    setSelected([]);
  };

  return (
    <Paper class="panel transcript-panel" elevation={0}>
      <div class="panel-heading">
        <div>
          <Typography variant="overline">01 / 转写片段</Typography>
          <Typography variant="h6">访谈原文</Typography>
        </div>
        <Chip size="small" label={`${segments().length}/${orderedSegments().length} 段`} />
      </div>
      <select
        class="native-select full"
        aria-label="选择访谈"
        value={props.store.state.activeTranscriptId}
        onChange={(event) => {
          const transcript = props.store.state.transcripts.find((item) => item.id === event.currentTarget.value);
          if (!transcript) return;
          const first = props.store.state.segments.find((segment) => segment.transcriptId === transcript.id);
          props.store.selectTranscript(transcript.id);
          if (first) props.store.selectSegment(first.id);
        }}
      >
        <For each={props.store.state.transcripts}>{(transcript) => <option value={transcript.id}>{transcript.title}</option>}</For>
      </select>
      <div class="search-row">
        <input class="native-input" placeholder="搜索原文或发言人（/）" value={query()} onInput={(event) => setQuery(event.currentTarget.value)} />
        <Button size="small" onClick={toggleAll} disabled={!segments().length}>{selected().length === segments().length && segments().length ? '取消全选' : '全选'}</Button>
      </div>
      <div class="coder-filter-row" role="group" aria-label="按编码者处理状态筛选">
        <button
          class="coder-filter a"
          classList={{ active: isPendingActive('A') }}
          onClick={() => props.store.togglePendingFilter('A')}
          title={`只显示${props.store.state.coderA}尚未选择任何主题的段落`}
        >
          甲未处理 <strong>{pendingCount('A')}</strong>
        </button>
        <button
          class="coder-filter b"
          classList={{ active: isPendingActive('B') }}
          onClick={() => props.store.togglePendingFilter('B')}
          title={`只显示${props.store.state.coderB}尚未选择任何主题的段落`}
        >
          乙未处理 <strong>{pendingCount('B')}</strong>
        </button>
      </div>
      <Show when={props.store.segmentFilter()}>
        <div class="active-filter-line">
          <Chip size="small" color="primary" label={activeFilterLabel()} onDelete={props.store.clearSegmentFilter} />
        </div>
      </Show>
      <div class="batch-row">
        <select class="native-select" value={batchTheme()} onChange={(event) => setBatchTheme(event.currentTarget.value)}>
          <option value="">批量分配给…</option>
          <For each={props.store.orderedThemes()}>{(theme) => <option value={theme.id}>{theme.name}</option>}</For>
        </select>
        <Button variant="contained" size="small" disabled={!selected().length || !batchTheme()} onClick={assignBatch}>应用</Button>
      </div>
      <Divider />
      <div class="segment-list">
        <For each={segments()} fallback={<div class="empty-state">当前筛选没有匹配片段。可清除主题或“未处理”筛选后再看。</div>}>{(segment, index) => {
          const isActive = () => props.store.state.activeSegmentId === segment.id;
          const themeNames = () => [...new Set([...segment.assignments.A, ...segment.assignments.B])]
            .map((id) => props.store.state.themes.find((theme) => theme.id === id)?.name ?? '未知主题');
          return (
            <article
              class="segment-card"
              classList={{ active: isActive() }}
              onClick={() => props.store.selectSegment(segment.id)}
              tabIndex={0}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') props.store.selectSegment(segment.id); }}
            >
              <div class="segment-meta">
                <Checkbox
                  size="small"
                  checked={selected().includes(segment.id)}
                  onClick={(event) => { event.stopPropagation(); toggleSelected(segment.id); }}
                  inputProps={{ 'aria-label': `选择片段 ${index() + 1}` }}
                />
                <span class="segment-index">#{index() + 1}</span>
                <span class="segment-time">{segment.time}</span>
                <strong>{segment.speaker}</strong>
                <Show when={segment.assignments.A.join('|') !== segment.assignments.B.join('|')}>
                  <span class="conflict-dot" title="两位编码者判断不一致">分歧</span>
                </Show>
              </div>
              <p>{segment.text}</p>
              <Show when={themeNames().length}>
                <div class="chip-line"><For each={themeNames()}>{(name) => <Chip size="small" label={name} />}</For></div>
              </Show>
              <Show when={segment.note}><div class="segment-note">编码备忘：{segment.note}</div></Show>
            </article>
          );
        }}</For>
      </div>
    </Paper>
  );
}
