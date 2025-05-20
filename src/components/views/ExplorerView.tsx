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
    Spinner,
    Center,
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
    run: string;
    bench: string;
    [key: string]: any; // For dynamic fields
}

// Helper function to format field names for display
const formatFieldName = (field: string) => {
    // Handle fields with "as" keyword
    const parts = field.split(' as ');
    const baseField = parts[0];

    // Split the base field into table and path
    const [table, path] = baseField.split(':');

    // If there's an alias, use it
    if (parts.length > 1) {
        return parts[1];
    }

    // Otherwise format the field name nicely
    return `${table}.${path}`;
};

// Helper function to ensure field has correct format
const ensureFieldFormat = (field: string) => {
    // If field already has a colon, return as is
    if (field.includes(':')) {
        return field;
    }

    // If field has "as" keyword, handle it
    const parts = field.split(' as ');
    const baseField = parts[0];

    // Add default table prefix if missing
    if (!baseField.includes(':')) {
        const formattedField = `Exec:${baseField}`;
        return parts.length > 1 ? `${formattedField} as ${parts[1]}` : formattedField;
    }

    return field;
};

export const ExplorerView = () => {
    const toast = useToast();
    const [filters, setFilters] = useState<Filter[]>([]);
    const [availableFields, setAvailableFields] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchParams, setSearchParams] = useState<Filter[]>([]);

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
    const { data: executions, isLoading: isQueryLoading, refetch } = useQuery({
        queryKey: ['explorerExecutions', searchParams],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (searchParams.length > 0) {
                params.append('filters', btoa(JSON.stringify(searchParams)));
            }
            const response = await axios.get(`/api/exec/explore?${params.toString()}`);
            return response.data;
        },
        enabled: searchParams.length > 0,
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
        // Ensure field has correct format before updating
        const formattedField = ensureFieldFormat(field);
        newFilters[index] = { field: formattedField, operator, value };
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
            // Update search params to trigger the query
            setSearchParams([...filters]);
            // Force a refetch of the data
            await refetch();
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

    // Get all unique field names from the executions data
    const getTableColumns = () => {
        if (!executions || executions.length === 0) return [];

        const allFields = new Set<string>();
        executions.forEach((exec: Execution) => {
            Object.keys(exec).forEach(key => allFields.add(key));
        });

        return Array.from(allFields);
    };

    // Format value based on field type
    const formatValue = (field: string, value: any) => {
        if (value === undefined || value === null) return '-';

        // Handle numeric values
        if (typeof value === 'number') {
            return value.toLocaleString();
        }

        // Handle dates
        if (field.toLowerCase().includes('date') || field.toLowerCase().includes('time')) {
            try {
                return new Date(value).toLocaleString();
            } catch {
                return value;
            }
        }

        return value;
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
                                            {formatFieldName(field)}
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
                        {isQueryLoading ? (
                            <Center p={8}>
                                <Spinner size="xl" />
                            </Center>
                        ) : executions && executions.length > 0 ? (
                            <Table variant="simple">
                                <Thead>
                                    <Tr>
                                        {getTableColumns().map((field) => (
                                            <Th key={field}>{formatFieldName(field)}</Th>
                                        ))}
                                        <Th>Actions</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {executions.map((execution: Execution) => (
                                        <Tr key={execution.id}>
                                            {getTableColumns().map((field) => (
                                                <Td key={`${execution.id}-${field}`}>
                                                    {formatValue(field, execution[field])}
                                                </Td>
                                            ))}
                                            <Td>
                                                <HStack spacing={2}>
                                                    <Tooltip label="View Report">
                                                        <Button
                                                            as={Link}
                                                            to={`/executions/${execution.id}`}
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
                        ) : searchParams.length > 0 ? (
                            <Center p={8}>
                                <Text color="gray.500">No results found</Text>
                            </Center>
                        ) : (
                            <Center p={8}>
                                <Text color="gray.500">Add filters and click Search to see results</Text>
                            </Center>
                        )}
                    </VStack>
                </Box>
            </VStack>
        </Box>
    );
};