# Heat Track Editor

A standalone browser-based tool for authoring race track maps for the **Heat** board game.

## Running

```bash
cd tools/track-editor
npm install
npm run dev
```

Then open **http://localhost:5173** in your browser.

## Workflow

| Step | Action |
|------|--------|
| 1 | Click **Upload Image** (top-right toolbar) to load a background — satellite map or existing game board photo |
| 2 | Press **P** (Add Point) and click on the canvas to lay down Catmull-Rom spline control points for the centerline |
| 3 | Adjust **Track Width** slider in Track Properties (right sidebar) |
| 4 | Press **C** (Add Corner) and click near the spline to place corner-line markers |
| 5 | In the **Segments** list, set the number of spaces per segment |
| 6 | Click a segment to open its **Properties Panel** — set speed limit, race line (L/R), legends line offset, and mark which segment has the finish line |
| 7 | Press **W** (Weather) and click near a corner to attach road condition markers |
| 8 | Export when ready (see below) |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `V` | Select / Pan |
| `P` | Add spline point |
| `C` | Add corner |
| `W` | Add weather marker |
| `Del` | Delete tool (click elements to remove) |
| `Esc` | Return to Select tool |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Scroll wheel` | Zoom |
| `+` / `-` | Zoom in / out |
| `Ctrl+0` | Reset zoom & pan |

## Exports

| File | Contents |
|------|----------|
| `track_xxx.yml` | Game logic file — loaded by `TrackLoader.LoadFromYaml()` |
| `TrackLayout_xxx.json` | Unity spline geometry — import alongside `TrackLayout.cs` |
| `track_board_xxx.png` | Rendered board image (2× resolution) |

### Importing into Unity

1. Copy `TrackLayout_xxx.json` into `Assets/TrackLayouts/`.
2. Add a small Unity editor script that reads the JSON and creates a `TrackLayout` ScriptableObject (the existing `TopDown2DMenu.cs` can be extended for this).

## Output schema

### `track_xxx.yml`
Matches the schema parsed by `HeatGame.Core.Track.TrackLoader`:

```yaml
name: My Track
country: USA
laps: 2
totalSpaces: 69
totalCorners: 4
heat: 6
stress: 3
segments:
  - spaces: 24
    raceLine: L
    legendsLine: 10
    cornerSpeedLimit: 7
    finishLineAfter: 12
  - spaces: 21
    raceLine: R
    legendsLine: 6
    cornerSpeedLimit: 3
```

### `TrackLayout_xxx.json`
Mirrors the `TrackLayout` Unity ScriptableObject:

```json
{
  "trackId": "usa",
  "controlPoints": [{"x": 8.0, "y": 3.5}, ...],
  "trackWidth": 1.0,
  "samplesPerSegment": 32
}
```
