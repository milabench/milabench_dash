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
    Tooltip,
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


const copyToClipboard = (toast: any, text: string) => {
    return () => {
        navigator.clipboard.writeText(text);
        toast({
            title: "Copied to clipboard",
            status: "success",
        });
    }
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
                    {pack.tag}
                </Button>
            ),
            width: '200px'
        },
        {
            header: 'Command',
            accessor: (pack: Pack) => (
                pack.command ?
                <Tooltip label={(pack.command|| []).join(' ')}>
                    <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={copyToClipboard(toast, (pack.command|| []).join(' ') )}
                    >
                        Copy Command
                    </Button>
                </Tooltip> :
                <Text>-</Text>
            ),
            width: '150px'
        },
        {
            header: "Config",
            accessor: (pack: Pack) => (
                <Tooltip label={<pre>{JSON.stringify(pack.config, null, 2)}</pre>}>
                    <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={copyToClipboard(toast, JSON.stringify(pack.config, null, 2))}
                    >
                        Copy Config
                    </Button>
                </Tooltip>
            ),
            width: '150px'
        }
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
                        <Stat>
                            <StatLabel>Name</StatLabel>
                            <StatNumber>{execution.name} </StatNumber>
                            <StatHelpText>{execution.namespace}</StatHelpText>
                        </Stat>
                        <SimpleGrid columns={2} spacing={4}>
                            <Stat>
                                <StatLabel>GPU</StatLabel>
                                <StatNumber>
                                    {execution.meta?.accelerators?.gpus?.[0]?.product || 'N/A'}
                                </StatNumber>
                                <StatHelpText>
                                    Driver: {execution.meta?.accelerators?.system?.CUDA_DRIVER || 'N/A'}
                                </StatHelpText>
                            </Stat>
                            <Stat>
                                <StatLabel>PyTorch</StatLabel>
                                <StatNumber>{execution.meta?.pytorch?.build_settings?.TORCH_VERSION || 'N/A'}</StatNumber>
                                <StatHelpText>CUDA: {execution.meta?.pytorch?.build_settings?.CUDA_VERSION || 'N/A'}</StatHelpText>
                            </Stat>

                            <Stat>
                                <StatLabel>CPU</StatLabel>
                                <StatNumber>{execution.meta?.cpu?.count || 'N/A'}</StatNumber>
                                <StatHelpText>Name: {execution.meta?.cpu?.brand || 'N/A'}</StatHelpText>
                            </Stat>
                            <Stat>
                                <StatLabel>System</StatLabel>
                                <StatNumber>{execution.meta?.os?.machine|| 'N/A'}</StatNumber>
                                <StatHelpText>Kernel: {execution.meta?.os?.release	 || 'N/A'}</StatHelpText>
                            </Stat>

                            <Stat>
                                <StatLabel>Milabench</StatLabel>
                                <StatNumber>{execution.meta?.milabench?.tag || 'N/A'}</StatNumber>
                                <StatHelpText>Date: {execution.meta?.milabench?.date || 'N/A'}</StatHelpText>
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
                            </Stat>
                            <Stat>
                                <StatLabel>Created Time</StatLabel>
                                <StatNumber>{new Date(execution.created_time).toLocaleString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</StatNumber>
                                <StatHelpText>

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