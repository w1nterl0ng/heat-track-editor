# Heat Track Editor

A standalone browser-based tool for authoring race track maps for the **Heat: Pedal to the Metal** board game and its expansions.

Live at: https://w1nterl0ng.github.io/heat-track-editor/

Download the game, report issues, and find documentation at **[heat-public](https://github.com/w1nterl0ng/heat-public)**.

## Running locally

```bash
cd heat-track-editor
npm install
npm run dev
```

Then open **http://localhost:5173/heat-track-editor/** in your browser.

---

## Workflow

| Step | Action |
|------|--------|
| 1 | Click **📷 Image** in the toolbar to load a background (satellite map or board scan) |
| 2 | Switch to the **Edit** tool (`V`) and click the canvas to lay down spline control points. Click the first node again to close the loop |
| 3 | Adjust **Track Width** and **Background Opacity** sliders in the Track tab |
| 4 | Shift-click a node, then press `C` to mark it as a corner, `F` for the finish line, or `L` for a Legends expansion line |
| 5 | Open the **Sectors** tab to set race line, speed limit, chicane flag, aggression countdown markers, and lollipop sides per sector |
| 6 | Switch to the **Surface** tool (`S`) to paint tunnel, flooded, or gravel surfaces per space |
| 7 | Switch to the **Condition** tool (`D`) to auto-generate condition markers and place the weather token |
| 8 | Export when ready (see below) |

---

## Keyboard shortcuts

### Tools
| Key | Action |
|-----|--------|
| `V` | Edit tool — place/move nodes |
| `S` | Surface paint tool |
| `D` | Condition marker tool |
| `B` | Background image tool |

### Node operations (Edit tool, node selected)
| Key | Action |
|-----|--------|
| `Shift+click` | Select / deselect a node |
| `C` | Toggle corner on selected node |
| `F` | Set finish line on selected node |
| `L` | Toggle Legends expansion line on selected node |
| `H` | Toggle phantom (bridge crossing — non-playable space) |
| `I` | Flip lollipop side (Inner ↔ Outer) on selected corner or Legends node |
| `Del` / `Backspace` | Delete selected node (or nodes between two selected nodes) |
| Select 2 nodes, type a number | Set exact space count between the two nodes |

### View
| Key | Action |
|-----|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+0` | Reset zoom & pan |
| `Scroll wheel` | Zoom |

---

## Exports

| File | Contents | Notes |
|------|----------|-------|
| `track_{id}_v2_package.zip` | JSON + background tiles + preview image | **Recommended** — drop into Unity TracksImport folder |
| `track_{id}_v2.json` | V2 track definition only | Without tiles |
| `preview_{id}.jpg` | 780 × proportional px background image | For track selection screen |
| `track_{id}.yml` | V1 game logic YAML | Legacy — kept for reference |
| `TrackLayout_{id}.json` | V1 Unity spline geometry | Legacy |
| `track_board_{id}.png` | Full editor canvas PNG at 2× resolution | Debug / reference |
| `T_{id}_{col}_{row}.jpg` | 2048×2048 background tiles ZIP | Standalone tile export |

### V2 bundle ZIP layout

```
manifest.json               ← TrackManifest with metadata + SHA-256 checksum
track_{id}_v2.json          ← V2 track definition
preview_{id}.jpg            ← 780 px wide preview for track selection screen
tiles/
  T_{id}_{col}_{row}.jpg    ← one 2048×2048 tile per world cell
  ...
```

---

## Save / Load

Use the **💾 Save** button to export a `.hte` editor package (a ZIP containing the full editor state + background image). Use **📂 Load** to reopen it. This is the working format — the game exports above are all generated from it.

When loading a `.hte` file created before lollipop-side data was introduced, the editor automatically stamps default values and shows a brief notice prompting you to re-save.

---

## Track features

### Surfaces
Applied per-edge (from a node to the next node). Painted interactively with the `S` tool.

| Type | Description |
|------|-------------|
| `plain` | Default asphalt — no overlay |
| `tunnel` | Covered section — always covers both sides |
| `flooded` | Water / flood hazard — inner, outer, or both |
| `gravel` | Gravel trap — inner, outer, or both |

### Phantom nodes
Nodes marked `H` (phantom) do not count as game spaces. Used for bridge crossings where the spline needs extra control points without adding playable spaces to that edge.

### Lollipop sides
Corner speed-limit signs and Legends expansion signs can each be placed on the **Inner** or **Outer** edge of the track. Select the relevant node and press `I` to flip. The current side is shown in the Sectors tab and is saved to the `.hte` file but excluded from the game export formats.

### Countdown numbers
Each sector displays countdown numbers along the track edge in the editor — plain white numbers for positions 4 … sector_length, and gold Legends diamonds (with aggression rings) for positions 0–3. The side (Inner / Outer) is toggled per sector in the **Sectors** tab and is also editor-only.

### Weather token
A single resizable board tile (aspect ratio ~525:429) placed via the **Condition** tool. Drag to reposition; scroll wheel to scale (hold Shift for fine control). Included in the V2 JSON export as `weatherToken: { x, y, width }`.

### Chicane sectors
Marking a sector as a chicane forces both bounding corners to share the same speed limit and renders blue curbing stripes on both track edges instead of the standard red corner stripes.

---

## V2 JSON schema (summary)

```json
{
  "schemaVersion": 2,
  "id": "spain",
  "name": "España",
  "country": "Spain",
  "designer": "Original layout designer",
  "trackEditor": "Digital file author",
  "defaultLaps": 2,
  "startingHeat": 6,
  "startingStress": 3,
  "tileColumns": 3,
  "tileRows": 2,
  "tileSizePx": 2048,
  "trackWidth": 1.05,
  "finishLine": { "sectorIndex": 0, "afterSpaceIndex": 12 },
  "sectors": [
    {
      "spaces": 18,
      "raceLine": "L",
      "cornerSpeedLimit": 4,
      "isChicane": false,
      "legendsLineFromExit": 6,
      "legendCountdowns": [0, 1, 2, 0],
      "surfaces": []
    }
  ],
  "nodes": [ { "x": 0.0, "y": 0.0 }, "..." ],
  "cornerIndices": [ 12, 28, "..." ],
  "conditionMarkers": [
    { "label": "S1", "type": "sector", "x": 1234.0, "y": 567.0, "rotation": 45.0 }
  ],
  "weatherToken": { "x": 200.0, "y": 400.0, "width": 420.0 }
}
```

Node coordinates are normalised: centred on the world origin, Y-axis flipped (up = positive), scaled so the longest world dimension maps to 20 units.
