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

    // Get column names from the first row - use backend order
    const columnNames = pivotData.length > 0 ? Object.keys(pivotData[0]) : [];

    // Analyze column structure for multi-level headers
    const columnStructure = (() => {
        if (columnNames.length === 0) return { rowColumns: [], valueColumns: [], headerLevels: [], backendValueStructures: [] };

        // Get row fields in the order they appear in the fields array
        const rowFields = fields.filter(f => f.type === 'row').map(f => f.field);
        const valueFields = fields.filter(f => f.type === 'value');
        const columnFields = fields.filter(f => f.type === 'column');

        // Separate row columns from value columns - maintain backend order
        const rowColumns: string[] = [];
        const valueColumns: string[] = [];

        columnNames.forEach(colName => {
            // Check if this column corresponds to a row field by checking if it doesn't contain '/'
            // Row columns don't have the structured format with '/'
            if (!colName.includes('/')) {
                // Check if this column corresponds to a row field
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
                    // If it doesn't match any row field but has no '/', it's still a row column
                    rowColumns.push(colName);
                }
            } else {
                valueColumns.push(colName);
            }
        });

        // Parse value columns to create multi-level header structure - maintain backend order
        const headerLevels: Array<Array<{ label: string, colspan: number, level: string }>> = [];
        let backendValueStructures: Array<{
            columnName: string;
            columnFields: Array<{ field: string; value: string; originalField: string }>;
            valueField: string;
            aggregator: string;
            fieldName: string;
            originalFieldName: string;
        }> = [];

        if (valueColumns.length > 0) {
            // Parse the new structured column format
            const columnStructures = valueColumns.map(colName => {
                // Parse the structured column name: "Exec__id=42/Metric_name=gpu.memory/Metric_value/avg"
                const parts = colName.split('/');

                // Handle case where there might be only value field and aggregator
                let columnFieldParts: string[] = [];
                let valueField: string;
                let aggregator: string;

                if (parts.length >= 2) {
                    columnFieldParts = parts.slice(0, -2); // Remove value field and aggregator
                    valueField = parts[parts.length - 2]; // Second to last part is the value field
                    aggregator = parts[parts.length - 1]; // Last part is the aggregator
                } else {
                    // Fallback for unexpected format
                    valueField = parts[0] || colName;
                    aggregator = 'value';
                }

                // Parse column field assignments
                const columnFieldAssignments = columnFieldParts.map(part => {
                    const equalIndex = part.indexOf('=');
                    if (equalIndex > 0) {
                        const field = part.substring(0, equalIndex);
                        const value = part.substring(equalIndex + 1);
                        return {
                            field: field.replace(/_/g, ':'),
                            value: value,
                            originalField: field // Keep original for data access
                        };
                    } else {
                        // Handle case where there's no equal sign
                        return {
                            field: part.replace(/_/g, ':'),
                            value: '',
                            originalField: part
                        };
                    }
                });

                // Find matching value field from the pivot configuration
                const matchingValueField = valueFields.find(vf =>
                    valueField.includes(vf.field.replace(/:/g, '_')) ||
                    valueField.includes(vf.field)
                );

                return {
                    columnName: colName,
                    columnFields: columnFieldAssignments,
                    valueField: valueField.replace(/_/g, ':'),
                    aggregator: aggregator,
                    fieldName: matchingValueField?.field || valueField.replace(/_/g, ':'),
                    originalFieldName: matchingValueField?.field || valueField.replace(/_/g, ':')
                };
            });

            // Use backend order - no sorting
            backendValueStructures = columnStructures;

            // Create header levels using the new structured format
            const createHeaderLevels = () => {
                const levels: Array<Array<{ label: string, colspan: number, level: string }>> = [];

                // Helper function to group consecutive columns
                const groupConsecutive = (cols: any[], groupBy: (col: any) => string, levelType: string) => {
                    const groups: Array<{ label: string, colspan: number, level: string }> = [];
                    let currentLabel = '';
                    let currentCount = 0;

                    cols.forEach((col, index) => {
                        const label = groupBy(col);
                        if (label !== currentLabel) {
                            if (currentCount > 0) {
                                groups.push({ label: currentLabel, colspan: currentCount, level: levelType });
                            }
                            currentLabel = label;
                            currentCount = 1;
                        } else {
                            currentCount++;
                        }

                        // Handle last group
                        if (index === cols.length - 1) {
                            groups.push({ label: currentLabel, colspan: currentCount, level: levelType });
                        }
                    });

                    return groups;
                };

                // Level 1: Value Field Names (Metric_value, etc.)
                levels.push(groupConsecutive(backendValueStructures, col => col.valueField, 'field'));

                // Dynamic levels for each column field (if any column fields exist)
                if (columnFields.length > 0 && backendValueStructures.length > 0) {
                    // Determine the number of column field levels from the first column structure
                    const maxColumnFields = Math.max(...backendValueStructures.map(col => col.columnFields.length));

                    // Create a level for each column field position
                    for (let i = 0; i < maxColumnFields; i++) {
                        levels.push(groupConsecutive(backendValueStructures, col => {
                            const columnField = col.columnFields[i];
                            if (columnField) {
                                return `${columnField.field}=${columnField.value}`;
                            }
                            return 'N/A';
                        }, `column-${i}`));
                    }
                }

                // Final level: Aggregators
                levels.push(groupConsecutive(backendValueStructures, col => col.aggregator.toUpperCase(), 'aggregator'));

                return levels;
            };

            headerLevels.push(...createHeaderLevels());
        }

        return { rowColumns, valueColumns, headerLevels, backendValueStructures: backendValueStructures || [] };
    })();

    // Use backend column order
    const backendColumnNames = [
        ...columnStructure.rowColumns,
        ...columnStructure.backendValueStructures.map((col: any) => col.columnName)
    ];

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
                                {/* Multi-level headers */}
                                {columnStructure.headerLevels.map((level, levelIndex) => (
                                    <Tr key={`header-level-${levelIndex}`}>
                                        {/* Row columns headers - only show on first level */}
                                        {levelIndex === 0 && columnStructure.rowColumns.map((columnName, index) => (
                                            <Th
                                                key={`row-header-${index}`}
                                                fontSize="xs"
                                                px={2}
                                                py={2}
                                                rowSpan={columnStructure.headerLevels.length}
                                                borderRightWidth={2}
                                                borderRightColor="gray.300"
                                                bg="gray.50"
                                            >
                                                {columnName.replace(/_/g, ':')}
                                            </Th>
                                        ))}

                                        {/* Value columns headers */}
                                        {level.map((header, headerIndex) => (
                                            <Th
                                                key={`value-header-${levelIndex}-${headerIndex}`}
                                                fontSize="xs"
                                                px={2}
                                                py={1}
                                                colSpan={header.colspan}
                                                textAlign="center"
                                                borderWidth={1}
                                                borderColor="gray.300"
                                                bg={
                                                    header.level === 'field' ? 'blue.50' :
                                                        header.level.startsWith('column-') ? 'purple.50' :
                                                            header.level === 'aggregator' ? 'green.50' :
                                                                'white'
                                                }
                                                color={
                                                    header.level === 'field' ? 'blue.800' :
                                                        header.level.startsWith('column-') ? 'purple.800' :
                                                            header.level === 'aggregator' ? 'green.800' :
                                                                'gray.800'
                                                }
                                            >
                                                {header.label}
                                            </Th>
                                        ))}
                                    </Tr>
                                ))}

                                {/* If no header levels (simple table), show simple headers */}
                                {columnStructure.headerLevels.length === 0 && (
                                    <Tr>
                                        {backendColumnNames.map((columnName, index) => (
                                            <Th
                                                key={index}
                                                fontSize="xs"
                                                px={2}
                                                py={2}
                                            >
                                                {columnName.replace(/_/g, ':')}
                                            </Th>
                                        ))}
                                    </Tr>
                                )}
                            </Thead>
                            <Tbody>
                                {processedData.map((row, rowIndex) => (
                                    <Tr key={rowIndex}>
                                        {backendColumnNames.map((columnName, colIndex) => (
                                            <Td
                                                key={colIndex}
                                                fontSize="sm"
                                                style={getCellStyle(row[columnName])}
                                                fontWeight={
                                                    colIndex < columnStructure.rowColumns.length ? 'semibold' : 'normal'
                                                }
                                                borderRightWidth={
                                                    colIndex === columnStructure.rowColumns.length - 1 ? 2 : 1
                                                }
                                                borderRightColor={
                                                    colIndex === columnStructure.rowColumns.length - 1 ? 'gray.300' : 'gray.200'
                                                }
                                                bg={
                                                    colIndex < columnStructure.rowColumns.length ? 'gray.25' : 'white'
                                                }
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