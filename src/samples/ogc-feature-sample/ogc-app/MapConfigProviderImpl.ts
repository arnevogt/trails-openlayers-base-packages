// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { MapConfig, MapConfigProvider } from "@open-pioneer/map";
import { createVectorSource } from "@open-pioneer/ogc-features";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import OSM from "ol/source/OSM";
import { Circle, Fill, Style } from "ol/style";
import { MapboxVectorLayer } from "ol-mapbox-style";

export const MAP_ID = "main";

export class MapConfigProviderImpl implements MapConfigProvider {
    mapId = MAP_ID;

    async getMapConfig(): Promise<MapConfig> {
        return {
            projection: "EPSG:3857",
            initialView: {
                kind: "position",
                center: {
                    x: 848890,
                    y: 6793350
                },
                zoom: 13
            },
            layers: [
                {
                    title: "OSM",
                    visible: true,
                    isBaseLayer: true,
                    layer: new TileLayer({
                        source: new OSM()
                    })
                },
                {
                    id: "inspire-us-kindergarten",
                    title: "Kindertageseinrichtungen in NRW",
                    visible: true,
                    layer: new VectorLayer({
                        style: new Style({
                            image: new Circle({
                                fill: new Fill({ color: "blue" }),
                                radius: 5
                            })
                        }),
                        source: createVectorSource({
                            baseUrl: "https://ogc-api.nrw.de/inspire-us-kindergarten/v1",
                            collectionId: "governmentalservice",
                            crs: "http://www.opengis.net/def/crs/EPSG/0/3857",
                            attributions:
                                "<a href='https://www.govdata.de/dl-de/by-2-0'>Datenlizenz Deutschland - Namensnennung - Version 2.0</a>"
                        })
                    })
                },
                {
                    id: "ogc_katasterbezirk",
                    title: "Liegenschaftskatasterbezirke in NRW (viele Daten)",
                    visible: false,
                    layer: new VectorLayer({
                        source: createVectorSource({
                            baseUrl: "https://ogc-api.nrw.de/lika/v1",
                            collectionId: "katasterbezirk",
                            limit: 1000,
                            crs: "http://www.opengis.net/def/crs/EPSG/0/3857",
                            attributions:
                                "<a href='https://www.govdata.de/dl-de/by-2-0'>Datenlizenz Deutschland - Namensnennung - Version 2.0</a>"
                        })
                    })
                },
                {
                    title: "Abschnitte/Äste mit Unfällen (Mapbox Style)",
                    visible: false,
                    layer: new MapboxVectorLayer({
                        styleUrl: "https://demo.ldproxy.net/strassen/styles/default?f=mbs",
                        accessToken: null
                    })
                }
            ]
        };
    }
}
