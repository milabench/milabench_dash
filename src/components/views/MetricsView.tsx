import { Box, Heading, HStack, IconButton, Center, Text } from '@chakra-ui/react';
import { ChevronLeftIcon } from '@chakra-ui/icons';
import type { Pack } from '../../services/types';

interface MetricsViewProps {
    selectedPack: Pack | null;
    executionId: number;
    onClose: () => void;
    isReportView: boolean;
    reportHtml: string;
}

export const MetricsView = ({ selectedPack, executionId, onClose, isReportView, reportHtml }: MetricsViewProps) => {
    const getMetricsUrl = (pack: Pack) => {
        // If _id is 0, it means we're in group view, so use the pack name
        // Otherwise use the pack ID
        const packIdentifier = pack._id === 0 ? pack.name : pack._id;
        return `/html/exec/${executionId}/packs/${packIdentifier}/metrics`;
    };

    return (
        <Box
            position="fixed"
            top={0}
            right={selectedPack ? "0" : "-50%"}
            w="55%"
            h="100vh"
            bg="white"
            boxShadow="lg"
            display="flex"
            flexDirection="column"
            zIndex={10}
            transition="right 0.3s ease-in-out"
        >
            <Box p={4} borderBottomWidth={1} bg="white">
                <HStack justify="space-between">
                    <Heading size="md">
                        {isReportView ? 'Execution Report' : `${selectedPack?.name || ''} Metrics`}
                    </Heading>
                    <IconButton
                        aria-label="Close panel"
                        icon={<ChevronLeftIcon />}
                        onClick={onClose}
                        variant="ghost"
                    />
                </HStack>
            </Box>
            <Box
                flex="1"
                position="relative"
                h="calc(100vh - 73px)"
            >
                {selectedPack ? (
                    isReportView ? (
                        <iframe
                            srcDoc={reportHtml}
                            style={{
                                width: '100%',
                                height: '100%',
                                border: 'none',
                                display: 'block',
                            }}
                            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                        />
                    ) : (
                        <iframe
                            src={getMetricsUrl(selectedPack)}
                            style={{
                                width: '100%',
                                height: '100%',
                                border: 'none',
                                display: 'block',
                            }}
                            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                        />
                    )
                ) : (
                    <Center h="100%" p={4}>
                        <Text color="gray.500">Select a pack to view metrics</Text>
                    </Center>
                )}
            </Box>
        </Box>
    );
};