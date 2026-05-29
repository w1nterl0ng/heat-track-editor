import React, { useState } from 'react';
import { useEditorStore } from '../store/editorStore';

// ── Static checklist definition ────────────────────────────────────────────

interface ChecklistItem {
  id: string;
  label: string;
  help: string;
}

interface ChecklistGroup {
  group: string;
  items: ChecklistItem[];
}

const CHECKLIST_GROUPS: ChecklistGroup[] = [
  {
    group: 'Track Setup',
    items: [
      {
        id: 'bg_loaded',
        label: 'Background image loaded',
        help: 'Click the 📷 Image button in the toolbar to upload a satellite map or board scan as your reference background.',
      },
      {
        id: 'bg_aligned',
        label: 'BG layer aligned to world',
        help: 'Switch to the BG Layer tool (B) to position, scale, and align your background image to the tile grid. Use the tile grid overlay (#) to line up tile boundaries.',
      },
      {
        id: 'spline_complete',
        label: 'Track spline complete',
        help: 'Use the Edit tool (V) and click the canvas to place Catmull-Rom spline control points around the track centerline. Click the first node again to close the loop.',
      },
      {
        id: 'corners_marked',
        label: 'Corners marked',
        help: 'Shift-click a node at each corner entry, then press C to mark it as a corner. Corners define sector boundaries and are shown in red.',
      },
    ],
  },
  {
    group: 'Track Properties',
    items: [
      {
        id: 'meta_set',
        label: 'Track name & ID set',
        help: 'In the Track tab, fill in the track name (e.g. "España"), the track ID (lowercase, used in file names, e.g. "spain"), and the country.',
      },
      {
        id: 'game_values',
        label: 'Width, laps, heat & stress set',
        help: 'Set the track width slider so the rendered track matches the physical board. Set laps (usually 2), starting heat cards, and stress cards in the Track tab.',
      },
      {
        id: 'credits',
        label: 'Designer & editor credited',
        help: 'Fill in the Track Designer (the person who created the physical layout) and Track Editor (the person building this digital file) fields in the Track tab.',
      },
    ],
  },
  {
    group: 'Sectors',
    items: [
      {
        id: 'finish_line',
        label: 'Finish line placed',
        help: 'Shift-click the node at the start/finish straight and press F. There can only be one finish line per track. It appears as a yellow dashed line.',
      },
      {
        id: 'chicanes',
        label: 'Chicane sectors flagged',
        help: 'In the Sectors tab, tick the Chicane checkbox for any sector that forms a chicane. Both bounding corners share the same speed limit, and blue curbing stripes replace the standard red ones.',
      },
      {
        id: 'race_lines',
        label: 'All race lines set (L/R)',
        help: 'In the Sectors tab, set the race line side for each sector. This tells drivers which side of the track to aim for through the sector.',
      },
      {
        id: 'corner_speeds',
        label: 'All corner speeds set',
        help: 'Set the corner speed limit (end of each sector) in the Sectors tab. The default is 4 — most real corners should differ from this.',
      },
      {
        id: 'lollipop_sides',
        label: 'Corner lollipop sides set',
        help: 'Select a corner node and press I to flip which side its speed-limit sign appears on. The current side is shown in the Sectors tab. Set the post on whichever edge faces the driver approaching the corner.',
      },
      {
        id: 'legends_lines',
        label: 'All legends lines placed',
        help: 'Shift-click a node within each sector and press L to set the Legends expansion entry line. Every sector needs exactly one, placed roughly mid-sector or where the real board marker appears.',
      },
      {
        id: 'legend_lollipop_sides',
        label: 'Legends lollipop sides set',
        help: 'Select a legends line node and press I to flip which side its legends sign appears on. The current side is shown in the Sectors tab. It should default to the opposite of the corner lollipop.',
      },
      {
        id: 'legend_countdowns',
        label: 'All legend countdowns set',
        help: 'In the Sectors tab, set the aggression level (none / ➤ / ➤➤) for each of the up to 4 countdown marker positions. These tell Legends expansion drivers how aggressively to play that space.',
      },
      {
        id: 'countdown_sides',
        label: 'Countdown number sides set',
        help: 'In the Sectors tab, use the Inner/Outer toggle under "Countdown numbers side" to set which track edge the countdown numbers (and legend diamonds) appear on.',
      },
    ],
  },
  {
    group: 'Conditions',
    items: [
      {
        id: 'surfaces',
        label: 'Surfaces painted',
        help: 'Switch to the Surface tool (S) and drag over spaces to paint surface types: tunnel (T), flooded (W), or gravel (G). Use keys 1/2/3 to set both/outside/inside. Leave plain spaces as default asphalt.',
      },
      {
        id: 'condition_markers',
        label: 'Condition markers placed & rotated',
        help: 'Switch to the Condition tool (D) and click "Auto-generate markers". Drag each marker to its correct board position. Use the scroll wheel to rotate it (hold Shift for 1° steps). All markers should have a non-zero rotation.',
      },
      {
        id: 'weather_token',
        label: 'Weather token placed & sized',
        help: 'In the Condition tool (D), click "+ Place weather token". Drag it to the correct board location. Use the scroll wheel to scale it to match the physical board (hold Shift for fine control).',
      },
    ],
  },
  {
    group: 'Final Steps',
    items: [
      {
        id: 'export_review',
        label: 'Export checklist reviewed',
        help: 'Switch to the Export tab in the sidebar and verify all FATAL items are green. Resolve any warnings as needed before exporting.',
      },
      {
        id: 'hte_saved',
        label: '.hte package saved',
        help: 'Click the 💾 Save button in the toolbar to save the full editor package as a .hte file. This preserves all settings including this checklist for future sessions.',
      },
      {
        id: 'v2_exported',
        label: 'V2 package exported',
        help: 'In the Export tab, click the V2 bundle button to generate the ZIP containing the track JSON, background tiles, and preview image. Drop it in the game\'s TracksImport folder.',
      },
    ],
  },
];

