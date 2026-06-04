# Heat Track Editor — Track Creation Guide

A step-by-step guide for creating a track using the Heat Track Editor.
Intended for beta testers on **macOS** and **Windows**.

<!-- [VIDEO: Overview — embed YouTube link here] -->

---

## Before You Begin

**Open the editor** in your browser:

- **Live (recommended):** [https://w1nterl0ng.github.io/heat-track-editor/](https://w1nterl0ng.github.io/heat-track-editor/)
- **Local dev:** Run `npm install && npm run dev` inside `heat-track-editor/`, then open `http://localhost:5173/heat-track-editor/`

**Open the in-editor checklist** by clicking the **Track Creation Guide** button in the toolbar. It tracks your progress across all 22 steps and saves your state with the file.

![image-20260603132724381](/Users/fredanderson/Coding/heat-track-editor/docs/images/image-20260603132724381.png)



> **Save early and often.** Use the **💾 Save** button in the toolbar to export a `.hte` file — your full working package. Keep this file safe; it is the only format that preserves all editor settings and your checklist progress.

---

## Quick Reference — Keyboard Shortcuts

| Action | Mac | Windows |
|--------|-----|---------|
| Edit tool | `V` | `V` |
| Surface paint tool | `S` | `S` |
| Condition marker tool | `D` | `D` |
| Background image tool | `B` | `B` |
| Select / deselect node | `Shift+click` | `Shift+click` |
| Mark corner | `C` | `C` |
| Set finish line | `F` | `F` |
| Toggle Legends line | `L` | `L` |
| Toggle phantom node | `H` | `H` |
| Flip lollipop side | `I` | `I` |
| Delete selected node(s) | `Delete` or `Backspace` | `Delete` or `Backspace` |
| Undo | `Cmd+Z` | `Ctrl+Z` |
| Redo | `Cmd+Shift+Z` | `Ctrl+Shift+Z` |
| Reset zoom & pan | `Cmd+0` | `Ctrl+0` |
| Zoom | Scroll wheel | Scroll wheel |

---

## Part 1 — Track Setup

<!-- [VIDEO: Track Setup — embed YouTube link here] -->

### Step 1 — Load a Background Image

<!-- [SCREENSHOT: The 📷 Image button in the toolbar] -->

1. Click the **📷 Image** button in the toolbar.
2. Select a satellite map or a scan of the physical board as your reference image.
3. The image loads into the background layer on the canvas.

> **Tip:** A high-resolution board scan gives the most accurate alignment. A satellite image works well for real-world tracks. Either format is accepted.

**Checklist item:** `Background image loaded`

---

### Step 2 — Align the Background to the World Grid

<!-- [SCREENSHOT: The BG Layer tool active, with the tile grid overlay visible] -->

1. Press **`B`** (or click the **BG Layer** tool in the toolbar) to switch to the background tool.
2. Drag the image to roughly position the track on the canvas.
3. Use the **scale handles** to resize the image until the track fits the canvas proportionally.
4. Press **`#`** to toggle the tile grid overlay. Use the grid lines to align tile boundaries with the edges of the board sections.
5. Fine-tune position and scale until the board layout sits cleanly inside the tile grid.

> **Tip:** Zoom in with the scroll wheel to check corner alignment precisely. Press `Cmd+0` (Mac) / `Ctrl+0` (Windows) to reset the view.

**Checklist item:** `BG layer aligned to world`

---

### Step 3 — Draw the Track Spline

<!-- [SCREENSHOT: Completed spline loop around a track, showing control points and the rendered track band] -->

<!-- [VIDEO: Drawing the track spline — embed YouTube link here] -->

1. Press **`V`** to switch to the **Edit** tool.
2. Click on the canvas to place the first spline control point at the start/finish area.
3. Continue clicking to place control points around the track centerline, following the layout visible in the background image. Place more points in tight corners and fewer on long straights.
4. When you have circled the full track, click on the **first node** again to close the loop.

The editor renders a Catmull-Rom spline through your control points and draws the track band at the configured width.

> **Tip:** You can move any node at any time — switch to the Edit tool (`V`), then drag the node. You do not need to get every point perfect before closing the loop.
>
> **Tip:** If you need a bridge crossing (two sections of spline that cross without being connected), mark the overlapping node as a phantom with `H`. Phantom nodes are not playable spaces.

**Checklist item:** `Track spline complete`

---

### Step 4 — Mark the Corners

<!-- [SCREENSHOT: Several corner nodes shown in red, separating the track into sectors] -->

1. With the **Edit** tool (`V`) active, **`Shift+click`** a node at the **entry** of each corner to select it.
2. Press **`C`** to mark it as a corner. The node turns red and a sector boundary is drawn.
3. Repeat for every corner on the track.

Corners define sector boundaries. Each sector runs from one corner node to the next. The finish line (placed in a later step) marks the boundary between the last and first sectors.

> **Tip:** Select two nodes and type a number to set the exact space count between them — useful for matching the physical board's printed space count.

**Checklist item:** `Corners marked`

---

## Part 2 — Track Properties

<!-- [VIDEO: Track Properties — embed YouTube link here] -->

Open the **Track** tab in the right sidebar to complete this section.

<!-- [SCREENSHOT: The Track tab in the sidebar, with name, ID, and game value fields visible] -->

### Step 5 — Set Track Name and ID

1. In the **Track** tab, fill in the **Track Name** field (e.g., `España`).
2. Fill in the **Track ID** field — lowercase letters only, used in all exported file names (e.g., `spain`).
3. Fill in the **Country** field (e.g., `Spain`).

> **Important:** The track ID cannot contain spaces or special characters. Use lowercase letters only. It will appear in all exported file names such as `track_spain_v2_package.zip`.

**Checklist item:** `Track name & ID set`

---

### Step 6 — Set Width, Laps, Heat, and Stress

Still in the **Track** tab:

1. Adjust the **Track Width** slider until the rendered track band matches the width of the physical board. Compare against the background image.
2. Set **Laps** (usually `2` for Championship tracks).
3. Set **Starting Heat** — the number of heat cards players begin with on this track.
4. Set **Starting Stress** — the number of stress cards players begin with.

<!-- [SCREENSHOT: The width, laps, heat, and stress controls in the Track tab] -->

**Checklist item:** `Width, laps, heat & stress set`

---

### Step 7 — Add Credits

Still in the **Track** tab:

1. Fill in **Track Designer** — the person who created the physical board layout.
2. Fill in **Track Editor** — the person building this digital file (probably you).

**Checklist item:** `Designer & editor credited`

---

## Part 3 — Sectors

<!-- [VIDEO: Sectors overview — embed YouTube link here] -->

Open the **Sectors** tab in the right sidebar. Each sector is listed in order — click a sector row to select it and edit its properties.

<!-- [SCREENSHOT: The Sectors tab showing a list of sectors with their properties] -->

### Step 8 — Place the Finish Line

1. Switch to the **Edit** tool (`V`).
2. **`Shift+click`** the node at the start/finish straight to select it.
3. Press **`F`** to set it as the finish line. It appears as a yellow dashed line across the track.

There can only be one finish line per track. It marks the boundary between the last and first sectors.

<!-- [SCREENSHOT: The finish line shown as a yellow dashed line on the canvas] -->

**Checklist item:** `Finish line placed`

---

### Step 9 — Flag Chicane Sectors

In the **Sectors** tab:

1. Identify any sectors that form a chicane (a tight S-shaped pair of corners sharing a speed limit).
2. For each chicane sector, tick the **Chicane** checkbox.

Marking a sector as a chicane forces both of its bounding corners to share the same speed limit. The editor replaces the standard red corner curbing with blue chicane stripes.

> **Note:** Chicanes typically come in pairs — the sector entering the chicane and the sector exiting it should both be flagged.

**Checklist item:** `Chicane sectors flagged`

---

### Step 10 — Set Race Lines

In the **Sectors** tab, for each sector:

1. Set the **Race Line** to **Left** or **Right**.

The race line tells drivers which edge of the track to aim for through that sector. Set it to match the physical board's printed arrow indicator.

**Checklist item:** `All race lines set (L/R)`

---

### Step 11 — Set Corner Speed Limits

In the **Sectors** tab, for each sector:

1. Set the **Corner Speed** (the speed limit at the end of the sector, i.e., the corner exit).

The default is **4**. Most real corners should differ from this — slow hairpins may be 1 or 2, fast sweepers may be 6 or 7.

> **Warning:** The Export tab will flag a warning if all corners remain at the default value of 4, which almost certainly means speeds have not been configured yet.

**Checklist item:** `All corner speeds set`

---

### Step 12 — Assign Press Corners

In the **Sectors** tab, for each Championship press corner:

1. Assign a **Press** label: **A**, **B**, **C**, **D** (required) and **E** (optional, only if the board has a fifth press corner).
2. Each letter may only be used once.

At minimum, labels A through D must be assigned before export.

<!-- [SCREENSHOT: The Sectors tab showing press corner labels A–D assigned to different sectors] -->

**Checklist item:** `At least 4 press corners assigned`

---

### Step 13 — Set Corner Lollipop Sides

For each corner, the speed-limit sign (lollipop) can appear on either the inner or outer edge of the track.

1. Switch to the **Edit** tool (`V`).
2. **`Shift+click`** a corner node to select it.
3. Press **`I`** to flip the lollipop to the opposite side (Inner ↔ Outer).
4. Repeat for every corner node.

Check the **Sectors** tab to confirm the current lollipop side for each sector. Set it to match the physical board — the post should face the driver approaching the corner.

<!-- [SCREENSHOT: The Sectors tab showing lollipop side indicators per sector] -->

**Checklist item:** `Corner lollipop sides set`

---

### Step 14 — Place Legends Expansion Lines

Every sector requires exactly one **Legends expansion entry line** — the point where Legends expansion drivers enter the sector.

1. Switch to the **Edit** tool (`V`).
2. **`Shift+click`** a node within the sector (roughly mid-sector, or where the real board marker appears).
3. Press **`L`** to toggle a Legends line on that node.
4. Repeat for every sector.

<!-- [SCREENSHOT: Canvas showing Legends line markers placed mid-sector in each sector] -->

> **Note:** The Export tab will flag a FATAL error if any sector is missing a Legends line.

**Checklist item:** `All legends lines placed`

---

### Step 15 — Set Legends Lollipop Sides

Each Legends line has its own sign that can appear on the inner or outer edge of the track.

1. Switch to the **Edit** tool (`V`).
2. **`Shift+click`** a Legends line node to select it.
3. Press **`I`** to flip the Legends sign side.
4. Repeat for every Legends node.

The Legends sign typically defaults to the **opposite** side of the corner lollipop in that sector. Confirm against the physical board.

**Checklist item:** `Legends lollipop sides set`

---

### Step 16 — Set Legend Countdown Aggression

In the **Sectors** tab, for each sector:

1. Locate the **Legend Countdowns** row — four countdown positions (0–3 from the corner exit).
2. Set the **aggression level** for each position:
   - _(blank)_ — no aggression
   - **➤** — moderate aggression
   - **➤➤** — high aggression

These values tell Legends expansion drivers how aggressively to play each countdown position in the sector.

<!-- [SCREENSHOT: The Sectors tab showing aggression levels set for countdown markers] -->

> **Warning:** The Export tab will flag a warning if aggression is not set on any sector's countdown markers when Legends lines are present.

**Checklist item:** `All legend countdowns set`

---

### Step 17 — Set Countdown Number Sides

In the **Sectors** tab, for each sector:

1. Find the **Countdown numbers side** toggle.
2. Select **Inner** or **Outer** to set which track edge the countdown numbers (and Legends diamonds) appear on.

This controls the visual placement of the 4-3-2-1 countdown numbers and the gold Legends diamond markers.

**Checklist item:** `Countdown number sides set`

---

## Part 4 — Conditions

<!-- [VIDEO: Conditions — embed YouTube link here] -->

### Step 18 — Paint Surfaces

Surface types mark special road conditions on individual spaces (edges between two nodes).

1. Press **`S`** to switch to the **Surface paint** tool.
2. Press the key for the surface type you want to paint:
   - **`T`** — Tunnel (always covers both edges)
   - **`W`** — Flooded (water hazard)
   - **`G`** — Gravel (gravel trap)
3. Press **`1`**, **`2`**, or **`3`** to set which side to paint:
   - **`1`** — Both sides
   - **`2`** — Outside only
   - **`3`** — Inside only
4. Drag over spaces on the canvas to paint them. Spaces default to plain asphalt — only paint non-standard surfaces.
5. Press **`S`** again or select a different tool to exit.

<!-- [SCREENSHOT: The canvas with tunnel, flooded, and gravel surfaces painted on different sections] -->

> **Tip:** Tunnels always apply to both sides regardless of the `1/2/3` key — you do not need to select a side for tunnels.

**Checklist item:** `Surfaces painted`

---

### Step 19 — Place and Rotate Condition Markers

Condition markers are the round numbered tokens placed on the board that indicate road condition positions.

1. Press **`D`** to switch to the **Condition** tool.
2. Click **"Auto-generate markers"** in the sidebar. This places a marker at the start of each sector automatically.
3. Drag each marker to its correct position on the board, matching the physical layout.
4. Use the **scroll wheel** to rotate a selected marker. Hold **`Shift`** while scrolling for 1° increments.
5. Ensure every marker has a non-zero rotation — a flat (0°) marker is a sign it has not been positioned.

<!-- [SCREENSHOT: Several condition markers placed and rotated on the canvas] -->

> **Warning:** The Export tab will flag a warning if any condition marker has a rotation of 0°.
>
> **Note:** The Export tab will flag a FATAL error if no condition markers have been placed at all.

**Checklist item:** `Condition markers placed & rotated`

---

### Step 20 — Place and Size the Weather Token

The weather token is a single resizable overlay tile placed on the board.

1. Still in the **Condition** tool (`D`), click **"+ Place weather token"** in the sidebar.
2. Drag the token to the correct position on the board, matching the physical board's printed weather token location.
3. Use the **scroll wheel** to scale the token up or down to match the physical token's size. Hold **`Shift`** while scrolling for fine-grained control.

<!-- [SCREENSHOT: The weather token placed and sized on the canvas] -->

**Checklist item:** `Weather token placed & sized`

---

## Part 5 — Final Steps

<!-- [VIDEO: Final steps and export — embed YouTube link here] -->

### Step 21 — Review the Export Checklist

Before exporting, verify the track passes all required checks.

1. Click the **Export** tab in the right sidebar.
2. Review the **FATAL** items — all must show green before the export is meaningful:
   - Sectors defined (corners have been placed)
   - Total spaces greater than 0
   - Finish line placed
   - Every sector has a Legends line
   - Condition markers placed
   - At least 4 press corners assigned (A–D)
3. Review the **Warnings** — resolve as many as practical:
   - Aggression set on Legends countdown markers
   - All condition markers rotated (non-zero)
   - Race line sides customised (not all Left)
   - Surfaces defined
   - Corner speeds customised (not all 4)

<!-- [SCREENSHOT: The Export tab showing all FATAL items green and some resolved warnings] -->

**Checklist item:** `Export checklist reviewed`

---

### Step 22 — Save the `.hte` Package

Save the full editor package before exporting to the game format. This preserves all settings, checklist state, and background image for future editing sessions.

1. Click the **💾 Save** button in the toolbar.
2. Save the resulting `.hte` file somewhere safe (e.g., a shared drive or your local working folder).

<!-- [SCREENSHOT: The Save button in the toolbar] -->

> **Important:** The `.hte` file is your **working file**. Always keep it alongside any game exports. Game export formats do not contain all editor data — only the `.hte` file can be reopened for further editing.

**Checklist item:** `.hte package saved`

---

### Step 23 — Export the V2 Package

The V2 package is the final game-ready export. It contains everything needed to play the track.

1. In the **Export** tab, click the **V2 bundle** button.
2. The editor generates and downloads a ZIP file named `track_{id}_v2_package.zip`.

<!-- [SCREENSHOT: The Export tab with the V2 bundle button highlighted] -->

The ZIP contains:

```
manifest.json               ← metadata + SHA-256 checksum
track_{id}_v2.json          ← V2 track definition
preview_{id}.jpg            ← track selection screen preview
tiles/
  T_{id}_{col}_{row}.jpg    ← 2048×2048 background tiles
```

> **Where does this file go?**
> - **For beta testing on device:** Drop the ZIP into the game's `TracksImport` folder. The game will detect, verify, and install it automatically on next launch.
> - **For development (submitting to the team):** Share the ZIP via the agreed channel. The team will integrate it into the main build.

**Checklist item:** `V2 package exported`

<!-- [VIDEO: Exporting the V2 package — embed YouTube link here] -->

---

## Note: Backbone Integration (Skipped for Beta)

In the full development workflow, there is an additional step after exporting the V2 package: **integrating the track into the game's core data repository** (committing the V2 JSON and tile assets into the `heat-cursor` repo and running the Unity `Heat → Import V2 Track Package` menu). This step is **skipped for beta testing** — beta testers use the `TracksImport` folder method described above instead. The backbone integration step will be documented separately for internal contributors.

---

## Appendix — Full Keyboard Shortcut Reference

### Tool Selection

| Key | Tool |
|-----|------|
| `V` | Edit — place and move nodes |
| `S` | Surface paint |
| `D` | Condition marker |
| `B` | Background image |

### Node Operations (Edit tool active)

| Action | Mac | Windows |
|--------|-----|---------|
| Select / deselect node | `Shift+click` | `Shift+click` |
| Toggle corner | `C` | `C` |
| Set finish line | `F` | `F` |
| Toggle Legends line | `L` | `L` |
| Toggle phantom node | `H` | `H` |
| Flip lollipop side (corner or Legends) | `I` | `I` |
| Delete selected node(s) | `Delete` / `Backspace` | `Delete` / `Backspace` |
| Set exact space count between two selected nodes | Type a number | Type a number |

### Surface Tool

| Key | Action |
|-----|--------|
| `T` | Select tunnel surface |
| `W` | Select flooded surface |
| `G` | Select gravel surface |
| `1` | Paint both sides |
| `2` | Paint outside only |
| `3` | Paint inside only |

### View

| Action | Mac | Windows |
|--------|-----|---------|
| Undo | `Cmd+Z` or `Ctrl+Z` | `Ctrl+Z` |
| Redo | `Cmd+Shift+Z` | `Ctrl+Shift+Z` |
| Reset zoom & pan | `Cmd+0` | `Ctrl+0` |
| Zoom in / out | Scroll wheel | Scroll wheel |
| Rotate condition marker | Scroll wheel (marker selected) | Scroll wheel (marker selected) |
| Fine-rotate condition marker (1°) | `Shift` + scroll | `Shift` + scroll |
| Scale weather token | Scroll wheel (token selected) | Scroll wheel (token selected) |
| Fine-scale weather token | `Shift` + scroll | `Shift` + scroll |

---

*Heat Track Editor · Beta Tester Guide*
