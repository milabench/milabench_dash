import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
    Box,
    Heading,
    Text,
    VStack,
    HStack,
    Badge,
    useToast,
    Tabs,
    TabList,
    TabPanels,
    Tab,
    TabPanel,
    Stat,
    StatLabel,
    StatNumber,
    StatHelpText,
    StatArrow,
    SimpleGrid,
    Button,
    Accordion,
    AccordionItem,
    AccordionButton,
    AccordionPanel,
    AccordionIcon,
    Grid,
    GridItem,
    IconButton,
    Center,
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { getExecution, getPacks, getPackMetrics, getPackMetricsPlot } from '../../services/api';
import type { Execution, Pack, Metric } from '../../services/types';
import { DataTable } from '../common/Table';
import type { Column } from '../common/Table';
import { Loading } from '../common/Loading';
import axios from 'axios';
import { ChevronLeftIcon } from '@chakra-ui/icons';
import { MetricsView } from './MetricsView';

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
};

const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
};

export const ExecutionReport = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const toast = useToast();
    const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
    const [reportHtml, setReportHtml] = useState<string>('');
    const [isReportView, setIsReportView] = useState(false);

    const { data: execution, isLoading: isLoadingExecution } = useQuery<Execution>({
        queryKey: ['execution', id],
        queryFn: () => getExecution(Number(id)),
        enabled: !!id,
    });

    const { data: packs, isLoading: isLoadingPacks } = useQuery<Pack[]>({
        queryKey: ['packs', id],
        queryFn: () => getPacks(Number(id)),
        enabled: !!id,
    });

    const packColumns: Column<Pack>[] = [
        { header: 'ID', accessor: '_id', width: '80px' },
        {
            header: 'Name',
            accessor: (pack: Pack) => (
                <Button
                    variant="link"
                    onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPack(pack);
                        setIsReportView(false);
                    }}
                >
                    {pack.name}
                </Button>
            ),
            width: '200px'
        },
        {
            header: 'Status',
            accessor: (pack: Pack) => (
                <Badge
                    colorScheme={pack.status === 'completed' ? 'green' : pack.status === 'failed' ? 'red' : 'yellow'}
                >
                    {pack.status}
                </Badge>
            ),
            width: '100px',
        },
        {
            header: 'Duration',
            accessor: (pack: Pack) => formatDuration(pack.walltime),
            width: '100px',
        },
        {
            header: 'Return Code',
            accessor: 'return_code',
            width: '100px',
        },
    ];

    const generateReport = async () => {
        try {
            const response = await axios.get(`/html/report/${id}`);
            setReportHtml(response.data);
            setIsReportView(true);
            setSelectedPack({ name: 'Report', _id: 0 } as Pack);
        } catch (error) {
            toast({
                title: 'Error generating report',
                description: error instanceof Error ? error.message : 'Unknown error',
                status: 'error',
                duration: 5000,
            });
        }
    };

    const handlePackGroupClick = async (pack: Pack) => {
        setSelectedPack({ ...pack, _id: 0 });
        setIsReportView(false);
    };

    const closeMetricsPanel = () => {
        setSelectedPack(null);
        setReportHtml('');
        setIsReportView(false);
    };

    if (isLoadingExecution || isLoadingPacks) {
        return <Loading message="Loading execution report..." />;
    }

    if (!execution) {
        return <Text>Execution not found</Text>;
    }

    // Group packs by name
    const groupedPacks = packs?.reduce((acc, pack) => {
        if (!acc[pack.name]) {
            acc[pack.name] = [];
        }
        acc[pack.name].push(pack);
        return acc;
    }, {} as { [key: string]: Pack[] }) || {};

    return (
        <>
            <Box p={4}>
                <VStack align="stretch" spacing={6}>
                    <HStack justify="space-between">
                        <Heading>Execution Report</Heading>
                        <Button colorScheme="blue" onClick={generateReport}>
                            Generate Report
                        </Button>
                    </HStack>

                    {/* Execution Details */}
                    <Box p={4} borderWidth={1} borderRadius="md">
                        <SimpleGrid columns={2} spacing={4}>
                            <Stat>
                                <StatLabel>GPU</StatLabel>
                                <StatNumber>
                                    {execution.meta?.accelerators?.gpus?.[0]?.product || 'N/A'}
                                </StatNumber>
                                <StatHelpText>
                                    Driver: {execution.meta?.accelerators?.gpus?.[0]?.driver || 'N/A'}
                                </StatHelpText>
                            </Stat>
                            <Stat>
                                <StatLabel>PyTorch</StatLabel>
                                <StatNumber>{execution.meta?.pytorch?.torch || 'N/A'}</StatNumber>
                                <StatHelpText>CUDA: {execution.meta?.pytorch?.cuda || 'N/A'}</StatHelpText>
                            </Stat>
                            <Stat>
                                <StatLabel>Status</StatLabel>
                                <StatNumber>
                                    <Badge
                                        colorScheme={
                                            execution.status === 'completed'
                                                ? 'green'
                                                : execution.status === 'failed'
                                                    ? 'red'
                                                    : 'yellow'
                                        }
                                    >
                                        {execution.status}
                                    </Badge>
                                </StatNumber>
                                <StatHelpText>Return Code: {execution.return_code}</StatHelpText>
                            </Stat>
                            <Stat>
                                <StatLabel>Duration</StatLabel>
                                <StatNumber>{formatDuration(execution.walltime)}</StatNumber>
                                <StatHelpText>
                                    Started: {formatDate(execution.meta?.timestamp || new Date().toISOString())}
                                </StatHelpText>
                            </Stat>
                        </SimpleGrid>
                    </Box>

                    {/* Packs */}
                    <Box>
                        <Heading size="md" mb={4}>Packs</Heading>
                        <Accordion allowMultiple>
                            {Object.entries(groupedPacks).map(([name, packs]) => (
                                <AccordionItem key={name}>
                                    <h2>
                                        <AccordionButton
                                            onClick={() => handlePackGroupClick(packs[0])}
                                            _hover={{ bg: 'gray.50' }}
                                        >
                                            <Box flex="1" textAlign="left">
                                                <HStack>
                                                    <Heading size="sm">{name}</Heading>
                                                    <Badge colorScheme="blue">{packs.length} runs</Badge>
                                                </HStack>
                                            </Box>
                                            <AccordionIcon />
                                        </AccordionButton>
                                    </h2>
                                    <AccordionPanel pb={4}>
                                        <DataTable
                                            data={packs}
                                            columns={packColumns}
                                        />
                                    </AccordionPanel>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </Box>
                </VStack>
            </Box>
            <MetricsView
                selectedPack={selectedPack}
                executionId={Number(id)}
                onClose={closeMetricsPanel}
                isReportView={isReportView}
                reportHtml={reportHtml}
            />
        </>
    );
};