import React, { useRef, useState, useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';

const CHECKLIST_TOTAL = 22; // keep in sync with ChecklistPanel TOTAL

const TOOLS = [
  { mode: 'layout' as const,     label: 'Layout',    icon: '⌖', title: 'Draw track layout (P)',         shortcut: 'P', designOnly: true },
  { mode: 'edit' as const,       label: 'Edit',      icon: '↖', title: 'Edit track nodes (V)',        shortcut: 'V', designOnly: false },
  { mode: 'surface' as const,    label: 'Surface',   icon: '⬛', title: 'Paint space surfaces (S)',    shortcut: 'S', designOnly: false },
  { mode: 'condition' as const,  label: 'Condition', icon: '◼', title: 'Place condition markers (D)',  shortcut: 'D', designOnly: false },
  { mode: 'background' as const, label: 'BG Layer',  icon: '▣', title: 'Edit background image (B)',   shortcut: 'B', designOnly: false },
  { mode: 'podium' as const,     label: 'Podium',    icon: '🏆', title: 'Place podium slots (O)',        shortcut: 'O', designOnly: false },
];

export const Toolbar: React.FC = () => {
  const {
    tool,
    setTool,
    undo,
    redo,
    showGrid,
    showSpline,
    showConditionMarkers,
    showLollipops,
    showCars,
    toggleGrid,
    toggleSpline,
    toggleConditionMarkers,
    toggleLollipops,
    toggleCars,
    setBackgroundImage,
    exportPackage,
    loadPackage,
    resetAll,
    _history,
    _future,
    migrationNotice,
    dismissMigrationNotice,
    checklistOpen,
    toggleChecklist,
    checklistItems,
    backbonePhase,
  } = useEditorStore();

  const checklistDone = Object.values(checklistItems).filter(Boolean).length;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pkgInputRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleResetClick = () => {
    if (confirmReset) {
      resetAll();
      setConfirmReset(false);
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    } else {
      setConfirmReset(true);
      confirmTimer.current = setTimeout(() => setConfirmReset(false), 3000);
    }
  };

  useEffect(() => () => { if (confirmTimer.current) clearTimeout(confirmTimer.current); }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      const img = new Image();
      img.onload = () => setBackgroundImage(dataUrl, img.naturalWidth, img.naturalHeight);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div style={styles.toolbar}>
      <div style={styles.brand}>
        <span style={styles.brandIcon}>🏎</span>
        <span style={styles.brandText}>Heat Track Editor</span>
      </div>

      <div style={styles.divider} />

      {/* Guide / checklist toggle */}
      <button
        onClick={toggleChecklist}
        title="Toggle track creation checklist"
        style={{ ...styles.toolBtn, ...(checklistOpen ? styles.toolBtnActive : {}), position: 'relative' }}
      >
        <span style={styles.toolIcon}>☑</span>
        <span style={styles.toolLabel}>Guide</span>
        <span style={{
          ...styles.toolShortcut,
          color: checklistDone === CHECKLIST_TOTAL ? '#22c55e' : '#64748b',
        }}>
          {checklistDone}/{CHECKLIST_TOTAL}
        </span>
      </button>

      <div style={styles.divider} />

      {TOOLS.filter(t => {
        if (backbonePhase === 'design') return t.mode === 'layout' || t.mode === 'background';
        return t.mode !== 'layout';
      }).map(t => (
        <button
          key={t.mode}
          onClick={() => setTool(t.mode)}
          title={t.title}
          style={{
            ...styles.toolBtn,
            ...(tool === t.mode ? styles.toolBtnActive : {}),
          }}
        >
          <span style={styles.toolIcon}>{t.icon}</span>
          <span style={styles.toolLabel}>{t.label}</span>
          <span style={styles.toolShortcut}>[{t.shortcut}]</span>
        </button>
      ))}

      <div style={styles.divider} />

      <div style={styles.hintGroup}>
        {backbonePhase === 'design' ? (
          <>
            <span style={styles.hint}>Click to place anchors · dbl-click segment to split · scroll zoom</span>
            <span style={styles.hint}>Ctrl+scroll bend · 0 straight · click amber ring to close</span>
          </>
        ) : (
          <>
            <span style={styles.hint}>Shift+click node → select</span>
            <span style={styles.hint}>C → corner · F → finish · L → legends · H → phantom · I → flip lollipop</span>
            <span style={styles.hint}>Del → delete · 2 selected → type spaces</span>
            <span style={styles.hint}>D → condition markers</span>
          </>
        )}
      </div>

      <div style={styles.divider} />

      <button
        onClick={toggleGrid}
        title="Toggle space grid"
        style={{ ...styles.toolBtn, ...(showGrid ? styles.toolBtnActive : {}) }}
      >
        <span style={styles.toolIcon}>#</span>
        <span style={styles.toolLabel}>Grid</span>
      </button>
      <button
        onClick={toggleSpline}
        title="Toggle track lines + surfaces"
        style={{ ...styles.toolBtn, ...(showSpline ? styles.toolBtnActive : {}) }}
      >
        <span style={styles.toolIcon}>〰</span>
        <span style={styles.toolLabel}>Track</span>
      </button>
      <button
        onClick={toggleLollipops}
        title="Toggle corner + legends lollipops"
        style={{ ...styles.toolBtn, ...(showLollipops ? styles.toolBtnActive : {}) }}
      >
        <span style={styles.toolIcon}>⊙</span>
        <span style={styles.toolLabel}>Lollis</span>
      </button>
      <button
        onClick={toggleCars}
        title="Toggle car footprints — race line + outside per space"
        style={{ ...styles.toolBtn, ...(showCars ? styles.toolBtnActive : {}) }}
      >
        <span style={styles.toolIcon}>▮</span>
        <span style={styles.toolLabel}>Cars</span>
      </button>
      <button
        onClick={toggleConditionMarkers}
        title="Toggle condition markers + weather token"
        style={{ ...styles.toolBtn, ...(showConditionMarkers ? styles.toolBtnActive : {}) }}
      >
        <span style={styles.toolIcon}>⛅</span>
        <span style={styles.toolLabel}>Cond.</span>
      </button>

      <div style={styles.divider} />

      <button
        onClick={undo}
        disabled={_history.length === 0}
        title="Undo (Ctrl+Z)"
        style={{ ...styles.toolBtn, ...(_history.length === 0 ? styles.toolBtnDisabled : {}) }}
      >
        <span style={styles.toolIcon}>↩</span>
        <span style={styles.toolLabel}>Undo</span>
      </button>
      <button
        onClick={redo}
        disabled={_future.length === 0}
        title="Redo (Ctrl+Shift+Z)"
        style={{ ...styles.toolBtn, ...(_future.length === 0 ? styles.toolBtnDisabled : {}) }}
      >
        <span style={styles.toolIcon}>↪</span>
        <span style={styles.toolLabel}>Redo</span>
      </button>

      <div style={styles.divider} />

      <button
        onClick={handleResetClick}
        title="Reset everything"
        style={{ ...styles.toolBtn, ...(confirmReset ? styles.toolBtnDanger : {}) }}
      >
        <span style={styles.toolIcon}>{confirmReset ? '⚠' : '⟳'}</span>
        <span style={styles.toolLabel}>{confirmReset ? 'Confirm?' : 'Reset'}</span>
      </button>

      <div style={styles.spacer} />

      {/* Save / Load package */}
      <button onClick={exportPackage} title="Save track package (.hte)" style={styles.uploadBtn}>
        <span style={styles.toolIcon}>💾</span>
        <span style={styles.toolLabel}>Save</span>
      </button>
      <button onClick={() => pkgInputRef.current?.click()} title="Load track package (.hte or legacy .json)" style={styles.uploadBtn}>
        <span style={styles.toolIcon}>📂</span>
        <span style={styles.toolLabel}>Load</span>
      </button>
      <input
        ref={pkgInputRef} type="file" accept=".hte,.json,application/json"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) loadPackage(f); e.target.value = ''; }}
      />

      <div style={styles.divider} />

      {/* Upload background image */}
      <button
        onClick={() => fileInputRef.current?.click()}
        title="Upload background image"
        style={styles.uploadBtn}
      >
        <span style={styles.toolIcon}>📷</span>
        <span style={styles.toolLabel}>Image</span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageUpload}
      />

      {/* Migration notice — shown after loading a track that had nodes updated */}
      {migrationNotice && (
        <div style={styles.migrationNotice}>
          <span style={styles.migrationText}>ℹ {migrationNotice}</span>
          <button onClick={dismissMigrationNotice} style={styles.migrationDismiss}>✕</button>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  toolbar: {
    display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4,
    background: '#0f172a', borderBottom: '1px solid #1e293b',
    padding: '6px 12px', flexShrink: 0, overflowX: 'auto',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 6, marginRight: 8 },
  brandIcon: { fontSize: 20 },
  brandText: {
    color: '#e2e8f0', fontWeight: 700, fontSize: 14,
    letterSpacing: '0.02em', whiteSpace: 'nowrap',
  },
  divider: { width: 1, height: 28, background: '#334155', margin: '0 4px', flexShrink: 0 },
  spacer: { flex: 1 },
  hintGroup: {
    display: 'flex', flexDirection: 'column', gap: 1,
    padding: '0 6px',
  },
  hint: { color: '#334155', fontSize: 9, whiteSpace: 'nowrap' },
  toolBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
    padding: '4px 10px', background: 'transparent',
    border: '1px solid transparent', borderRadius: 6,
    color: '#94a3b8', cursor: 'pointer', transition: 'all 0.15s',
    minWidth: 54, flexShrink: 0,
  },
  toolBtnActive: {
    background: '#1e3a5f', border: '1px solid #3b82f6', color: '#93c5fd',
  },
  toolBtnDisabled: { opacity: 0.35, cursor: 'not-allowed' },
  toolBtnDanger: {
    background: '#450a0a', border: '1px solid #ef4444', color: '#fca5a5',
  },
  toolIcon: { fontSize: 16, lineHeight: 1 },
  toolLabel: { fontSize: 10, lineHeight: 1, whiteSpace: 'nowrap' },
  toolShortcut: { fontSize: 9, opacity: 0.5, lineHeight: 1 },
  uploadBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
    padding: '4px 12px', background: '#1e3a5f',
    border: '1px solid #3b82f6', borderRadius: 6,
    color: '#93c5fd', cursor: 'pointer', minWidth: 54, flexShrink: 0,
  },
  migrationNotice: {
    position: 'fixed' as const,
    bottom: 16, left: '50%', transform: 'translateX(-50%)',
    display: 'flex', alignItems: 'center', gap: 10,
    background: '#1e3a5f', border: '1px solid #3b82f6',
    borderRadius: 8, padding: '8px 14px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
    zIndex: 9999,
    maxWidth: 480,
  },
  migrationText: { color: '#93c5fd', fontSize: 12, lineHeight: '16px' },
  migrationDismiss: {
    background: 'transparent', border: 'none',
    color: '#475569', fontSize: 14, cursor: 'pointer',
    flexShrink: 0, padding: '0 2px',
  },
};
