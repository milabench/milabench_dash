import { useState, useEffect } from 'react';
import {
    Box,
    Button,
    useToast,
    HStack,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Text,
    Spinner,
    Alert,
    AlertIcon,
    TableContainer
} from '@chakra-ui/react';
import axios from 'axios';

interface PivotField {
    field: string;
    type: 'row' | 'column' | 'value' | 'filter';
    operator?: string;
    value?: string;
    aggregators?: string[];  // For value fields - multiple aggregators
}

interface PivotTableViewProps {
    fields: PivotField[];
    isRelativePivot: boolean;
    onFieldsChange: (fields: PivotField[]) => void;
}

export const PivotTableView = ({ fields, isRelativePivot, onFieldsChange }: PivotTableViewProps) => {
    const toast = useToast();
    const [pivotData, setPivotData] = useState<any[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generatePivotFromFields = async (fieldsToUse: PivotField[]) => {
        try {
            setIsGenerating(true);
            setError(null);

            const params = new URLSearchParams();

            const rows = fieldsToUse.filter(f => f.type === 'row').map(f => f.field);
            const cols = fieldsToUse.filter(f => f.type === 'column').map(f => f.field);

            // Handle values with aggregator functions
            const valueFields = fieldsToUse.filter(f => f.type === 'value');
            const valuesMap: { [key: string]: string[] } = {};

            valueFields.forEach(field => {
                const aggregators = field.aggregators || ['avg'];
                if (!valuesMap[field.field]) {
                    valuesMap[field.field] = [];
                }
                valuesMap[field.field].push(...aggregators);
            });

            params.append('rows', rows.join(','));
            params.append('cols', cols.join(','));
            params.append('values', btoa(JSON.stringify(valuesMap)));

            const filters = fieldsToUse.filter(f => f.type === 'filter').map(f => ({
                field: f.field,
                operator: f.operator,
                value: f.value
            }));

            if (filters.length > 0) {
                params.append('filters', btoa(JSON.stringify(filters)));
            }

            const response = await axios.get(`/api/pivot?${params.toString()}`);

            if (Array.isArray(response.data)) {
                setPivotData(response.data);
            } else {
                setPivotData([]);
                setError('Invalid data format received from server');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            setError(errorMessage);
            toast({
                title: 'Error generating pivot',
                description: errorMessage,
                status: 'error',
                duration: 5000,
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const generatePivot = async () => {
        await generatePivotFromFields(fields);
    };

    // Auto-generate when fields change
    useEffect(() => {
        if (fields.length > 0) {
            generatePivotFromFields(fields);
        }
    }, [fields, isRelativePivot]);

    // Process data for relative pivot
    const processedData = isRelativePivot && pivotData.length > 0 ?
        pivotData.map((row, index) => {
            if (index === 0) return row; // Keep header row as is

            const processedRow = { ...row };
            // Find the first numeric column as baseline
            const firstNumericKey = Object.keys(row).find(key =>
                key !== Object.keys(row)[0] && typeof row[key] === 'number'
            );

            if (firstNumericKey) {
                const baseline = row[firstNumericKey];
                Object.keys(row).forEach(key => {
                    if (typeof row[key] === 'number' && key !== Object.keys(row)[0]) {
                        processedRow[key] = baseline !== 0 ? row[key] / baseline : 0;
                    }
                });
            }

            return processedRow;
        }) : pivotData;

    // Get column names from the first row
    const columnNames = pivotData.length > 0 ? Object.keys(pivotData[0]) : [];

    // Sort column names so row columns appear first in the order specified in fields
    const sortedColumnNames = (() => {
        if (columnNames.length === 0) return [];

        // Get row fields in the order they appear in the fields array
        const rowFields = fields.filter(f => f.type === 'row').map(f => f.field);

        // Find columns that match row fields (accounting for potential transformations)
        const rowColumns: string[] = [];
        const otherColumns: string[] = [];

        columnNames.forEach(colName => {
            // Check if this column corresponds to a row field
            // Account for : being replaced with _ in column names
            const matchingRowField = rowFields.find(rowField => {
                const transformedRowField = rowField.replace(/:/g, '_');
                return colName === transformedRowField ||
                    colName === rowField ||
                    colName.includes(transformedRowField) ||
                    transformedRowField.includes(colName);
            });

            if (matchingRowField) {
                rowColumns.push(colName);
            } else {
                otherColumns.push(colName);
            }
        });

        // Sort row columns based on their order in the fields array
        rowColumns.sort((a, b) => {
            const aIndex = rowFields.findIndex(field => {
                const transformedField = field.replace(/:/g, '_');
                return a === transformedField ||
                    a === field ||
                    a.includes(transformedField) ||
                    transformedField.includes(a);
            });
            const bIndex = rowFields.findIndex(field => {
                const transformedField = field.replace(/:/g, '_');
                return b === transformedField ||
                    b === field ||
                    b.includes(transformedField) ||
                    transformedField.includes(b);
            });
            return aIndex - bIndex;
        });

        return [...rowColumns, ...otherColumns];
    })();

    const formatValue = (value: any) => {
        if (typeof value === 'number') {
            if (isRelativePivot) {
                return value.toFixed(2);
            }
            return value.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }
        return value;
    };

    const getCellStyle = (value: any) => {
        if (isRelativePivot && typeof value === 'number') {
            const intensity = Math.min(Math.abs(value - 1), 0.5) * 2;
            if (value > 1) {
                return { backgroundColor: `rgba(0, 255, 0, ${intensity * 0.3})` };
            } else if (value < 1) {
                return { backgroundColor: `rgba(255, 0, 0, ${intensity * 0.3})` };
            }
        }
        return {};
    };

    if (error) {
        return (
            <Box h="100%" display="flex" flexDirection="column">
                <HStack mb={4}>
                    <Button
                        colorScheme="blue"
                        onClick={generatePivot}
                        isLoading={isGenerating}
                    >
                        Generate Pivot
                    </Button>
                </HStack>
                <Alert status="error">
                    <AlertIcon />
                    {error}
                </Alert>
            </Box>
        );
    }

    return (
        <Box>
            {isGenerating && (
                <Box display="flex" justifyContent="center" alignItems="center" h="200px">
                    <Spinner size="xl" />
                </Box>
            )}

            {processedData.length > 0 && !isGenerating && (
                <Box
                    borderWidth={1}
                    borderRadius="md"
                    overflow="auto"
                    minH="400px"
                    height="100%"
                    width="100%"
                >
                    <TableContainer>
                        <Table variant="striped" size="sm" width="auto" height="100%">
                            <Thead>
                                <Tr>
                                    {sortedColumnNames.map((columnName, index) => (
                                        <Th
                                            key={index}
                                            fontSize="xs"
                                            px={2}
                                            py={2}
                                        >
                                            {columnName}
                                        </Th>
                                    ))}
                                </Tr>
                            </Thead>
                            <Tbody>
                                {processedData.map((row, rowIndex) => (
                                    <Tr key={rowIndex}>
                                        {sortedColumnNames.map((columnName, colIndex) => (
                                            <Td
                                                key={colIndex}
                                                fontSize="sm"
                                                style={getCellStyle(row[columnName])}
                                                fontWeight={colIndex === 0 ? 'semibold' : 'normal'}
                                            >
                                                {formatValue(row[columnName])}
                                            </Td>
                                        ))}
                                    </Tr>
                                ))}
                            </Tbody>
                        </Table>
                    </TableContainer>
                </Box>
            )}

            {processedData.length === 0 && !isGenerating && !error && (
                <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    h="200px"
                    color="gray.500"
                >
                    <Text>No data available. Configure your pivot and click "Generate Pivot".</Text>
                </Box>
            )}
        </Box>
    );
};