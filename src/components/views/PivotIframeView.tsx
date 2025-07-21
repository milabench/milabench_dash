import { useState, useEffect } from 'react';
import { Box, Button, useToast, HStack } from '@chakra-ui/react';
import axios from 'axios';

interface PivotField {
    field: string;
    type: 'row' | 'column' | 'value' | 'filter';
    operator?: string;
    value?: string;
    aggregators?: string[];  // For value fields - multiple aggregators
}

interface PivotIframeViewProps {
    fields: PivotField[];
    isRelativePivot: boolean;
    onFieldsChange: (fields: PivotField[]) => void;
    triggerGeneration: number;
    setTriggerGeneration: (value: number | ((prev: number) => number)) => void;
    setIsGenerating: (value: boolean) => void;
    onGenerationComplete?: (() => void) | null;
}

export const PivotIframeView = ({ fields, isRelativePivot, onFieldsChange, triggerGeneration, setTriggerGeneration, setIsGenerating, onGenerationComplete }: PivotIframeViewProps) => {
    const toast = useToast();
    const [pivotHtml, setPivotHtml] = useState<string>('');

    const generatePivotFromFields = async (fieldsToUse: PivotField[]) => {
        try {
            setIsGenerating(true);

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
            // Call the completion callback if provided
            if (onGenerationComplete) {
                onGenerationComplete();
            }
        }
    };

    // Respond to trigger from parent component
    useEffect(() => {
        if (triggerGeneration > 0 && fields.length > 0) {
            generatePivotFromFields(fields);
            // Reset trigger after generation
            setTriggerGeneration(0);
        }
    }, [triggerGeneration, fields, isRelativePivot]);

    return (
        <Box h="100%" display="flex" flexDirection="column">
            {pivotHtml && (
                <Box
                    flex="1"
                    borderWidth={1}
                    borderRadius="md"
                    overflow="auto"
                    minH="400px"
                >
                    <iframe
                        srcDoc={pivotHtml}
                        style={{
                            width: '100%',
                            height: '100%',
                            border: 'none',
                        }}
                        sandbox="allow-same-origin"
                    />
                </Box>
            )}
        </Box>
    );
};