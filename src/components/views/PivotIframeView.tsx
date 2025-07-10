import { useState, useEffect } from 'react';
import { Box, Button, useToast, HStack } from '@chakra-ui/react';
import axios from 'axios';

interface PivotField {
    field: string;
    type: 'row' | 'column' | 'value' | 'filter';
    operator?: string;
    value?: string;
}

interface PivotIframeViewProps {
    fields: PivotField[];
    isRelativePivot: boolean;
    onFieldsChange: (fields: PivotField[]) => void;
}

export const PivotIframeView = ({ fields, isRelativePivot, onFieldsChange }: PivotIframeViewProps) => {
    const toast = useToast();
    const [pivotHtml, setPivotHtml] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);

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
        await generatePivotFromFields(fields);
    };

    // Auto-generate when fields change
    useEffect(() => {
        if (fields.length > 0) {
            generatePivotFromFields(fields);
        }
    }, [fields, isRelativePivot]);

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