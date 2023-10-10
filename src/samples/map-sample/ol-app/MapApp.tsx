// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { BasemapSwitcher } from "@open-pioneer/basemap-switcher";
import {
    Box,
    Button,
    Flex,
    FormControl,
    FormLabel,
    Image,
    Text,
    VStack
} from "@open-pioneer/chakra-integration";
import { Sidebar, SidebarItem } from "@open-pioneer/experimental-layout-sidebar";
import { LayerControlComponent } from "@open-pioneer/experimental-ol-layer-control";
import { getLegendImage } from "@open-pioneer/legend";
import { LayerModel, MapAnchor, MapContainer, MapPadding, useMapModel } from "@open-pioneer/map";
import { Toc } from "@open-pioneer/toc";
import { useIntl } from "open-pioneer:react-hooks";
import { useMemo, useState } from "react";
import { FiCodesandbox, FiLayers } from "react-icons/fi";
import { MAP_ID } from "./MapConfigProviderImpl";

const berlin = [796987, 5827477, 796987, 5827477];

export function MapApp() {
    const [viewPadding, setViewPadding] = useState<MapPadding>();
    const [isExpanded, setExpanded] = useState<boolean>(true);
    const mapState = useMapModel(MAP_ID);

    const centerBerlin = () => {
        const olMap = mapState.map?.olMap;
        if (olMap) {
            olMap?.getView().fit(berlin, { maxZoom: 13 });
        }
    };

    const intl = useIntl();

    const items: SidebarItem[] = [
        {
            id: "map-content",
            icon: <FiLayers />,
            label: "Karteninhalt",
            content: <LayerControlComponent mapId={MAP_ID} showOpacitySlider={true} />
        },
        {
            id: "sandbox",
            icon: <FiCodesandbox />,
            label: "Sandbox",
            content: <Button onClick={centerBerlin}>Center Berlin</Button>
        }
    ];

    return (
        <Flex height="100%" direction="column" overflow="hidden">
            <Box textAlign="center" py={1} px={1}>
                Open Pioneer - Map sample
            </Box>

            <Flex flex="1" direction="column" position="relative">
                <Sidebar
                    defaultExpanded={isExpanded}
                    expandedChanged={(expanded) => setExpanded(expanded)}
                    sidebarWidthChanged={(width) => setViewPadding({ left: width })}
                    items={items}
                />
                <MapContainer
                    mapId={MAP_ID}
                    viewPadding={viewPadding}
                    viewPaddingChangeBehavior="preserve-extent"
                >
                    <MapAnchor position="top-left" horizontalGap={10} verticalGap={10}>
                        <Flex direction="column" maxW="300px" gap={4} overflow="hidden">
                            <Box
                                backgroundColor="whiteAlpha.800"
                                borderWidth="1px"
                                borderRadius="lg"
                                padding={2}
                                boxShadow="lg"
                            >
                                <FormControl>
                                    <FormLabel ps={1}>
                                        <Text as="b">
                                            {intl.formatMessage({ id: "basemapLabel" })}
                                        </Text>
                                    </FormLabel>
                                    <BasemapSwitcher allowSelectingEmptyBasemap mapId={MAP_ID} />
                                </FormControl>
                            </Box>
                            <Box backgroundColor="whiteAlpha.800">
                                <Toc
                                    mapId={MAP_ID}
                                    basemapSwitcherProps={{
                                        allowSelectingEmptyBasemap: true
                                    }}
                                ></Toc>
                            </Box>
                            <Box
                                flex="1 1 auto"
                                overflow="auto"
                                backgroundColor="whiteAlpha.800"
                                padding={2}
                            >
                                <Legend mapId={MAP_ID} />
                            </Box>
                        </Flex>
                    </MapAnchor>
                </MapContainer>
            </Flex>
        </Flex>
    );
}

function Legend(props: { mapId: string }) {
    const { mapId } = props;
    const { map } = useMapModel(mapId);

    let layers: LayerModel[] = [];
    if (map) {
        layers = map.layers.getAllLayers();
    }

    if (!layers.length) {
        return <Text>No layers found</Text>;
    }

    return (
        <>
            <Text as="b">Legend</Text>
            {layers.map((layer) => (
                <LegendViewer key={layer.id} layer={layer} />
            ))}
        </>
    );
}

function LegendViewer(props: { layer: LayerModel }) {
    const { layer } = props;
    const legend = useMemo(() => getLegendImage(layer), [layer]);
    const legendContent = (() => {
        switch (legend?.type) {
            case undefined:
                return null;
            case "image":
                return (
                    <Box className="legend-image-container" overflowY="auto">
                        <Image
                            className="legend-image"
                            src={legend.href}
                            alt="Legend image"
                            maxW="none"
                            maxH="none"
                        />
                    </Box>
                );
        }
    })();

    return (
        <VStack align="left" spacing={2}>
            <Text>Legend for {layer.title}</Text>
            {legendContent}
        </VStack>
    );
}
