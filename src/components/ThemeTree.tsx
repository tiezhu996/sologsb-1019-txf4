import { For, Show, createMemo, createSignal } from 'solid-js';
import { Button, Chip, Paper, Typography } from '@suid/material';
import type { CoderId, ThemeCoverage } from '../types';
import type { useCodingStore } from '../store/coding-store';

type Store = ReturnType<typeof useCodingStore>;

const coverageItems: Array<{ key: ThemeCoverage; label: string; coder?: CoderId }> = [
  { key: 'A', label: '甲', coder: 'A' },
  { key: 'B', label: '乙', coder: 'B' },
  { key: 'both', label: '共同' }
];

export default function ThemeTree(props: { store: Store; onCreate: (parentId?: string) => void; onMerge: () => void; onSplit: () => void }) {
  const [query, setQuery] = createSignal('');
  const themes = createMemo(() => props.store.orderedThemes().filter((theme) => theme.name.toLowerCase().includes(query().toLowerCase())));
  const activeSegment = () => props.store.state.segments.find((segment) => segment.id === props.store.state.activeSegmentId);

  const countsFor = (themeId: string) => {
    let countA = 0;
    let countB = 0;
    let both = 0;
    props.store.state.segments.forEach((segment) => {
      const inA = segment.assignments.A.includes(themeId);
      const inB = segment.assignments.B.includes(themeId);
      if (inA) countA += 1;
      if (inB) countB += 1;
      if (inA && inB) both += 1;
    });
    return { A: countA, B: countB, both };
  };

  const isCoverageActive = (themeId: string, coverage: ThemeCoverage) => {
    const filter = props.store.segmentFilter();
    return filter?.type === 'theme' && filter.themeId === themeId && filter.coverage === coverage;
  };

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
      <div class="theme-help">勾选 A / B 为当前片段编码；点“甲 / 乙 / 共同”数字，可筛出对应覆盖情况的片段。</div>
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
          const counts = () => countsFor(theme.id);
          return (
            <div class="theme-row" classList={{ active: props.store.state.activeThemeId === theme.id, disagree: assignmentA() !== assignmentB() }}>
              <button class="theme-main" style={{ '--depth': depth(), '--theme-color': theme.color }} onClick={() => { props.store.selectTheme(theme.id); props.store.clearSegmentFilter(); }}>
                <span class="theme-color" />
                <span class="theme-name">{theme.name}</span>
              </button>
              <div class="theme-coverage" aria-label={`${theme.name} 覆盖片段筛选`}>
                <For each={coverageItems}>{(item) => (
                  <button
                    class="coverage-count"
                    classList={{ active: isCoverageActive(theme.id, item.key), a: item.key === 'A', b: item.key === 'B', both: item.key === 'both' }}
                    title={item.coder
                      ? `${item.coder === 'A' ? props.store.state.coderA : props.store.state.coderB}选中：${counts()[item.key]} 段（含共同）`
                      : `双方共同选中：${counts().both} 段`}
                    onClick={(event) => {
                      event.stopPropagation();
                      props.store.selectTheme(theme.id);
                      props.store.toggleThemeCoverageFilter(theme.id, item.key);
                    }}
                  >
                    <span>{item.label}</span><strong>{item.key === 'both' ? counts().both : counts()[item.key]}</strong>
                  </button>
                )}</For>
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