const ALL_ITEM_IDS = CHECKLIST_GROUPS.flatMap(g => g.items.map(it => it.id));
const TOTAL = ALL_ITEM_IDS.length;

// ── Component ───────────────────────────────────────────────────────────────

export const ChecklistPanel: React.FC = () => {
  const { checklistItems, toggleChecklistItem, resetChecklist } = useEditorStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const done = ALL_ITEM_IDS.filter(id => checklistItems[id]).length;

  const selectedItem = selectedId
    ? CHECKLIST_GROUPS.flatMap(g => g.items).find(it => it.id === selectedId) ?? null
    : null;

  const handleReset = () => {
    if (confirmReset) {
      resetChecklist();
      setConfirmReset(false);
      setSelectedId(null);
    } else {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
    }
  };

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>Track Creation Guide</div>
        <div style={styles.progress}>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${(done / TOTAL) * 100}%` }} />
          </div>
          <span style={styles.progressLabel}>{done} / {TOTAL}</span>
        </div>
      </div>

      {/* Checklist groups */}
      <div style={styles.listArea}>
        {CHECKLIST_GROUPS.map(group => (
          <div key={group.group} style={styles.group}>
            <div style={styles.groupLabel}>{group.group}</div>
            {group.items.map(item => {
              const checked = !!checklistItems[item.id];
              const isSelected = selectedId === item.id;
              return (
                <div
                  key={item.id}
                  style={{
                    ...styles.item,
                    ...(isSelected ? styles.itemSelected : {}),
                    ...(checked ? styles.itemChecked : {}),
                  }}
                >
                  <button
                    style={{ ...styles.checkbox, ...(checked ? styles.checkboxChecked : {}) }}
                    onClick={() => toggleChecklistItem(item.id)}
                    title="Click to toggle"
                  >
                    {checked ? '✓' : ''}
                  </button>
                  <span
                    style={{ ...styles.itemLabel, ...(checked ? styles.itemLabelChecked : {}) }}
                    onClick={() => toggleChecklistItem(item.id)}
                  >
                    {item.label}
                  </span>
                  <button
                    style={{ ...styles.helpBtn, ...(isSelected ? styles.helpBtnActive : {}) }}
                    onClick={() => setSelectedId(isSelected ? null : item.id)}
                    title="Show help"
                  >
                    ?
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Help / description area */}
      <div style={styles.helpArea}>
        {selectedItem ? (
          <>
            <div style={styles.helpTitle}>{selectedItem.label}</div>
            <div style={styles.helpText}>{selectedItem.help}</div>
          </>
        ) : (
          <div style={styles.helpPlaceholder}>Click ? next to any item for guidance.</div>
        )}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <button
          style={{ ...styles.resetBtn, ...(confirmReset ? styles.resetBtnConfirm : {}) }}
          onClick={handleReset}
        >
          {confirmReset ? '⚠ Confirm reset?' : '↺ Reset checklist'}
        </button>
      </div>
    </div>
  );
};

// ── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'absolute',
    top: 0, left: 0,
    width: 290,
    height: '100%',
    background: '#0f172a',
    borderRight: '1px solid #1e293b',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 20,
    boxShadow: '4px 0 24px rgba(0,0,0,0.5)',
    overflow: 'hidden',
  },

  header: {
    padding: '10px 12px 8px',
    borderBottom: '1px solid #1e293b',
    flexShrink: 0,
  },
  headerTitle: {
    color: '#cbd5e1',
    fontWeight: 700,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 8,
  },
  progress: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 4,
    background: '#1e293b',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: '#22c55e',
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
  progressLabel: {
    color: '#64748b',
    fontSize: 10,
    fontFamily: 'monospace',
    flexShrink: 0,
  },

  listArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '6px 0',
  },

  group: {
    marginBottom: 4,
  },
  groupLabel: {
    padding: '5px 12px 3px',
    color: '#475569',
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    borderBottom: '1px solid #1e293b',
    marginBottom: 2,
  },

  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 8px 4px 10px',
    cursor: 'default',
    borderLeft: '2px solid transparent',
    transition: 'background 0.1s',
  },
  itemSelected: {
    background: '#0f2137',
    borderLeft: '2px solid #3b82f6',
  },
  itemChecked: {
    opacity: 0.55,
  },

  checkbox: {
    width: 16,
    height: 16,
    flexShrink: 0,
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 3,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    color: '#22c55e',
    fontWeight: 700,
    padding: 0,
  },
  checkboxChecked: {
    background: '#14532d',
    border: '1px solid #22c55e',
  },

  itemLabel: {
    flex: 1,
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: '16px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  itemLabelChecked: {
    textDecoration: 'line-through',
    color: '#475569',
  },

  helpBtn: {
    width: 16,
    height: 16,
    flexShrink: 0,
    background: 'transparent',
    border: '1px solid #334155',
    borderRadius: '50%',
    color: '#475569',
    fontSize: 9,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    lineHeight: 1,
  },
  helpBtnActive: {
    background: '#1e3a5f',
    border: '1px solid #3b82f6',
    color: '#93c5fd',
  },

  helpArea: {
    flexShrink: 0,
    minHeight: 80,
    maxHeight: 140,
    padding: '8px 12px',
    borderTop: '1px solid #1e293b',
    background: '#060d18',
    overflowY: 'auto',
  },
  helpTitle: {
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: 600,
    marginBottom: 5,
    lineHeight: '14px',
  },
  helpText: {
    color: '#64748b',
    fontSize: 11,
    lineHeight: '16px',
  },
  helpPlaceholder: {
    color: '#1e293b',
    fontSize: 11,
    lineHeight: '16px',
    fontStyle: 'italic',
  },

  footer: {
    flexShrink: 0,
    padding: '8px 12px',
    borderTop: '1px solid #1e293b',
  },
  resetBtn: {
    width: '100%',
    padding: '5px 0',
    background: 'transparent',
    border: '1px solid #1e293b',
    borderRadius: 4,
    color: '#475569',
    fontSize: 10,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  resetBtnConfirm: {
    background: '#450a0a',
    border: '1px solid #ef4444',
    color: '#fca5a5',
  },
};
