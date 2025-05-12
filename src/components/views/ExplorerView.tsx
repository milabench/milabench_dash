import { useState } from 'react';
import {
    Box,
    VStack,
    HStack,
    Heading,
    Button,
    Text,
    Select,
    Input,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Badge,
    useToast,
    IconButton,
    Tooltip,
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { SearchIcon, AddIcon, DeleteIcon } from '@chakra-ui/icons';

interface Filter {
    field: string;
    operator: string;
    value: string;
}

interface Execution {
    id: string;
    name: string;
    pack: string;
    status: string;
    created_at: string;
    metrics: { [key: string]: number };
}

export const ExplorerView = () => {
    const toast = useToast();
    const [filters, setFilters] = useState<Filter[]>([]);
    const [availableFields, setAvailableFields] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch available fields
    const { data: fields } = useQuery({
        queryKey: ['explorerFields'],
        queryFn: async () => {
            const response = await axios.get('/api/keys');
            setAvailableFields(response.data);
            return response.data;
        },
    });

    // Fetch executions based on filters
    const { data: executions, refetch: refetchExecutions } = useQuery({
        queryKey: ['explorerExecutions', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.length > 0) {
                params.append('filters', btoa(JSON.stringify(filters)));
            }
            const response = await axios.get(`/api/executions?${params.toString()}`);
            return response.data;
        },
        enabled: filters.length > 0,
    });

    const addFilter = () => {
        setFilters([...filters, { field: '', operator: '==', value: '' }]);
    };

    const removeFilter = (index: number) => {
        const newFilters = [...filters];
        newFilters.splice(index, 1);
        setFilters(newFilters);
    };

    const updateFilter = (index: number, field: string, operator: string, value: string) => {
        const newFilters = [...filters];
        newFilters[index] = { field, operator, value };
        setFilters(newFilters);
    };

    const handleSearch = async () => {
        if (filters.length === 0) {
            toast({
                title: 'No filters',
                description: 'Please add at least one filter to search',
                status: 'warning',
                duration: 3000,
            });
            return;
        }

        setIsLoading(true);
        try {
            await refetchExecutions();
        } catch (error) {
            toast({
                title: 'Error searching executions',
                description: error instanceof Error ? error.message : 'Unknown error',
                status: 'error',
                duration: 5000,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box p={4}>
            <VStack align="stretch" spacing={6}>
                <Heading>Execution Explorer</Heading>

                {/* Filters Section */}
                <Box borderWidth={1} borderRadius="md" p={4}>
                    <VStack align="stretch" spacing={4}>
                        <HStack justify="space-between">
                            <Heading size="md">Filters</Heading>
                            <Button
                                leftIcon={<AddIcon />}
                                onClick={addFilter}
                                size="sm"
                            >
                                Add Filter
                            </Button>
                        </HStack>

                        {filters.map((filter, index) => (
                            <HStack key={index} spacing={2}>
                                <Select
                                    value={filter.field}
                                    onChange={(e) => updateFilter(index, e.target.value, filter.operator, filter.value)}
                                    placeholder="Select field"
                                    size="sm"
                                >
                                    {availableFields.map((field) => (
                                        <option key={field} value={field}>
                                            {field}
                                        </option>
                                    ))}
                                </Select>

                                <Select
                                    value={filter.operator}
                                    onChange={(e) => updateFilter(index, filter.field, e.target.value, filter.value)}
                                    size="sm"
                                >
                                    <option value="==">Equals (==)</option>
                                    <option value="!=">Not Equals (!=)</option>
                                    <option value=">">Greater Than (&gt;)</option>
                                    <option value=">=">Greater Than or Equal (&gt;=)</option>
                                    <option value="<">Less Than (&lt;)</option>
                                    <option value="<=">Less Than or Equal (&lt;=)</option>
                                    <option value="in">In List (in)</option>
                                    <option value="not in">Not In List (not in)</option>
                                    <option value="like">Like</option>
                                    <option value="not like">Not Like</option>
                                    <option value="is">Is</option>
                                    <option value="is not">Is Not</option>
                                </Select>

                                <Input
                                    value={filter.value}
                                    onChange={(e) => updateFilter(index, filter.field, filter.operator, e.target.value)}
                                    placeholder="Enter value"
                                    size="sm"
                                />

                                <IconButton
                                    aria-label="Remove filter"
                                    icon={<DeleteIcon />}
                                    onClick={() => removeFilter(index)}
                                    size="sm"
                                    colorScheme="red"
                                    variant="ghost"
                                />
                            </HStack>
                        ))}

                        <Button
                            leftIcon={<SearchIcon />}
                            onClick={handleSearch}
                            isLoading={isLoading}
                            colorScheme="blue"
                            alignSelf="flex-end"
                        >
                            Search
                        </Button>
                    </VStack>
                </Box>

                {/* Results Section */}
                <Box borderWidth={1} borderRadius="md" p={4}>
                    <VStack align="stretch" spacing={4}>
                        <Heading size="md">Results</Heading>
                        <Table variant="simple">
                            <Thead>
                                <Tr>
                                    <Th>Name</Th>
                                    <Th>Pack</Th>
                                    <Th>Status</Th>
                                    <Th>Created At</Th>
                                    <Th>Actions</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {executions?.map((execution: Execution) => (
                                    <Tr key={execution.id}>
                                        <Td>{execution.name}</Td>
                                        <Td>{execution.pack}</Td>
                                        <Td>
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
                                        </Td>
                                        <Td>{new Date(execution.created_at).toLocaleString()}</Td>
                                        <Td>
                                            <HStack spacing={2}>
                                                <Tooltip label="View Report">
                                                    <Button
                                                        as={Link}
                                                        to={`/exec/${execution.id}`}
                                                        size="sm"
                                                        colorScheme="blue"
                                                        variant="ghost"
                                                    >
                                                        Report
                                                    </Button>
                                                </Tooltip>
                                            </HStack>
                                        </Td>
                                    </Tr>
                                ))}
                            </Tbody>
                        </Table>
                    </VStack>
                </Box>
            </VStack>
        </Box>
    );
};