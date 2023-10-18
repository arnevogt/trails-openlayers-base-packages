// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { LayerModel } from "@open-pioneer/map";
import { createLogger } from "@open-pioneer/core";
import TileLayer from "ol/layer/Tile";
import WMTS from "ol/source/WMTS";
import VectorLayer from "ol/layer/Vector";
import { Type } from "ol/geom/Geometry";
import { DEVICE_PIXEL_RATIO } from "ol/has";
import { toContext } from "ol/render";
import Style, { StyleLike } from "ol/style/Style";
import { LineString, Point, Polygon } from "ol/geom";
import { Feature } from "ol";
import ImageState from "ol/ImageState";
import { extend } from "ol/extent";

const LOG = createLogger("legend:getLegendImage");

export interface LegendImage {
    type: "image";
    href: string;
}

export type LegendInfo = LegendImage;

export function getLegendImage(layer: LayerModel): LegendImage | undefined {
    const olLayer = layer.olLayer;

    /* TODO: `layer instanceof WMTSLayer` or similar in our map package */
    if (olLayer instanceof TileLayer) {
        const source = olLayer.getSource();
        if (source instanceof WMTS) {
            return getWMTSLegend(layer, source);
        }
    }

    if (olLayer instanceof VectorLayer) {
        let feature = olLayer.getSource().getFeatures()[0]; // todo need to wait for features to be loaded or rerender legend
        console.log(feature);

        // create fake feature for experiment (so that it is not needed to wait for features to be loaded)
        feature = new Feature(new Point([0, 0]));

        // create canvas
        let canvas = document.createElement("canvas");
        const margin = 10;
        const size: [number, number] = [40, 25];
        const width = size[0] + 2 * margin;
        const height = size[1] + 2 * margin;
        const ratio = DEVICE_PIXEL_RATIO;
        canvas.width = width * ratio;
        canvas.height = height * ratio;

        let styleLike: StyleLike | null | undefined | void = olLayer.getStyle();
        if (typeof styleLike == "function") {
            styleLike = styleLike(feature, 0); // todo also pass resolution
        }
        if (!styleLike) {
            console.warn("style not defined");
            return;
        }
        canvas = createLegendImageFromStyle("Point", styleLike, canvas);

        console.log(canvas.toDataURL());

        return {
            type: "image",
            href: canvas.toDataURL()
        };
    }

    LOG.debug("Cannot produce legend image for layer", layer);
    return undefined;
}

function getWMTSLegend(layer: LayerModel, wmtsSource: WMTS): LegendImage | undefined {
    const capabilities = layer.attributes.wmtsCapabilities;
    if (!capabilities) {
        LOG.warn("WMTSLayer does not have capabilities - cannot produce a legend image", layer);
        return undefined;
    }

    const activeLayerId = wmtsSource.getLayer();
    const activeStyleId = wmtsSource.getStyle();
    const legendUrl = getWMTSLegendURL(capabilities, activeLayerId, activeStyleId);

    if (legendUrl) {
        return {
            type: "image",
            href: legendUrl
        };
    }
}

/**
 * Attempts to parse the LegendURL from the WMTS capabilities.
 *
 * The WMTS capabilities are assumed to have been parsed by OpenLayer's WMTS parser.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function getWMTSLegendURL(
    capabilities: Record<string, any>,
    activeLayerId: string | undefined,
    activeStyleId: string | undefined
): string | undefined {
    const content = capabilities?.Contents;
    const layers = content?.Layer;

    let activeLayer = layers?.find((layer: any) => layer?.Identifier === activeLayerId);
    if (!activeLayer) {
        LOG.debug("Failed to find the active layer in WMTS layer capabilities.");
        activeLayer = layers?.[0];
        if (!activeLayer) {
            LOG.debug("No layer in WMTS capabilities - giving up.");
            return undefined;
        }
    }

    const styles = activeLayer.Style;
    let activeStyle = styles?.find((style: any) => style?.Identifier === activeStyleId);
    if (!activeStyle) {
        LOG.debug("Failed to find active style in WMTS layer.");
        activeStyle = styles?.[0];
        if (!activeStyle) {
            LOG.debug("No style in WMTS layer capabilities - giving up.");
            return undefined;
        }
    }

    const legendUrl = activeStyle.LegendURL?.[0]?.href;
    return legendUrl as string | undefined;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/* Example WMTS Capabilities

{
    // ....
    "version": "1.0.0",
    "Contents": {
        "Layer": [
            {
                "Title": "WMTS NW LANDBEDECKUNG",
                "Abstract": "",
                "WGS84BoundingBox": [
                    5.72499,
                    50.1506,
                    9.53154,
                    52.602
                ],
                "Identifier": "wmts_nw_landbedeckung",
                "Style": [
                    {
                        "Title": "default",
                        "Identifier": "default",
                        "LegendURL": [
                            {
                                "format": "image/png",
                                "href": "https://www.wmts.nrw.de/legends/geobasis/wmts_nw_landbedeckung/nw_landbedeckung.png"
                            }
                        ],
                        "isDefault": true
                    }
                ],
                "Format": [
                    "image/png"
                ],
                "TileMatrixSetLink": [
                    {
                        "TileMatrixSet": "EPSG_25832_12"
                    },
                    {
                        "TileMatrixSet": "EPSG_3857_12"
                    }
                ],
                "ResourceURL": [
                    {
                        "format": "image/png",
                        "template": "https://www.wmts.nrw.de/geobasis/wmts_nw_landbedeckung/tiles/wmts_nw_landbedeckung/{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}.png",
                        "resourceType": "tile"
                    }
                ]
            }
        ],
        "TileMatrixSet": [
            // ...
        ]
    }
}…
*/

