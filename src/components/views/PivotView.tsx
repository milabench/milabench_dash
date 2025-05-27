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
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';

interface PivotField {
    field: string;
    type: 'row' | 'column' | 'value' | 'filter';
    operator?: string;
    value?: string;
}

export const PivotView = () => {
    const toast = useToast();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedField, setSelectedField] = useState<PivotField | null>(null);
    const [isRelativePivot, setIsRelativePivot] = useState(false);
    const [fields, setFields] = useState<PivotField[]>([
        { field: 'Exec:name', type: 'row' },
        { field: 'Pack:name', type: 'row' },
        { field: 'Metric:name', type: 'column' },
        { field: 'Metric:value', type: 'value' },
    ]);
    const [pivotHtml, setPivotHtml] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const dropZonesRef = useRef<{ [key: string]: HTMLDivElement | null }>({});

    // Fetch available fields from /api/keys
    const { data: availableFields } = useQuery({
        queryKey: ['pivotFields'],
        queryFn: async () => {
            const response = await axios.get('/api/keys');
            return response.data;
        },
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
                values.split(',').forEach(field => {
                    newFields.push({ field, type: 'value' });
                });
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
                generatePivotFromFields(newFields);
            }
        }
    }, []);

    // Add effect to regenerate pivot when view type changes
    useEffect(() => {
        if (fields.length > 0) {
            generatePivotFromFields(fields);
        }
    }, [isRelativePivot]);

    const handleFieldDrop = (type: 'row' | 'column' | 'value' | 'filter', field: string) => {
        if (type === 'filter') {
            setSelectedField({ field, type });
            onOpen();
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

    const removeField = (index: number) => {
        const newFields = [...fields];
        newFields.splice(index, 1);
        setFields(newFields);
    };

    const generatePivotFromFields = async (fieldsToUse: PivotField[]) => {
        try {
            setIsGenerating(true);

            const params = new URLSearchParams();

            const rows = fieldsToUse.filter(f => f.type === 'row').map(f => f.field);
            const cols = fieldsToUse.filter(f => f.type === 'column').map(f => f.field);
            const values = fieldsToUse.filter(f => f.type === 'value').map(f => f.field);

            params.append('rows', rows.join(','));
            params.append('cols', cols.join(','));
            params.append('values', values.join(','));

            const filters = fieldsToUse.filter(f => f.type === 'filter').map(f => ({
                field: f.field,
                operator: f.operator,
                value: f.value
            }));

            if (filters.length > 0) {
                params.append('filters', btoa(JSON.stringify(filters)));
            }

            const endpoint = isRelativePivot ? '/html/relative/pivot' : '/html/pivot';
            const response = await axios.get(`${endpoint}?${params.toString()}`);
            setPivotHtml(response.data);
        } catch (error) {
            toast({
                title: 'Error generating pivot',
                description: error instanceof Error ? error.message : 'Unknown error',
                status: 'error',
                duration: 5000,
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const generatePivot = async () => {
        const params = new URLSearchParams();

        const rows = fields.filter(f => f.type === 'row').map(f => f.field);
        const cols = fields.filter(f => f.type === 'column').map(f => f.field);
        const values = fields.filter(f => f.type === 'value').map(f => f.field);

        params.append('rows', rows.join(','));
        params.append('cols', cols.join(','));
        params.append('values', values.join(','));

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

        await generatePivotFromFields(fields);
    };

    const resetPivot = () => {
        setFields([
            { field: 'Exec:name', type: 'row' },
            { field: 'Pack:name', type: 'row' },
            { field: 'Metric:name', type: 'column' },
            { field: 'Metric:value', type: 'value' },
        ]);
        setPivotHtml('');
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

    return (
        <Box p={4} h="100vh" display="flex" flexDirection="column">
            <Heading mb={6}>Pivot View</Heading>
            <Grid templateColumns="360px 1fr" gap={6} flex="1" minH="0">
                {/* Fields Panel */}
                <GridItem>
                    <VStack align="stretch" spacing={4}>
                        <Heading size="md">Available Fields</Heading>
                        <Box
                            h="calc(100vh - 200px)"
                            overflowY="auto"
                            css={{
                                '&::-webkit-scrollbar': {
                                    width: '4px',
                                },
                                '&::-webkit-scrollbar-track': {
                                    width: '6px',
                                },
                                '&::-webkit-scrollbar-thumb': {
                                    background: 'gray.300',
                                    borderRadius: '24px',
                                },
                            }}
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
                                    >
                                        {field}
                                    </Box>
                                ))}
                            </VStack>
                        </Box>
                    </VStack>
                </GridItem>

                {/* Pivot Builder */}
                <GridItem>
                    <VStack align="stretch" spacing={6} h="100%">
                        <Grid templateColumns="repeat(4, 1fr)" gap={4}>
                            {/* Rows */}
                            <GridItem>
                                <VStack align="stretch" spacing={2}>
                                    <Heading size="sm">Rows</Heading>
                                    <Box
                                        ref={el => dropZonesRef.current['row'] = el}
                                        p={4}
                                        borderWidth={2}
                                        borderStyle="dashed"
                                        borderRadius="md"
                                        minH="200px"
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
                            </GridItem>

                            {/* Columns */}
                            <GridItem>
                                <VStack align="stretch" spacing={2}>
                                    <Heading size="sm">Columns</Heading>
                                    <Box
                                        ref={el => dropZonesRef.current['column'] = el}
                                        p={4}
                                        borderWidth={2}
                                        borderStyle="dashed"
                                        borderRadius="md"
                                        minH="200px"
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
                            </GridItem>

                            {/* Values */}
                            <GridItem>
                                <VStack align="stretch" spacing={2}>
                                    <Heading size="sm">Values</Heading>
                                    <Box
                                        ref={el => dropZonesRef.current['value'] = el}
                                        p={4}
                                        borderWidth={2}
                                        borderStyle="dashed"
                                        borderRadius="md"
                                        minH="200px"
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, 'value')}
                                    >
                                        {fields
                                            .filter((f) => f.type === 'value')
                                            .map((field, index) => (
                                                <Badge
                                                    key={`value-${index}`}
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
                            </GridItem>

                            {/* Filters */}
                            <GridItem>
                                <VStack align="stretch" spacing={2}>
                                    <Heading size="sm">Filters</Heading>
                                    <Box
                                        ref={el => dropZonesRef.current['filter'] = el}
                                        p={4}
                                        borderWidth={2}
                                        borderStyle="dashed"
                                        borderRadius="md"
                                        minH="200px"
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, 'filter')}
                                    >
                                        {fields
                                            .filter((f) => f.type === 'filter')
                                            .map((field, index) => (
                                                <Badge
                                                    key={`filter-${index}`}
                                                    m={1}
                                                    p={2}
                                                    cursor="pointer"
                                                    onClick={() => removeField(fields.findIndex(f => f === field))}
                                                >
                                                    {field.field} {field.operator} {field.value} ×
                                                </Badge>
                                            ))}
                                    </Box>
                                </VStack>
                            </GridItem>
                        </Grid>

                        <HStack spacing={4}>
                            <Button
                                colorScheme="blue"
                                onClick={generatePivot}
                                isLoading={isGenerating}
                            >
                                Generate Pivot
                            </Button>
                            <Button onClick={resetPivot}>Reset</Button>
                            <Button
                                colorScheme={isRelativePivot ? "green" : "gray"}
                                onClick={() => {
                                    setIsRelativePivot(!isRelativePivot);
                                }}
                            >
                                {!isRelativePivot ? "Relative View" : "Normal View"}
                            </Button>
                        </HStack>

                        {pivotHtml && (
                            <Box
                                flex="1"
                                borderWidth={1}
                                borderRadius="md"
                                overflow="auto"
                                p={4}
                            >
                                <iframe
                                    srcDoc={pivotHtml}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                    }}
                                    sandbox="allow-same-origin"
                                />
                            </Box>
                        )}
                    </VStack>
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
        </Box>
    );
};