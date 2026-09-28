import { For, Show, createMemo, createSignal } from 'solid-js';
import { Button, Chip, Paper, Typography } from '@suid/material';
import type { CoderId } from '../types';
import type { useCodingStore } from '../store/coding-store';

type Store = ReturnType<typeof useCodingStore>;

export default function ThemeTree(props: { store: Store; onCreate: (parentId?: string) => void; onMerge: () => void; onSplit: () => void }) {
  const [query, setQuery] = createSignal('');
  const themes = createMemo(() => props.store.orderedThemes().filter((theme) => theme.name.toLowerCase().includes(query().toLowerCase())));
  const activeSegment = () => props.store.state.segments.find((segment) => segment.id === props.store.state.activeSegmentId);

  const filterActive = (themeId: string, coder: CoderId | 'both') => {
    const filter = props.store.segmentFilter();
    return filter?.kind === 'theme' && filter.themeId === themeId && filter.coder === coder;
  };

  const coveragePill = (themeId: string, coder: CoderId | 'both', count: number, title: string) => (
    <button
      class="theme-count"
      classList={{ [`count-${coder}`]: true, active: filterActive(themeId, coder) }}
      title={title}
      disabled={count === 0}
      onClick={(event) => {
        event.stopPropagation();
        props.store.toggleSegmentFilter({ kind: 'theme', themeId, coder });
      }}
    >
      {count}
    </button>
  );

  return (
    <Paper class="panel tree-panel" elevation={0}>
      <div class="panel-heading">
        <div>
          <Typography variant="overline">02 / 主题体系</Typography>
          <Typography variant="h6">层级编码</Typography>
        </div>
        <Button size="small" variant="contained" onClick={() => props.onCreate()}>＋ 一级主题</Button>
      </div>
      <input class="native-input full" placeholder="筛选主题" value={query()} onInput={(event) => setQuery(event.currentTarget.value)} />
      <div class="theme-help">勾选 A / B 可将当前片段分配给该主题；点右侧数字可筛出对应片段。</div>
      <div class="coverage-legend">
        <span><i class="dot count-A" />{props.store.state.coderA}（A）选中</span>
        <span><i class="dot count-B" />{props.store.state.coderB}（B）选中</span>
        <span><i class="dot count-both" />双方共同</span>
      </div>
      <div class="theme-tree">
        <For each={themes()}>{(theme) => {
          const depth = () => {
            let current = theme;
            let level = 0;
            while (current.parentId) {
              level += 1;
              const parent = props.store.state.themes.find((item) => item.id === current.parentId);
              if (!parent) break;
              current = parent;
            }
            return level;
          };
          const assignmentA = () => activeSegment()?.assignments.A.includes(theme.id) ?? false;
          const assignmentB = () => activeSegment()?.assignments.B.includes(theme.id) ?? false;
          const coverage = () => props.store.themeCoverage(theme.id);
          return (
            <div class="theme-row" classList={{ active: props.store.state.activeThemeId === theme.id, disagree: assignmentA() !== assignmentB() }}>
              <button class="theme-main" style={{ '--depth': depth(), '--theme-color': theme.color }} onClick={() => props.store.selectTheme(theme.id)}>
                <span class="theme-color" />
                <span class="theme-name">{theme.name}</span>
              </button>
              <div class="theme-counts">
                {coveragePill(theme.id, 'A', coverage().byA, `${props.store.state.coderA}（A）选中该主题的片段（含共同）`)}
                {coveragePill(theme.id, 'B', coverage().byB, `${props.store.state.coderB}（B）选中该主题的片段（含共同）`)}
                {coveragePill(theme.id, 'both', coverage().shared, '两位编码者共同选中该主题的片段')}
              </div>
              <div class="theme-actions">
                <label title={`${props.store.state.coderA} 编码`}><input type="checkbox" checked={assignmentA()} disabled={!activeSegment()} onChange={(event) => activeSegment() && props.store.toggleAssignment(activeSegment()!.id, 'A', theme.id, event.currentTarget.checked)} /> A</label>
                <label title={`${props.store.state.coderB} 编码`}><input type="checkbox" checked={assignmentB()} disabled={!activeSegment()} onChange={(event) => activeSegment() && props.store.toggleAssignment(activeSegment()!.id, 'B', theme.id, event.currentTarget.checked)} /> B</label>
                <button class="icon-text" title="添加子主题" onClick={() => props.onCreate(theme.id)}>＋</button>
              </div>
            </div>
          );
        }}</For>
      </div>
      <Show when={props.store.state.activeThemeId}>
        <div class="tree-footer">
          <Chip size="small" label={`当前：${props.store.state.themes.find((theme) => theme.id === props.store.state.activeThemeId)?.name ?? '未选择'}`} />
          <div class="button-row">
            <Button size="small" onClick={props.onMerge}>合并主题</Button>
            <Button size="small" onClick={props.onSplit}>拆分主题</Button>
          </div>
        </div>
      </Show>
    </Paper>
  );
}