/**
 * Code for VectorLayer legend generation
 */

type GeometryType = Exclude<Type, "GeometryCollection" | "LinearRing">;

/**
 * Create a legendImage for one or multiple OpenLayer Style object(s).
 * Based on ol-ext "getLegendImage" function.
 * @param geometryType
 * @param styles
 * @param canvas
 */
// TODO: tests
// TODO: does the creation work if "renderer" is used in style
// TODO: add license hint
export function createLegendImageFromStyle(
    geometryType: GeometryType,
    styles: Style | Style[],
    canvas: HTMLCanvasElement
): HTMLCanvasElement {
    if (!geometryType || !styles) return canvas; // TODO: error?

    // TODO: is the size of the input canvas considered?
    const margin = 10;
    const size: [number, number] = [40, 25];
    const width = size[0] + 2 * margin;
    const height = size[1] + 2 * margin;
    const ratio = DEVICE_PIXEL_RATIO;

    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas; // TODO error?
    ctx.save();
    const vectorContext = toContext(ctx, { pixelRatio: ratio });

    if (!(styles instanceof Array)) styles = [styles];

    let cx = width / 2;
    let cy = height / 2;
    const sx = size[0] / 2;
    const sy = size[1] / 2;

    let i, s;
    // Get point offset
    if (geometryType === "Point") {
        let extent = null;
        for (i = 0; (s = styles[i]); i++) {
            const img = s.getImage();
            // Refresh legend on image load
            if (img) {
                // Check image is loaded
                loadImageStyles(styles); // TODO: wait for / rerender legend
                if (img && img instanceof HTMLImageElement && !img.naturalWidth) {
                    if (typeof img.onload === "function") {
                        img.addEventListener("load", function () {
                            setTimeout(function () {
                                // item.onload(); todo rerender legend?
                            }, 100);
                        });
                    }
                    img.load();
                }
                // Check anchor to center the image
                if (img.getAnchor) {
                    const anchor = img.getAnchor();
                    if (anchor?.length > 1 && anchor[0] != undefined && anchor[1] != undefined) {
                        const size = img.getSize();
                        if (size?.length > 1 && size[0] != undefined && size[1] != undefined) {
                            const dx = anchor[0] - size[0];
                            const dy = anchor[1] - size[1];
                            if (!extent) {
                                extent = [dx, dy, dx + size[0], dy + size[1]];
                            } else {
                                extend(extent, [dx, dy, dx + size[0], dy + size[1]]);
                            }
                        }
                    } else {
                        const size = img.getSize();
                        if (size?.length > 1 && size[0] != undefined && size[1] != undefined) {
                            const dx = size[0];
                            const dy = size[1];
                            if (!extent) {
                                extent = [dx, dy, dx + size[0], dy + size[1]];
                            } else {
                                extend(extent, [dx, dy, dx + size[0], dy + size[1]]);
                            }
                        }
                    }
                }
            }
        }
        if (
            extent &&
            extent.length > 2 &&
            extent[0] != undefined &&
            extent[1] != undefined &&
            extent[2] != undefined &&
            extent[3] != undefined
        ) {
            cx = cx + (extent[2] + extent[0]) / 2;
            cy = cy + (extent[3] + extent[1]) / 2;
        }
    }
    // TODO: if using an image in the style, the image is clipped off -> canvas seems to be to small

    // Draw image
    for (i = 0; (s = styles[i]); i++) {
        vectorContext.setStyle(s);
        ctx.save();
        let geom;
        switch (geometryType) {
            case "Point":
            case "MultiPoint": {
                geom = new Point([cx, cy]);
                break;
            }
            case "LineString":
            case "MultiLineString": {
                // Clip lines
                ctx.rect(margin * ratio, 0, size[0] * ratio, canvas.height);
                ctx.clip();
                geom = new LineString([
                    [cx - sx, cy],
                    [cx + sx, cy]
                ]);
                break;
            }
            case "Polygon":
            case "MultiPolygon": {
                geom = new Polygon([
                    [
                        [cx - sx, cy - sy],
                        [cx + sx, cy - sy],
                        [cx + sx, cy + sy],
                        [cx - sx, cy + sy],
                        [cx - sx, cy - sy]
                    ]
                ]);
                break;
            }
        }
        if (s.getGeometryFunction()) {
            geom = s.getGeometryFunction()(new Feature(geom));
        }
        if (!geom) return canvas; // todo error?
        vectorContext.drawGeometry(geom);
        ctx.restore();
    }

    ctx.restore();

    return canvas;
}

// TODO WIP
function loadImageStyles(styles: Style[]) {
    styles.forEach((style) => {
        let loading = false; // todo promise?
        const imageStyle = style.getImage();
        if (imageStyle) {
            const imageState = imageStyle.getImageState();
            if (!(imageState == ImageState.LOADED || imageState == ImageState.ERROR)) {
                if (imageState == ImageState.IDLE) {
                    imageStyle.load();
                }
                loading = true;
            }
        }
    });
}
