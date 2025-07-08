import React from 'react';
import {
    Box,
    Heading,
    Text,
    VStack,
    Badge,
    useToast,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    TableContainer,
    Switch,
    FormControl,
    FormLabel,
    HStack,
    Select
} from '@chakra-ui/react';
import axios from 'axios';

interface FastReportViewProps {
    executionId: string | number;
    onClose: () => void;
}

// Helper function to render cell values
// const renderCellValue = (value: any): string => {
//     if (value === null || value === undefined) {
//         return '-';
//     }
//     if (typeof value === 'number') {
//         return value.toFixed(2);
//     }
//     if (typeof value === 'boolean') {
//         return value ? 'Yes' : 'No';
//     }
//     if (typeof value === 'object') {
//         return JSON.stringify(value);
//     }
//     return String(value);
// };

const renderCellValue = (value: any, col: string): string => {
    if (value === null || value === undefined) {
        return '-';
    }

    if (col === "n") {
        return value.toFixed(0);
    }

    if (col === "ngpu") {
        return value.toFixed(0);
    }

    if (col === "weight") {
        return value.toFixed(0);
    }

    if (col === "enabled") {
        if (value > 0) {
            return "Yes";
        } else {
            return "No";
        }
    }

    if (typeof value === 'number') {
        return value.toFixed(2);
    }

    if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
    }
    if (typeof value === 'object') {
        return JSON.stringify(value);
    }
    return String(value);
};

// Helper function to get all unique keys from the data array
const getAllKeys = (data: any[], priorityMap: Record<string, number> = {}): string[] => {
    const keys = new Set<string>();
    data.forEach(item => {
        if (typeof item === 'object' && item !== null) {
            Object.keys(item).forEach(key => keys.add(key));
        }
    });
    return Array.from(keys).sort((a, b) => {
        const pa = priorityMap[a] ?? Number.MAX_SAFE_INTEGER;
        const pb = priorityMap[b] ?? Number.MAX_SAFE_INTEGER;
        if (pa !== pb) {
            return pa - pb;
        }
        return a.localeCompare(b);
    });
};


const columnPriority = {
    'bench': 0,
    'fail': 1,
    'n': 2,
    'ngpu': 3,
    'perf': 4,
    'std%': 5,
    'sem%': 6,
    'score': 7,
    'log_score': 8,
    'weight': 9,
}

