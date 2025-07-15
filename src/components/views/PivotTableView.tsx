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
    TableContainer,
    IconButton,
    Tooltip
} from '@chakra-ui/react';
import { CopyIcon, DownloadIcon } from '@chakra-ui/icons';
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

    const copyJsonToClipboard = async () => {
        try {
            const jsonData = JSON.stringify(processedData, null, 2);

            // Try modern clipboard API first
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(jsonData);
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = jsonData;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }

            toast({
                title: 'JSON copied to clipboard',
                description: `${processedData.length} rows copied as JSON`,
                status: 'success',
                duration: 3000,
            });
        } catch (error) {
            toast({
                title: 'Failed to copy JSON',
                description: 'Could not copy data to clipboard',
                status: 'error',
                duration: 3000,
            });
        }
    };

    const copyTableToClipboard = async () => {
        try {
            if (processedData.length === 0) {
                toast({
                    title: 'No data to copy',
                    description: 'Generate pivot data first',
                    status: 'warning',
                    duration: 3000,
                });
                return;
            }

            // Create CSV format
            const headers = backendColumnNames.map(name => name.replace(/_/g, ':'));
            const csvContent = [
                headers.join('\t'), // Use tabs for better Excel compatibility
                ...processedData.map(row =>
                    backendColumnNames.map(col => {
                        const value = row[col];
                        // Handle numbers and strings appropriately
                        if (typeof value === 'number') {
                            return value.toString();
                        }
                        // Escape any tabs or quotes in text
                        return String(value || '').replace(/\t/g, ' ').replace(/"/g, '""');
                    }).join('\t')
                )
            ].join('\n');

            // Try modern clipboard API first
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(csvContent);
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = csvContent;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }

            toast({
                title: 'Table copied to clipboard',
                description: `${processedData.length} rows copied as tab-separated values`,
                status: 'success',
                duration: 3000,
            });
        } catch (error) {
            toast({
                title: 'Failed to copy table',
                description: 'Could not copy table to clipboard',
                status: 'error',
                duration: 3000,
            });
        }
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
                <HStack mb={4} justify="space-between">
                    <Button
                        colorScheme="blue"
                        onClick={generatePivot}
                        isLoading={isGenerating}
                    >
                        Generate Pivot
                    </Button>
                    {processedData.length > 0 && (
                        <HStack spacing={2}>
                            <Tooltip label="Copy JSON data to clipboard">
                                <IconButton
                                    icon={<CopyIcon />}
                                    size="sm"
                                    colorScheme="blue"
                                    variant="outline"
                                    onClick={copyJsonToClipboard}
                                    aria-label="Copy JSON to clipboard"
                                />
                            </Tooltip>
                            <Tooltip label="Copy table data to clipboard">
                                <IconButton
                                    icon={<DownloadIcon />}
                                    size="sm"
                                    colorScheme="green"
                                    variant="outline"
                                    onClick={copyTableToClipboard}
                                    aria-label="Copy table to clipboard"
                                />
                            </Tooltip>
                        </HStack>
                    )}
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
                    borderColor="gray.200"
                    borderRadius="lg"
                    minH="400px"
                    height="100%"
                    width="100%"
                    bg="white"
                    boxShadow="sm"
                    _hover={{
                        boxShadow: "md"
                    }}
                    transition="box-shadow 0.2s"
                    position="relative"
                >
                    {/* Copy buttons */}
                    <Box
                        position="absolute"
                        top={3}
                        right={3}
                        zIndex={10}
                        display="flex"
                        gap={2}
                    >
                        <Tooltip label="Copy JSON data to clipboard" placement="left">
                            <IconButton
                                icon={<CopyIcon />}
                                size="sm"
                                colorScheme="blue"
                                variant="outline"
                                onClick={copyJsonToClipboard}
                                aria-label="Copy JSON to clipboard"
                                bg="white"
                                _hover={{
                                    bg: "blue.50"
                                }}
                            />
                        </Tooltip>
                        <Tooltip label="Copy table data to clipboard" placement="left">
                            <IconButton
                                icon={<DownloadIcon />}
                                size="sm"
                                colorScheme="green"
                                variant="outline"
                                onClick={copyTableToClipboard}
                                aria-label="Copy table to clipboard"
                                bg="white"
                                _hover={{
                                    bg: "green.50"
                                }}
                            />
                        </Tooltip>
                    </Box>

                    <TableContainer>
                        <Table variant="simple" size="sm" width="auto" height="100%">
                            <Tbody>
                                {/* Create transposed header rows for column fields */}
                                {(() => {
                                    if (columnStructure.backendValueStructures.length === 0) {
                                        // Simple table without structured columns
                                        return (
                                            <>
                                                <Tr>
                                                    {backendColumnNames.map((columnName, index) => (
                                                        <Th
                                                            key={index}
                                                            fontSize="sm"
                                                            px={4}
                                                            py={3}
                                                            borderWidth={1}
                                                            borderColor="gray.200"
                                                            bg="blue.100"
                                                            color="blue.800"
                                                            fontWeight="semibold"
                                                            textAlign="left"
                                                        >
                                                            {columnName.replace(/_/g, ':')}
                                                        </Th>
                                                    ))}
                                                </Tr>
                                                {/* Separator row */}
                                                <Tr>
                                                    <Td
                                                        colSpan={backendColumnNames.length}
                                                        borderBottomWidth={3}
                                                        borderBottomColor="blue.300"
                                                        bg="blue.100"
                                                        h="4px"
                                                        p={0}
                                                        position="relative"
                                                    />
                                                </Tr>
                                            </>
                                        );
                                    }

                                    // Create rows for each field type in the structured columns
                                    // First collect all unique field names from column structures
                                    const fieldRows: Array<{ name: string, values: string[] }> = [];

                                    // Extract field names from first column to determine structure
                                    if (columnStructure.backendValueStructures.length > 0) {
                                        const firstCol = columnStructure.backendValueStructures[0];

                                        // Add rows for each column field
                                        firstCol.columnFields.forEach((field, index) => {
                                            fieldRows.push({
                                                name: field.field,
                                                values: columnStructure.backendValueStructures.map(col =>
                                                    col.columnFields[index]?.value || ''
                                                )
                                            });
                                        });

                                        // Add aggregator row last
                                        fieldRows.push({
                                            name: 'Aggregator',
                                            values: columnStructure.backendValueStructures.map(col =>
                                                col.aggregator.toUpperCase()
                                            )
                                        });
                                    }

                                    return (
                                        <>
                                            {fieldRows.map((fieldRow, rowIndex) => (
                                                <Tr key={`header-${rowIndex}`}>
                                                    {/* Field name label spanning row columns only */}
                                                    <Th
                                                        colSpan={columnStructure.rowColumns.length}
                                                        fontSize="sm"
                                                        px={4}
                                                        py={3}
                                                        borderWidth={1}
                                                        borderColor="gray.200"
                                                        bg={fieldRow.name === 'Aggregator' ? 'purple.100' : 'green.100'}
                                                        color={fieldRow.name === 'Aggregator' ? 'purple.800' : 'green.800'}
                                                        fontWeight="semibold"
                                                        textAlign="left"
                                                        minW="140px"
                                                        borderRightWidth={2}
                                                        borderRightColor={fieldRow.name === 'Aggregator' ? 'purple.200' : 'green.200'}
                                                    >
                                                        {fieldRow.name}
                                                    </Th>

                                                    {/* Values for this field across all columns */}
                                                    {fieldRow.values.map((value, colIndex) => (
                                                        <Td
                                                            key={colIndex}
                                                            fontSize="sm"
                                                            px={4}
                                                            py={3}
                                                            textAlign="center"
                                                            borderWidth={1}
                                                            borderColor="gray.200"
                                                            bg={
                                                                fieldRow.name === 'Aggregator' ? 'purple.50' :
                                                                    'green.50'
                                                            }
                                                            color={
                                                                fieldRow.name === 'Aggregator' ? 'purple.700' :
                                                                    'green.700'
                                                            }
                                                            fontWeight="medium"
                                                            _hover={{
                                                                bg: fieldRow.name === 'Aggregator' ? 'purple.100' : 'green.100'
                                                            }}
                                                            transition="background-color 0.2s"
                                                        >
                                                            {value.replace(/_/g, ':')}
                                                        </Td>
                                                    ))}
                                                </Tr>
                                            ))}

                                            {/* Row column headers row */}
                                            <Tr>
                                                {/* Row column headers */}
                                                {columnStructure.rowColumns.map((rowColumn, colIndex) => (
                                                    <Th
                                                        key={`row-header-${colIndex}`}
                                                        fontSize="sm"
                                                        px={4}
                                                        py={3}
                                                        borderWidth={1}
                                                        borderColor="gray.200"
                                                        bg="blue.100"
                                                        color="blue.800"
                                                        fontWeight="semibold"
                                                        textAlign="left"
                                                        borderRightWidth={colIndex === columnStructure.rowColumns.length - 1 ? 2 : 1}
                                                        borderRightColor={colIndex === columnStructure.rowColumns.length - 1 ? "blue.200" : "gray.200"}
                                                    >
                                                        {rowColumn.replace(/_/g, ':')}
                                                    </Th>
                                                ))}

                                                {/* Empty cells for value columns */}
                                                {columnStructure.valueColumns.map((_, colIndex) => (
                                                    <Th
                                                        key={`empty-value-${colIndex}`}
                                                        fontSize="sm"
                                                        px={4}
                                                        py={3}
                                                        borderWidth={1}
                                                        borderColor="gray.200"
                                                        bg="blue.50"
                                                    >
                                                        {/* Empty */}
                                                    </Th>
                                                ))}
                                            </Tr>

                                            {/* Separator row */}
                                            <Tr>
                                                <Td
                                                    colSpan={columnStructure.rowColumns.length + columnStructure.valueColumns.length}
                                                    borderBottomWidth={3}
                                                    borderBottomColor="blue.300"
                                                    bg="blue.100"
                                                    h="4px"
                                                    p={0}
                                                    position="relative"
                                                />
                                            </Tr>
                                        </>
                                    );
                                })()}

                                {/* Data rows */}
                                {processedData.map((row, rowIndex) => (
                                    <Tr
                                        key={rowIndex}
                                        _hover={{
                                            bg: 'gray.50'
                                        }}
                                        transition="background-color 0.2s"
                                        bg={rowIndex % 2 === 0 ? 'white' : 'gray.25'}
                                    >
                                        {/* Row column values */}
                                        {columnStructure.rowColumns.map((rowColumn, colIndex) => (
                                            <Td
                                                key={`row-${colIndex}`}
                                                fontSize="sm"
                                                fontWeight="semibold"
                                                borderWidth={1}
                                                borderColor="gray.200"
                                                borderRightWidth={colIndex === columnStructure.rowColumns.length - 1 ? 2 : 1}
                                                borderRightColor={colIndex === columnStructure.rowColumns.length - 1 ? "blue.200" : "gray.200"}
                                                bg="blue.25"
                                                textAlign="left"
                                                color="blue.800"
                                                px={4}
                                                py={3}
                                            >
                                                {formatValue(row[rowColumn])}
                                            </Td>
                                        ))}

                                        {/* Value columns */}
                                        {columnStructure.valueColumns.map((columnName, colIndex) => (
                                            <Td
                                                key={colIndex}
                                                fontSize="sm"
                                                style={getCellStyle(row[columnName])}
                                                fontWeight="medium"
                                                borderWidth={1}
                                                borderColor="gray.200"
                                                textAlign="center"
                                                px={4}
                                                py={3}
                                                _hover={{
                                                    bg: 'blue.50'
                                                }}
                                                transition="background-color 0.2s"
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
                    h="300px"
                    color="gray.500"
                    bg="gray.50"
                    borderRadius="lg"
                    borderWidth={1}
                    borderColor="gray.200"
                    borderStyle="dashed"
                    flexDirection="column"
                    gap={4}
                >
                    <Text fontSize="lg" fontWeight="medium" color="gray.600">
                        No data available
                    </Text>
                    <Text fontSize="sm" color="gray.500" textAlign="center">
                        Configure your pivot fields and the table will automatically generate
                    </Text>
                </Box>
            )}
        </Box>
    );
};