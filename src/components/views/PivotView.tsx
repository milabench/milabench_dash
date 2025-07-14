import { useState, useEffect, useRef } from 'react';
import {
    Box,
    Grid,
    GridItem,
    Heading,
    Button,
    VStack,
    HStack,
    Text,
    Badge,
    useToast,
    Select,
    Input,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    useDisclosure,
    FormControl,
    FormLabel,
    ButtonGroup,
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { saveQuery, getAllSavedQueries } from '../../services/api';
import { AddIcon } from '@chakra-ui/icons';
import { PivotIframeView } from './PivotIframeView';
import { PivotTableView } from './PivotTableView';

interface PivotField {
    field: string;
    type: 'row' | 'column' | 'value' | 'filter';
    operator?: string;
    value?: string;
    aggregators?: string[];  // For value fields - multiple aggregators
}

// Add these interfaces for the edit modals
interface EditableValue {
    field: string;
    aggregators: string[];
}

interface EditableFilter {
    field: string;
    operator: string;
    value: string;
}

export const PivotView = () => {
    const toast = useToast();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedField, setSelectedField] = useState<PivotField | null>(null);
    const [isRelativePivot, setIsRelativePivot] = useState(false);
    const [viewMode, setViewMode] = useState<'iframe' | 'table'>('iframe');
    const [fields, setFields] = useState<PivotField[]>([
        { field: 'Exec:name', type: 'row' },
        { field: 'Pack:name', type: 'row' },
        { field: 'Metric:name', type: 'column' },
        { field: 'Metric:value', type: 'value', aggregators: ['avg'] },
    ]);
    const dropZonesRef = useRef<{ [key: string]: HTMLDivElement | null }>({});

    // Save/Load modal state
    const { isOpen: isSaveModalOpen, onOpen: onSaveModalOpen, onClose: onSaveModalClose } = useDisclosure();
    const { isOpen: isLoadModalOpen, onOpen: onLoadModalOpen, onClose: onLoadModalClose } = useDisclosure();
    const [saveQueryName, setSaveQueryName] = useState<string>('');

    // Edit modals state
    const { isOpen: isEditValueOpen, onOpen: onEditValueOpen, onClose: onEditValueClose } = useDisclosure();
    const { isOpen: isEditFilterOpen, onOpen: onEditFilterOpen, onClose: onEditFilterClose } = useDisclosure();
    const [editingValueIndex, setEditingValueIndex] = useState<number>(-1);
    const [editingFilterIndex, setEditingFilterIndex] = useState<number>(-1);
    const [editableValue, setEditableValue] = useState<EditableValue>({ field: '', aggregators: ['avg'] });
    const [editableFilter, setEditableFilter] = useState<EditableFilter>({ field: '', operator: '==', value: '' });

    // Available aggregator functions
    const aggregatorOptions = [
        { value: 'avg', label: 'Average' },
        { value: 'sum', label: 'Sum' },
        { value: 'count', label: 'Count' },
        { value: 'min', label: 'Minimum' },
        { value: 'max', label: 'Maximum' },
        { value: 'std', label: 'Standard Deviation' },
        { value: 'var', label: 'Variance' },
        { value: 'median', label: 'Median' },
    ];

    // Fetch available fields from /api/keys
    const { data: availableFields } = useQuery({
        queryKey: ['pivotFields'],
        queryFn: async () => {
            const response = await axios.get('/api/keys');
            return response.data;
        },
    });

    // Fetch saved queries for load functionality
    const { data: savedQueries } = useQuery({
        queryKey: ['savedQueries'],
        queryFn: getAllSavedQueries,
    });

    // Load configuration from URL on mount
    useEffect(() => {
        const rows = searchParams.get('rows');
        const cols = searchParams.get('cols');
        const values = searchParams.get('values');
        const filters = searchParams.get('filters');

        if (rows || cols || values || filters) {
            const newFields: PivotField[] = [];

            if (rows) {
                rows.split(',').forEach(field => {
                    newFields.push({ field, type: 'row' });
                });
            }

            if (cols) {
                cols.split(',').forEach(field => {
                    newFields.push({ field, type: 'column' });
                });
            }

            if (values) {
                try {
                    const decodedValues = JSON.parse(atob(values));
                    if (Array.isArray(decodedValues)) {
                        decodedValues.forEach((value: any) => {
                            if (value.field) {
                                newFields.push({
                                    field: value.field,
                                    type: 'value',
                                    aggregators: value.aggregators || ['avg']
                                });
                            }
                        });
                    }
                } catch (error) {
                    // Fallback to old format (comma-separated string)
                    values.split(',').forEach(field => {
                        if (field.trim()) {
                            newFields.push({
                                field: field.trim(),
                                type: 'value',
                                aggregators: ['avg']
                            });
                        }
                    });
                }
            }

            if (filters) {
                try {
                    const decodedFilters = JSON.parse(atob(filters));
                    decodedFilters.forEach((filter: any) => {
                        newFields.push({
                            field: filter.field,
                            type: 'filter',
                            operator: filter.operator,
                            value: filter.value
                        });
                    });
                } catch (error) {
                    console.error('Error parsing filters from URL:', error);
                }
            }

            if (newFields.length > 0) {
                setFields(newFields);
            }
        }
    }, []);

    const handleFieldDrop = (type: 'row' | 'column' | 'value' | 'filter', field: string) => {
        if (type === 'filter') {
            setSelectedField({ field, type });
            onOpen();
        } else if (type === 'value') {
            // Default aggregator for new value fields
            setFields([...fields, { field, type, aggregators: ['avg'] }]);
        } else {
            setFields([...fields, { field, type }]);
        }
    };

    const handleFilterApply = (operator: string, value: string) => {
        if (selectedField) {
            setFields([...fields, { ...selectedField, operator, value }]);
            onClose();
        }
    };

    const handleEditValue = (index: number) => {
        const field = fields[index];
        setEditingValueIndex(index);
        setEditableValue({
            field: field.field,
            aggregators: field.aggregators || ['avg']
        });
        onEditValueOpen();
    };

    const handleEditFilter = (index: number) => {
        const field = fields[index];
        setEditingFilterIndex(index);
        setEditableFilter({
            field: field.field,
            operator: field.operator || '==',
            value: field.value || ''
        });
        onEditFilterOpen();
    };

    const handleValueSave = () => {
        if (editingValueIndex >= 0) {
            const newFields = [...fields];
            newFields[editingValueIndex] = {
                ...newFields[editingValueIndex],
                aggregators: editableValue.aggregators
            };
            setFields(newFields);
            onEditValueClose();
        }
    };

    const handleFilterSave = () => {
        if (editingFilterIndex >= 0) {
            const newFields = [...fields];
            newFields[editingFilterIndex] = {
                ...newFields[editingFilterIndex],
                operator: editableFilter.operator,
                value: editableFilter.value
            };
            setFields(newFields);
            onEditFilterClose();
        }
    };

    const removeField = (index: number) => {
        const newFields = [...fields];
        newFields.splice(index, 1);
        setFields(newFields);
    };

    const updateURLParams = () => {
        const params = new URLSearchParams();

        const rows = fields.filter(f => f.type === 'row').map(f => f.field);
        const cols = fields.filter(f => f.type === 'column').map(f => f.field);
        const values = fields.filter(f => f.type === 'value').map(f => ({
            field: f.field,
            aggregators: f.aggregators || ['avg']
        }));

        params.append('rows', rows.join(','));
        params.append('cols', cols.join(','));
        params.append('values', btoa(JSON.stringify(values)));

        const filters = fields.filter(f => f.type === 'filter').map(f => ({
            field: f.field,
            operator: f.operator,
            value: f.value
        }));

        if (filters.length > 0) {
            params.append('filters', btoa(JSON.stringify(filters)));
        }

        // Update URL with current configuration
        setSearchParams(params);
    };

    const resetPivot = () => {
        setFields([
            { field: 'Exec:name', type: 'row' },
            { field: 'Pack:name', type: 'row' },
            { field: 'Metric:name', type: 'column' },
            { field: 'Metric:value', type: 'value', aggregators: ['avg'] },
        ]);
        setSearchParams(new URLSearchParams());
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        const target = e.currentTarget as HTMLDivElement;
        target.style.backgroundColor = 'var(--chakra-colors-blue-50)';
        target.style.borderColor = 'var(--chakra-colors-blue-400)';
        target.style.transform = 'scale(1.02)';
        target.style.transition = 'all 0.2s';
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        const target = e.currentTarget as HTMLDivElement;
        target.style.backgroundColor = '';
        target.style.borderColor = '';
        target.style.transform = '';
    };

    const handleDrop = (e: React.DragEvent, type: 'row' | 'column' | 'value' | 'filter') => {
        e.preventDefault();
        const target = e.currentTarget as HTMLDivElement;
        target.style.backgroundColor = '';
        target.style.borderColor = '';
        target.style.transform = '';
        const field = e.dataTransfer.getData('text/plain');
        handleFieldDrop(type, field);
    };

    const handleSaveQuery = async () => {
        if (!saveQueryName.trim()) {
            toast({
                title: 'Query name required',
                description: 'Please enter a name for your saved query',
                status: 'warning',
                duration: 3000,
            });
            return;
        }

        try {
            // Create the query object with current pivot configuration
            const queryData = {
                url: '/pivot',
                parameters: {
                    rows: fields.filter(f => f.type === 'row').map(f => f.field).join(','),
                    cols: fields.filter(f => f.type === 'column').map(f => f.field).join(','),
                    values: btoa(JSON.stringify(fields.filter(f => f.type === 'value').map(f => ({
                        field: f.field,
                        aggregators: f.aggregators || ['avg']
                    })))),
                    filters: fields.filter(f => f.type === 'filter').length > 0 ?
                        btoa(JSON.stringify(fields.filter(f => f.type === 'filter').map(f => ({
                            field: f.field,
                            operator: f.operator,
                            value: f.value
                        })))) : '',
                    isRelativePivot: isRelativePivot,
                    timestamp: new Date().toISOString()
                }
            };

            await saveQuery(saveQueryName, queryData);

            toast({
                title: 'Query saved successfully',
                description: `Your query "${saveQueryName}" has been saved`,
                status: 'success',
                duration: 3000,
            });

            onSaveModalClose();
            setSaveQueryName('');
        } catch (error) {
            toast({
                title: 'Error saving query',
                description: error instanceof Error ? error.message : 'Failed to save query',
                status: 'error',
                duration: 5000,
            });
        }
    };

    const handleLoadQuery = (query: any) => {
        const { url, parameters } = query.query;

        if (url === '/pivot') {
            // Load pivot-specific parameters
            const newFields: PivotField[] = [];

            // Load rows
            if (parameters.rows) {
                parameters.rows.split(',').forEach((field: string) => {
                    if (field.trim()) {
                        newFields.push({ field: field.trim(), type: 'row' });
                    }
                });
            }

            // Load columns
            if (parameters.cols) {
                parameters.cols.split(',').forEach((field: string) => {
                    if (field.trim()) {
                        newFields.push({ field: field.trim(), type: 'column' });
                    }
                });
            }

            // Load values
            if (parameters.values) {
                try {
                    const decodedValues = JSON.parse(atob(parameters.values));
                    if (Array.isArray(decodedValues)) {
                        decodedValues.forEach((value: any) => {
                            if (value.field) {
                                newFields.push({
                                    field: value.field,
                                    type: 'value',
                                    aggregators: value.aggregators || ['avg']
                                });
                            }
                        });
                    }
                } catch (error) {
                    // Fallback to old format (comma-separated string)
                    parameters.values.split(',').forEach((field: string) => {
                        if (field.trim()) {
                            newFields.push({
                                field: field.trim(),
                                type: 'value',
                                aggregators: ['avg']
                            });
                        }
                    });
                }
            }

            // Load filters
            if (parameters.filters) {
                try {
                    const decodedFilters = JSON.parse(atob(parameters.filters));
                    decodedFilters.forEach((filter: any) => {
                        newFields.push({
                            field: filter.field,
                            type: 'filter',
                            operator: filter.operator,
                            value: filter.value
                        });
                    });
                } catch (error) {
                    console.error('Error parsing filters from saved query:', error);
                }
            }

            // Set fields and view type
            setFields(newFields);
            if (parameters.isRelativePivot !== undefined) {
                setIsRelativePivot(parameters.isRelativePivot);
            }

            // Fields are automatically used by child components

            toast({
                title: 'Query loaded',
                description: `"${query.name}" has been loaded successfully`,
                status: 'success',
                duration: 3000,
            });
        } else {
            // Navigate to different view
            const params = new URLSearchParams();
            Object.entries(parameters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    params.set(key, String(value));
                }
            });

            const fullUrl = params.toString() ? `${url}?${params.toString()}` : url;
            window.location.href = fullUrl;
        }

        onLoadModalClose();
    };

    return (
        <Box p={4} h="100vh" display="flex" flexDirection="column">
            <HStack justify="space-between" mb={6}>
                <Heading>Pivot View</Heading>
                <HStack spacing={4}>
                    <Button
                        colorScheme="green"
                        onClick={onSaveModalOpen}
                        leftIcon={<AddIcon />}
                    >
                        Save Query
                    </Button>
                    <Button
                        colorScheme="blue"
                        onClick={onLoadModalOpen}
                    >
                        Load Query
                    </Button>
                </HStack>
            </HStack>

            <Grid templateColumns="360px 1fr" gap={6} templateRows="200px 50px auto" flex="1" minH="0" className="pivot-view-grid" width="99%">
                {/* Fields Panel */}
                <GridItem rowSpan={3} colSpan={1} className="pivot-fields">
                    <VStack align="stretch" spacing={4}>
                        <Heading size="md">Available Fields</Heading>
                        <Box
                            h="calc(100vh - 170px)"
                            overflowY="auto"
                        >
                            <VStack align="stretch" spacing={2}>
                                {availableFields?.map((field: string) => (
                                    <Box
                                        key={field}
                                        p={2}
                                        bg="white"
                                        borderWidth={1}
                                        borderRadius="md"
                                        cursor="move"
                                        _hover={{ bg: 'gray.50' }}
                                        draggable
                                        onDragStart={(e) => e.dataTransfer.setData('text/plain', field)}
                                        overflowX="hidden"
                                        textOverflow="ellipsis"
                                        whiteSpace="nowrap"
                                    >
                                        {field}
                                    </Box>
                                ))}
                            </VStack>
                        </Box>
                    </VStack>
                </GridItem>

                <GridItem colStart={2} rowSpan={1} className="pivot-builder">
                    <HStack align="stretch" spacing={4}>
                        {/* Rows */}
                        <VStack align="stretch" flex="1" spacing={2}>
                            <Heading size="sm">Rows</Heading>
                            <Box
                                ref={el => dropZonesRef.current['row'] = el}
                                p={4}
                                borderWidth={2}
                                borderStyle="dashed"
                                borderRadius="md"
                                minH="150px"
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, 'row')}
                            >
                                {fields
                                    .filter((f) => f.type === 'row')
                                    .map((field, index) => (
                                        <Badge
                                            key={`row-${index}`}
                                            m={1}
                                            p={2}
                                            cursor="pointer"
                                            onClick={() => removeField(fields.findIndex(f => f === field))}
                                        >
                                            {field.field} ×
                                        </Badge>
                                    ))}
                            </Box>
                        </VStack>

                        {/* Columns */}
                        <VStack align="stretch" flex="1" spacing={2}>
                            <Heading size="sm">Columns</Heading>
                            <Box
                                ref={el => dropZonesRef.current['column'] = el}
                                p={4}
                                borderWidth={2}
                                borderStyle="dashed"
                                borderRadius="md"
                                minH="150px"
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, 'column')}
                            >
                                {fields
                                    .filter((f) => f.type === 'column')
                                    .map((field, index) => (
                                        <Badge
                                            key={`column-${index}`}
                                            m={1}
                                            p={2}
                                            cursor="pointer"
                                            onClick={() => removeField(fields.findIndex(f => f === field))}
                                        >
                                            {field.field} ×
                                        </Badge>
                                    ))}
                            </Box>
                        </VStack>

                        <VStack align="stretch" flex="1" spacing={2}>
                            <Heading size="sm">Values</Heading>
                            <Box
                                ref={el => dropZonesRef.current['value'] = el}
                                p={4}
                                borderWidth={2}
                                borderStyle="dashed"
                                borderRadius="md"
                                minH="150px"
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, 'value')}
                            >
                                {fields
                                    .filter((f) => f.type === 'value')
                                    .map((field, index) => {
                                        const fieldIndex = fields.findIndex(f => f === field);
                                        return (
                                            <VStack key={`value-${index}`} align="stretch" spacing={1} m={1}>
                                                <HStack spacing={1}>
                                                    <Badge
                                                        colorScheme="blue"
                                                        cursor="pointer"
                                                        onClick={() => handleEditValue(fieldIndex)}
                                                        _hover={{ bg: 'blue.200' }}
                                                        px={2}
                                                        py={1}
                                                    >
                                                        Edit {field.field}
                                                    </Badge>
                                                    <Badge
                                                        colorScheme="red"
                                                        cursor="pointer"
                                                        onClick={() => removeField(fieldIndex)}
                                                        _hover={{ bg: 'red.200' }}
                                                    >
                                                        ×
                                                    </Badge>
                                                </HStack>
                                                <HStack spacing={1} flexWrap="wrap">
                                                    {(field.aggregators || ['avg']).map((aggregator, aggIndex) => (
                                                        <Badge
                                                            key={`${field.field}-${aggregator}-${aggIndex}`}
                                                            colorScheme="purple"
                                                            variant="outline"
                                                            fontSize="xs"
                                                        >
                                                            {aggregator.toUpperCase()}({field.field})
                                                        </Badge>
                                                    ))}
                                                </HStack>
                                            </VStack>
                                        );
                                    })}
                            </Box>
                        </VStack>

                        <VStack align="stretch" flex="1" spacing={2}>
                            <Heading size="sm">Filters</Heading>
                            <Box
                                ref={el => dropZonesRef.current['filter'] = el}
                                p={4}
                                borderWidth={2}
                                borderStyle="dashed"
                                borderRadius="md"
                                minH="150px"
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, 'filter')}
                            >
                                {fields
                                    .filter((f) => f.type === 'filter')
                                    .map((field, index) => {
                                        const fieldIndex = fields.findIndex(f => f === field);
                                        return (
                                            <HStack key={`filter-${index}`} m={1}>
                                                <Badge
                                                    colorScheme="purple"
                                                    cursor="pointer"
                                                    onClick={() => handleEditFilter(fieldIndex)}
                                                    _hover={{ bg: 'purple.200' }}
                                                >
                                                    {field.field} {field.operator} {field.value}
                                                </Badge>
                                                <Badge
                                                    colorScheme="red"
                                                    cursor="pointer"
                                                    onClick={() => removeField(fieldIndex)}
                                                    _hover={{ bg: 'red.200' }}
                                                >
                                                    ×
                                                </Badge>
                                            </HStack>
                                        );
                                    })}
                            </Box>
                        </VStack>
                    </HStack>
                </GridItem>

                <GridItem colStart={2} rowSpan={1} className="pivot-options">
                    <HStack spacing={4} align="stretch" flex="1">
                        <ButtonGroup size="sm" isAttached variant="outline">
                            <Button
                                colorScheme={viewMode === 'iframe' ? 'blue' : 'gray'}
                                onClick={() => setViewMode('iframe')}
                            >
                                Iframe View
                            </Button>
                            <Button
                                colorScheme={viewMode === 'table' ? 'blue' : 'gray'}
                                onClick={() => setViewMode('table')}
                            >
                                Table View
                            </Button>
                        </ButtonGroup>
                        <Button onClick={resetPivot}>Reset</Button>
                        <Button
                            colorScheme={isRelativePivot ? "green" : "gray"}
                            onClick={() => {
                                setIsRelativePivot(!isRelativePivot);
                            }}
                        >
                            {!isRelativePivot ? "Relative View" : "Normal View"}
                        </Button>
                        <Button
                            colorScheme="purple"
                            onClick={updateURLParams}
                            size="sm"
                        >
                            Update URL
                        </Button>
                    </HStack>
                </GridItem>

                <GridItem colStart={2} rowSpan={1} className="pivot-result" overflow="auto">
                    {viewMode === 'iframe' ? (
                        <PivotIframeView
                            fields={fields}
                            isRelativePivot={isRelativePivot}
                            onFieldsChange={setFields}
                        />
                    ) : (
                        <PivotTableView
                            fields={fields}
                            isRelativePivot={isRelativePivot}
                            onFieldsChange={setFields}
                        />
                    )}
                </GridItem>
            </Grid>

            {/* Filter Dialog */}
            <Modal isOpen={isOpen} onClose={onClose}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Add Filter</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <VStack spacing={4} pb={4}>
                            <Select
                                placeholder="Select operator"
                                onChange={(e) => setSelectedField({ ...selectedField!, operator: e.target.value })}
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
                                placeholder="Enter filter value"
                                onChange={(e) => setSelectedField({ ...selectedField!, value: e.target.value })}
                            />
                            <Button
                                colorScheme="blue"
                                onClick={() => {
                                    if (selectedField?.operator && selectedField?.value) {
                                        handleFilterApply(selectedField.operator, selectedField.value);
                                    }
                                }}
                            >
                                Apply Filter
                            </Button>
                        </VStack>
                    </ModalBody>
                </ModalContent>
            </Modal>

            {/* Save Query Modal */}
            <Modal isOpen={isSaveModalOpen} onClose={onSaveModalClose}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Save Query</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody pb={6}>
                        <VStack spacing={4}>
                            <FormControl>
                                <FormLabel>Query Name</FormLabel>
                                <Input
                                    value={saveQueryName}
                                    onChange={(e) => setSaveQueryName(e.target.value)}
                                    placeholder="Enter a name for your query"
                                />
                            </FormControl>
                            <HStack spacing={4} width="100%">
                                <Button colorScheme="blue" onClick={handleSaveQuery} width="100%">
                                    Save
                                </Button>
                                <Button onClick={onSaveModalClose} width="100%">
                                    Cancel
                                </Button>
                            </HStack>
                        </VStack>
                    </ModalBody>
                </ModalContent>
            </Modal>

            {/* Load Query Modal */}
            <Modal isOpen={isLoadModalOpen} onClose={onLoadModalClose} size="lg">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Load Saved Query</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody pb={6}>
                        <VStack spacing={4} align="stretch">
                            {savedQueries && savedQueries.length > 0 ? (
                                savedQueries
                                    .filter((query: any) => query.query.url === '/pivot')
                                    .map((query: any) => (
                                        <Box
                                            key={query._id}
                                            p={4}
                                            borderWidth={1}
                                            borderRadius="md"
                                            cursor="pointer"
                                            _hover={{ bg: 'gray.50' }}
                                            onClick={() => handleLoadQuery(query)}
                                        >
                                            <HStack justify="space-between">
                                                <VStack align="start" spacing={1}>
                                                    <Text fontWeight="medium">{query.name}</Text>
                                                    <Text fontSize="sm" color="gray.600">
                                                        Pivot View
                                                    </Text>
                                                    <Text fontSize="sm" color="gray.600">
                                                        Created: {new Date(query.created_time).toLocaleString()}
                                                    </Text>
                                                </VStack>
                                                <Button size="sm" colorScheme="blue">
                                                    Load
                                                </Button>
                                            </HStack>
                                        </Box>
                                    ))
                            ) : (
                                <Text color="gray.500" textAlign="center">
                                    No saved queries found
                                </Text>
                            )}
                            {savedQueries && savedQueries.filter((query: any) => query.query.url === '/pivot').length === 0 && savedQueries.length > 0 && (
                                <Text color="gray.500" textAlign="center">
                                    No saved pivot queries found. Save queries from this view to see them here.
                                </Text>
                            )}
                        </VStack>
                    </ModalBody>
                </ModalContent>
            </Modal>

            {/* Edit Value Modal */}
            <Modal isOpen={isEditValueOpen} onClose={onEditValueClose}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Edit Value Field</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody pb={6}>
                        <VStack spacing={4}>
                            <FormControl>
                                <FormLabel>Field</FormLabel>
                                <Input
                                    value={editableValue.field}
                                    isDisabled
                                    bg="gray.100"
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel>Aggregator Functions</FormLabel>
                                <VStack spacing={2} align="stretch">
                                    {editableValue.aggregators.map((aggregator, index) => (
                                        <HStack key={index} spacing={2}>
                                            <Select
                                                value={aggregator}
                                                onChange={(e) => {
                                                    const newAggregators = [...editableValue.aggregators];
                                                    newAggregators[index] = e.target.value;
                                                    setEditableValue({ ...editableValue, aggregators: newAggregators });
                                                }}
                                                flex="1"
                                            >
                                                {aggregatorOptions.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </Select>
                                            <Button
                                                colorScheme="red"
                                                size="sm"
                                                onClick={() => {
                                                    const newAggregators = [...editableValue.aggregators];
                                                    newAggregators.splice(index, 1);
                                                    setEditableValue({ ...editableValue, aggregators: newAggregators });
                                                }}
                                                disabled={editableValue.aggregators.length === 1}
                                            >
                                                ×
                                            </Button>
                                        </HStack>
                                    ))}
                                    <Button
                                        colorScheme="green"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const newAggregators = [...editableValue.aggregators, 'avg'];
                                            setEditableValue({ ...editableValue, aggregators: newAggregators });
                                        }}
                                    >
                                        + Add Aggregator
                                    </Button>
                                </VStack>
                            </FormControl>
                            <HStack spacing={4} width="100%">
                                <Button colorScheme="blue" onClick={handleValueSave} width="100%">
                                    Save
                                </Button>
                                <Button onClick={onEditValueClose} width="100%">
                                    Cancel
                                </Button>
                            </HStack>
                        </VStack>
                    </ModalBody>
                </ModalContent>
            </Modal>

            {/* Edit Filter Modal */}
            <Modal isOpen={isEditFilterOpen} onClose={onEditFilterClose}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Edit Filter</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody pb={6}>
                        <VStack spacing={4}>
                            <FormControl>
                                <FormLabel>Field</FormLabel>
                                <Input
                                    value={editableFilter.field}
                                    isDisabled
                                    bg="gray.100"
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel>Operator</FormLabel>
                                <Select
                                    value={editableFilter.operator}
                                    onChange={(e) => setEditableFilter({ ...editableFilter, operator: e.target.value })}
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
                            </FormControl>
                            <FormControl>
                                <FormLabel>Value</FormLabel>
                                <Input
                                    value={editableFilter.value}
                                    onChange={(e) => setEditableFilter({ ...editableFilter, value: e.target.value })}
                                    placeholder="Enter filter value"
                                />
                            </FormControl>
                            <HStack spacing={4} width="100%">
                                <Button colorScheme="blue" onClick={handleFilterSave} width="100%">
                                    Save
                                </Button>
                                <Button onClick={onEditFilterClose} width="100%">
                                    Cancel
                                </Button>
                            </HStack>
                        </VStack>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Box>
    );
};