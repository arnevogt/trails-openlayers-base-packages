// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
/*
 * happy-dom does not implement DOMParser for XML: https://github.com/capricorn86/happy-dom/issues/282
 * @vitest-environment jsdom
 */
import { readFileSync } from "fs";
import WMTSCapabilities from "ol/format/WMTSCapabilities";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { getWMTSLegendURL } from "./getLegendImage";

const THIS_DIR = dirname(fileURLToPath(import.meta.url));

describe("getWMTSLegendURL()", () => {
    it("returns legend url from WMTSLayer", () => {
        const capabilitiesXML = readFileSync(
            resolve(THIS_DIR, "./test-data/WMTSCapabilities_with_legend.xml"),
            "utf-8"
        );
        const wmtsParser = new WMTSCapabilities();
        const wmtsCapabilities = wmtsParser.read(capabilitiesXML);

        const legendURL = getWMTSLegendURL(wmtsCapabilities, "wmts_nw_landbedeckung", "default");
        expect(legendURL).toEqual(
            "https://www.wmts.nrw.de/legends/geobasis/wmts_nw_landbedeckung/nw_landbedeckung.png"
        );
    });
});
