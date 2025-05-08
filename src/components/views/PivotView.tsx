import { useState, useEffect } from 'react';
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
import { getExecutions, getMetricsList, getGpuList, getPytorchList, getMilabenchList } from '../../services/api';
import { DataTable } from '../common/Table';
import type { Column } from '../common/Table';

interface PivotField {
    field: string;
    type: 'row' | 'column' | 'value' | 'filter';
    operator?: string;
    value?: string;
}

export const PivotView = () => {
    const toast = useToast();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [selectedField, setSelectedField] = useState<PivotField | null>(null);
    const [fields, setFields] = useState<PivotField[]>([
        { field: 'Exec:name', type: 'row' },
        { field: 'Pack:name', type: 'row' },
        { field: 'Metric:name', type: 'column' },
        { field: 'Metric:value', type: 'value' },
    ]);

    const { data: executions } = useQuery({
        queryKey: ['executions'],
        queryFn: getExecutions,
    });

    const { data: metrics } = useQuery({
        queryKey: ['metrics'],
        queryFn: getMetricsList,
    });

    const { data: gpus } = useQuery({
        queryKey: ['gpus'],
        queryFn: getGpuList,
    });

    const { data: pytorchVersions } = useQuery({
        queryKey: ['pytorch'],
        queryFn: getPytorchList,
    });

    const { data: milabenchVersions } = useQuery({
        queryKey: ['milabench'],
        queryFn: getMilabenchList,
    });

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
        setFields(fields.filter((_, i) => i !== index));
    };

    const generatePivot = () => {
        // TODO: Implement pivot generation
        toast({
            title: 'Pivot Generation',
            description: 'This feature is coming soon!',
            status: 'info',
            duration: 3000,
        });
    };

    const resetPivot = () => {
        setFields([
            { field: 'Exec:name', type: 'row' },
            { field: 'Pack:name', type: 'row' },
            { field: 'Metric:name', type: 'column' },
            { field: 'Metric:value', type: 'value' },
        ]);
    };

    return (
        <Box p={4}>
            <Heading mb={6}>Pivot View</Heading>
            <Grid templateColumns="300px 1fr" gap={6}>
                {/* Fields Panel */}
                <GridItem>
                    <VStack align="stretch" spacing={4}>
                        <Heading size="md">Available Fields</Heading>
                        <VStack align="stretch" spacing={2}>
                            {metrics?.map((metric) => (
                                <Box
                                    key={metric}
                                    p={2}
                                    bg="white"
                                    borderWidth={1}
                                    borderRadius="md"
                                    cursor="move"
                                    _hover={{ bg: 'gray.50' }}
                                    draggable
                                    onDragStart={(e) => e.dataTransfer.setData('text/plain', metric)}
                                >
                                    {metric}
                                </Box>
                            ))}
                        </VStack>
                    </VStack>
                </GridItem>

                {/* Pivot Builder */}
                <GridItem>
                    <VStack align="stretch" spacing={6}>
                        <Grid templateColumns="repeat(4, 1fr)" gap={4}>
                            {/* Rows */}
                            <GridItem>
                                <VStack align="stretch" spacing={2}>
                                    <Heading size="sm">Rows</Heading>
                                    <Box
                                        p={4}
                                        borderWidth={2}
                                        borderStyle="dashed"
                                        borderRadius="md"
                                        minH="200px"
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            const field = e.dataTransfer.getData('text/plain');
                                            handleFieldDrop('row', field);
                                        }}
                                    >
                                        {fields
                                            .filter((f) => f.type === 'row')
                                            .map((field, index) => (
                                                <Badge
                                                    key={index}
                                                    m={1}
                                                    p={2}
                                                    cursor="pointer"
                                                    onClick={() => removeField(index)}
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
                                        p={4}
                                        borderWidth={2}
                                        borderStyle="dashed"
                                        borderRadius="md"
                                        minH="200px"
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            const field = e.dataTransfer.getData('text/plain');
                                            handleFieldDrop('column', field);
                                        }}
                                    >
                                        {fields
                                            .filter((f) => f.type === 'column')
                                            .map((field, index) => (
                                                <Badge
                                                    key={index}
                                                    m={1}
                                                    p={2}
                                                    cursor="pointer"
                                                    onClick={() => removeField(index)}
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
                                        p={4}
                                        borderWidth={2}
                                        borderStyle="dashed"
                                        borderRadius="md"
                                        minH="200px"
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            const field = e.dataTransfer.getData('text/plain');
                                            handleFieldDrop('value', field);
                                        }}
                                    >
                                        {fields
                                            .filter((f) => f.type === 'value')
                                            .map((field, index) => (
                                                <Badge
                                                    key={index}
                                                    m={1}
                                                    p={2}
                                                    cursor="pointer"
                                                    onClick={() => removeField(index)}
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
                                        p={4}
                                        borderWidth={2}
                                        borderStyle="dashed"
                                        borderRadius="md"
                                        minH="200px"
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            const field = e.dataTransfer.getData('text/plain');
                                            handleFieldDrop('filter', field);
                                        }}
                                    >
                                        {fields
                                            .filter((f) => f.type === 'filter')
                                            .map((field, index) => (
                                                <Badge
                                                    key={index}
                                                    m={1}
                                                    p={2}
                                                    cursor="pointer"
                                                    onClick={() => removeField(index)}
                                                >
                                                    {field.field} {field.operator} {field.value} ×
                                                </Badge>
                                            ))}
                                    </Box>
                                </VStack>
                            </GridItem>
                        </Grid>

                        <HStack spacing={4}>
                            <Button colorScheme="blue" onClick={generatePivot}>
                                Generate Pivot
                            </Button>
                            <Button onClick={resetPivot}>Reset</Button>
                        </HStack>
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