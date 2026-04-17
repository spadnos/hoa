# Interactive Map Specification

**Date:** 2026-04-17  
**Status:** Research Phase - Deferred

## Objective

Make the Kirkwood community map interactive so users can click on individual lots to navigate to lot detail pages (`/lots/[lotNumber]`).

## Analysis

### Source Materials

- **Kirkwood Master Plan.pdf** (7.4MB, color)
- **emhoa_map.pdf** (21.9KB, black & white line drawing) — **Recommended for this project**

The simpler emhoa_map.pdf is better suited for interactivity:

- Clear, distinct lot boundaries
- Lot numbers clearly labeled
- Clean black & white format eliminates visual complexity

### Feasibility: ✅ Viable

Three implementation approaches were evaluated:

| Approach                               | Pros                                             | Cons                                        |
| -------------------------------------- | ------------------------------------------------ | ------------------------------------------- |
| **SVG Conversion** (Recommended)       | Best interactivity, hover effects, clean styling | Requires coordinate extraction for each lot |
| **Canvas/Image Map**                   | Simpler setup                                    | Less polished, harder to style              |
| **Mapping Libraries** (Mapbox/Leaflet) | Powerful if geographic coords available          | Overkill without zoom/pan needs             |

### Recommended Path: SVG Conversion

1. Convert emhoa_map.pdf → SVG
2. Extract or define polygon coordinates for each lot boundary
3. Build React component with clickable lot polygons
4. Add hover states and click handlers routing to `/lots/[lotNumber]`
5. Handle responsive sizing

## Blockers

**Missing Data:** No geographic coordinates (lat/long) or CAD files currently available.

## Next Steps

1. Research what coordinate data is available:
   - Geographic coordinates (lat/long) from county/assessor data?
   - CAD/GIS files?
   - PDF coordinate extraction tools?
2. Determine most practical method to obtain lot boundary coordinates
3. Revisit implementation approach based on findings

## Notes

- Lot number extraction task deferred (user obtaining via alternative method)
- Implementation should not proceed until coordinate data is secured
