import { useParams } from 'react-router-dom';
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
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { getExecution, getPacks, getPackMetrics } from '../../services/api';
import type { Execution, Pack, Metric } from '../../services/types';
import { DataTable } from '../common/Table';
import type { Column } from '../common/Table';
import { Loading } from '../common/Loading';

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
    const toast = useToast();

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
        { header: 'Name', accessor: 'name', width: '200px' },
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

    const metricColumns: Column<Metric>[] = [
        { header: 'Name', accessor: 'name', width: '200px' },
        { header: 'Value', accessor: 'value', width: '120px' },
        { header: 'Unit', accessor: 'unit', width: '100px' },
        { header: 'GPU ID', accessor: 'gpu_id', width: '100px' },
        {
            header: 'Timestamp',
            accessor: (metric: Metric) => formatDate(metric.timestamp),
            width: '180px',
        },
    ];

    if (isLoadingExecution || isLoadingPacks) {
        return <Loading message="Loading execution report..." />;
    }

    if (!execution) {
        return <Text>Execution not found</Text>;
    }

    const metrics = packs?.flatMap((pack) => pack.metrics || []) || [];

    return (
        <Box p={4}>
            <VStack align="stretch" spacing={6}>
                <Heading>Execution Report</Heading>

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

                {/* Packs and Metrics */}
                <Tabs>
                    <TabList>
                        <Tab>Packs</Tab>
                        <Tab>Metrics</Tab>
                    </TabList>

                    <TabPanels>
                        <TabPanel>
                            {packs && packs.length > 0 ? (
                                <DataTable
                                    data={packs}
                                    columns={packColumns}
                                    onRowClick={(pack) => {
                                        // TODO: Show pack details
                                        console.log('Clicked pack:', pack);
                                    }}
                                />
                            ) : (
                                <Text>No packs found</Text>
                            )}
                        </TabPanel>
                        <TabPanel>
                            {metrics.length > 0 ? (
                                <DataTable
                                    data={metrics}
                                    columns={metricColumns}
                                />
                            ) : (
                                <Text>No metrics found</Text>
                            )}
                        </TabPanel>
                    </TabPanels>
                </Tabs>
            </VStack>
        </Box>
    );
};