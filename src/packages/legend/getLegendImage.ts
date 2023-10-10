// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { LayerModel } from "@open-pioneer/map";
import { createLogger } from "@open-pioneer/core";
import TileLayer from "ol/layer/Tile";
import WMTS from "ol/source/WMTS";
import VectorLayer from "ol/layer/Vector";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Legend from "ol-ext/legend/Legend.js";

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

    /**
     * Uses ol-ext "getLegendImage" to crate images out of OL style objects
     *
     * todo only works if vectorLayer (or all individual features) has a style
     *      --> no legend for layers and features without styles: convert default flat style to stlye?
     *      (https://openlayers.org/en/latest/apidoc/module-ol_style_flat.html#~DefaultStyle)
     *
     * todo style might change during runtime --> need to rerender legend
     *
     * todo currently no labels for style icons are created
     *
     * todo it is possible to add multiple geometry types in one layer --> currently not considered
     * todo features may have individual styles that differ from the layer ones --> currently not considered
     * todo styles may be functions --> styles may differ with feature attributes
     *
     *     TODO: --> allow to configure "legendStyles" for each layer that will be used to create legend?
     */
    if (olLayer instanceof VectorLayer) {
        const feature = olLayer.getSource().getFeatures()[0];
        console.log(feature);

        const style = olLayer.getStyle();

        /**
         *  Create an image out of an OL style object:
         *  getLegendImage: creates a canvas using an OpenLayers style derived:
         *    if feature is given:
         *       tries to get style from feature (feature.getStyle()), else get style from item (item.style)
         *      --> features do not have a style if the layer has a style --> apply layer style to LegendItem
         *      (at least if feature as no individual style - however this is handled by getLegendImage function (see above))
         *    if no feature is given but typeGeom: generates a fake feature without a style and applies the rules above
         */
        const canvas = Legend.getLegendImage({
            title: "test",
            //feature: feature.clone(),
            typeGeom: "Point", // todo need to wait for features loaded (to derive typeGeom from first feature (see below)
            //typeGeom: feature.getGeometry().getType(),
            style: style ?? undefined
        });
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
