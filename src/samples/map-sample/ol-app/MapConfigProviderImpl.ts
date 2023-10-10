// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { LayerConfig, MapConfig, MapConfigProvider } from "@open-pioneer/map";
import WMTSCapabilities from "ol/format/WMTSCapabilities";
import TileLayer from "ol/layer/Tile";
import WMTS, { optionsFromCapabilities } from "ol/source/WMTS";
import VectorSource from "ol/source/Vector";
import { GeoJSON } from "ol/format";
import VectorLayer from "ol/layer/Vector";
import { Circle, Fill, Style } from "ol/style";

export const MAP_ID = "main";

export class MapConfigProviderImpl implements MapConfigProvider {
    mapId = MAP_ID;

    async getMapConfig(): Promise<MapConfig> {
        return {
            initialView: {
                kind: "position",
                center: { x: 404747, y: 5757920 },
                zoom: 14
            },
            projection: "EPSG:25832",
            layers: [
                {
                    title: "Haltestellen Stadt Rostock",
                    visible: true,
                    layer: createHaltestellenLayer()
                },
                await createWMTSLayer()
            ]
        };
    }
}

async function createWMTSLayer(): Promise<LayerConfig> {
    const response = await fetch(
        "https://www.wmts.nrw.de/geobasis/wmts_nw_landbedeckung/1.0.0/WMTSCapabilities.xml"
    );
    if (!response.ok) {
        throw new Error("Failed to load capabilities.");
    }

    const responseText = await response.text();
    const wmtsParser = new WMTSCapabilities();
    const wmtsCapabilities = wmtsParser.read(responseText);
    const wmtsOptions = optionsFromCapabilities(wmtsCapabilities, {
        layer: "wmts_nw_landbedeckung"
    });
    if (!wmtsOptions) {
        throw new Error("Failed to parse wmts options from capabilities.");
    }

    const wmtsSource = new WMTS(wmtsOptions);
    return {
        id: "wmts",
        title: "lden_gesamt_wmts",
        isBaseLayer: true,
        layer: new TileLayer({
            source: wmtsSource
        }),
        attributes: {
            /* TODO: Just for this experiment. These would have to be transported automatically, using a WMTSLayer class for example. */
            wmtsCapabilities: wmtsCapabilities
        }
    };
}

function createHaltestellenLayer() {
    const geojsonSource = new VectorSource({
        url: "https://geo.sv.rostock.de/download/opendata/haltestellen/haltestellen.json",
        format: new GeoJSON(), //assign GeoJson parser
        attributions: "Haltestellen Stadt Rostock, Creative Commons CC Zero License (cc-zero)"
    });

    return new VectorLayer({
        source: geojsonSource,
        /* style: new Style({
            image: new Circle({
                radius: 5,
                fill: new Fill({
                    color: "red"
                })
            })
        })*/
        style: (feature, resolution) => {
            const style = new Style();
            const verkehrsmittel = feature.get("verkehrsmittel");
            let color = "";
            switch (verkehrsmittel) {
                case "Bus":
                    color = "green";
                    break;
                case "Straßenbahn":
                    color = "red";
                    break;
                case "Fähre":
                    color = "blue";
                    break;
                default:
                    color = "black";
            }

            const image = new Circle();
            style.setImage(image);

            image.setFill(new Fill({ color: color }));

            const label = feature.get("bezeichnung");
            //if (resolution < 10) {
            // style.setText(new Text({ text: label }));
            //}
            return style;
        }
    });
}