export const FastReportView: React.FC<FastReportViewProps> = ({ executionId, onClose }) => {
    const toast = useToast();
    const [reportData, setReportData] = React.useState<any>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [dropMinMax, setDropMinMax] = React.useState(true);
    const [filterType, setFilterType] = React.useState<string>('all');

    const fetchFastReport = async (dropMinMaxValue: boolean) => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await axios.get(`/api/report/fast`, {
                params: {
                    exec_ids: executionId,
                    drop_min_max: dropMinMaxValue.toString()
                }
            });

            setReportData(response.data);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            toast({
                title: 'Error fetching fast report',
                description: errorMessage,
                status: 'error',
                duration: 5000,
            });
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        fetchFastReport(dropMinMax);
    }, [executionId, dropMinMax, toast]);

    const handleDropMinMaxToggle = (value: boolean) => {
        setDropMinMax(value);
    };

    const handleFilterChange = (value: string) => {
        setFilterType(value);
    };

    if (isLoading) {
        return (
            <Box p={4}>
                <Text>Loading fast report...</Text>
            </Box>
        );
    }

    if (error) {
        return (
            <Box p={4}>
                <Text color="red.500">Error: {error}</Text>
            </Box>
        );
    }

    let acc = { "log_score": 0, "weight": 0, "total": 0 };

    // Ensure reportData is an array
    const dataArray = (Array.isArray(reportData) ? reportData : [reportData]).map(item => {
        // Compute total log_score and weight
        acc["log_score"] += item["log_score"];
        acc["weight"] += item["weight"] * item["enabled"];
        acc["total"] = item["weight_total"];

        // Only show a subset of the results to aboid crowding the table
        let newRow = {
            "bench": item["bench"],
            "fail": item["fail"],
            "n": item["n"],
            "ngpu": item["ngpu"],
            "perf": item["perf"],
            "std%": item["std"] * 100 / item["perf"],
            "sem%": item["sem"] * 100 / item["perf"],
            "score": item["score"],
            "log_score": item["log_score"],
            "weight": item["weight"],
            // In this case there is only one exec ID
            // "exec_id": item["exec_id"],
            "enabled": item["enabled"],
        };

        return newRow;
    });

    // Apply filter to data array
    const filteredDataArray = dataArray.filter(row => {
        switch (filterType) {
            case 'weight':
                return row.weight > 0;
            case 'enabled':
                return row.enabled > 0;
            default:
                return true; // 'all' - show everything
        }
    });

    const columns = getAllKeys(filteredDataArray, columnPriority);

    return (
        <Box
            position="fixed"
            top={0}
            right={0}
            width="50%"
            height="100vh"
            bg="white"
            borderLeft="1px solid"
            borderColor="gray.200"
            overflow="auto"
            zIndex={1000}
        >
            <VStack align="stretch" spacing={4} p={4}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <VStack align="start" spacing={1}>
                        <Heading size="md">SQL Report</Heading>
                        <Badge colorScheme="green">API Endpoint</Badge>
                    </VStack>
                    <Text
                        cursor="pointer"
                        onClick={onClose}
                        fontSize="lg"
                        fontWeight="bold"
                        _hover={{ color: 'gray.600' }}
                    >
                        ×
                    </Text>
                </Box>

                <HStack spacing={4}>
                    <FormControl>
                        <HStack justify="space-between">
                            <FormLabel htmlFor="drop-min-max" fontSize="sm" mb={0}>
                                Drop Min/Max Values
                            </FormLabel>
                            <Switch
                                id="drop-min-max"
                                isChecked={dropMinMax}
                                onChange={(e) => handleDropMinMaxToggle(e.target.checked)}
                                size="sm"
                            />
                        </HStack>
                    </FormControl>

                    <FormControl>
                        <HStack justify="space-between">
                            <FormLabel htmlFor="filter-type" fontSize="sm" mb={0}>
                                Filter
                            </FormLabel>
                            <Select
                                id="filter-type"
                                value={filterType}
                                onChange={(e) => handleFilterChange(e.target.value)}
                                size="sm"
                                width="150px"
                            >
                                <option value="all">All Benches</option>
                                <option value="weight">Weight &gt; 0</option>
                                <option value="enabled">Enabled Only</option>
                            </Select>
                        </HStack>
                    </FormControl>
                </HStack>

                <Box
                    bg="white"
                    borderRadius="md"
                    border="1px solid"
                    borderColor="gray.200"
                    overflow="auto"
                    maxHeight="calc(100vh - 200px)"
                >
                    <TableContainer>
                        <Table variant="simple" size="sm">
                            <Thead>
                                <Tr>
                                    {columns.map((column) => (
                                        <Th key={column} fontSize="xs" px={2} py={2}>
                                            {column}
                                        </Th>
                                    ))}
                                </Tr>
                            </Thead>
                            <Tbody>
                                {filteredDataArray.map((row, rowIndex) => {
                                    let classNames = [
                                        row.enabled ? 'bench-enabled' : 'bench-disabled',
                                        `bench-${row.bench}`,
                                        row.fail ? 'bench-fail' : 'bench-pass',
                                        row.perf > 0 ? 'bench-perf' : 'bench-no-perf',
                                        row.weight > 0 ? 'bench-weight' : 'bench-no-weight',
                                    ];

                                    return (
                                        <Tr key={rowIndex} _hover={{ bg: 'gray.50' }} className={classNames.join(' ')} >
                                            {columns.map((column) => (
                                                <Td key={column} fontSize="xs" px={2} py={2}>
                                                    <Text fontSize="xs" noOfLines={2}>
                                                        {renderCellValue(row[column], column)}
                                                    </Text>
                                                </Td>
                                            ))}
                                        </Tr>
                                    )
                                })}
                            </Tbody>
                        </Table>
                    </TableContainer>
                </Box>

                <Box
                    bg="gray.50"
                    p={4}
                    borderRadius="md"
                    border="1px solid"
                    borderColor="gray.200"
                >
                    <Text>
                        Score: <span style={{ color: 'green', fontWeight: 'bold' }}>{Math.exp(acc["log_score"] / acc["total"]).toFixed(2)}</span>
                    </Text>

                </Box>

                <Box
                    bg="gray.50"
                    p={4}
                    borderRadius="md"
                    border="1px solid"
                    borderColor="gray.200"
                >
                    <Text fontSize="sm" color="gray.600" mb={2}>
                        Execution ID: {executionId}
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                        Generated using /api/report/fast endpoint
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                        Rows: {filteredDataArray.length} | Columns: {columns.length}
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                        Drop Min/Max: {dropMinMax ? 'Enabled' : 'Disabled'}
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                        Filter: {filterType === 'all' ? 'All Benches' : filterType === 'weight' ? 'Weight > 0' : 'Enabled Only'}
                    </Text>
                </Box>
            </VStack>
        </Box>
    );
};