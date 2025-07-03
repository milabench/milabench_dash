import React, { useState, useEffect } from 'react';
import { Box, Select, FormControl, FormLabel, HStack, Input, VStack, Button, useToast, Text, Heading, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, useDisclosure, Switch } from '@chakra-ui/react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';
import { saveQuery, getAllSavedQueries } from '../../services/api';

interface ExtraField {
    field: string;
    alias: string;
}

const GroupedView: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const toast = useToast();
    const [extraFields, setExtraFields] = useState<ExtraField[]>([]);
    const [selectedField, setSelectedField] = useState<string>('');
    const [fieldAlias, setFieldAlias] = useState<string>('');

    // Save modal state
    const { isOpen: isSaveModalOpen, onOpen: onSaveModalOpen, onClose: onSaveModalClose } = useDisclosure();
    const [saveQueryName, setSaveQueryName] = useState<string>('');

    // Load modal state
    const { isOpen: isLoadModalOpen, onOpen: onLoadModalOpen, onClose: onLoadModalClose } = useDisclosure();

    // Local state for input values
    const [g1Value, setG1Value] = useState<string>('');
    const [n1Value, setN1Value] = useState<string>('');
    const [g2Value, setG2Value] = useState<string>('');
    const [n2Value, setN2Value] = useState<string>('');
    const [metricValue, setMetricValue] = useState<string>('');
    const [colorValue, setColorValue] = useState<string>('');
    const [execIdsValue, setExecIdsValue] = useState<string>('');
    const [profileValue, setProfileValue] = useState<string>('');
    const [invertedValue, setInvertedValue] = useState<boolean>(false);
    const [weightedValue, setWeightedValue] = useState<boolean>(false);

    // Default values for the parameters (used for URL and iframe)
    const g1 = searchParams.get('g1') || '';
    const n1 = searchParams.get('n1') || '';
    const g2 = searchParams.get('g2') || '';
    const n2 = searchParams.get('n2') || '';
    const metric = searchParams.get('metric') || 'rate';
    const more = searchParams.get('more') || '';
    const execIds = searchParams.get('exec_ids') || '';
    const color = searchParams.get('color') || 'pytorch';
    const profile = searchParams.get('profile') || 'default';
    const inverted = searchParams.get('inverted') === 'true';
    const weighted = searchParams.get('weighted') === 'true';

    // Initialize local state from URL parameters
    useEffect(() => {
        setG1Value(searchParams.get('g1') || '');
        setN1Value(searchParams.get('n1') || '');
        setG2Value(searchParams.get('g2') || '');
        setN2Value(searchParams.get('n2') || '');
        setMetricValue(searchParams.get('metric') || '');
        setColorValue(searchParams.get('color') || '');
        setExecIdsValue(searchParams.get('exec_ids') || '');
        setProfileValue(searchParams.get('profile') || '');
        setInvertedValue(searchParams.get('inverted') === 'true');
        setWeightedValue(searchParams.get('weighted') === 'true');
    }, [searchParams]);

    // Initialize extraFields from more parameter
    useEffect(() => {
        if (more) {
            const fields = more.split(',').map(field => {
                const [fieldName, alias] = field.split(' as ');
                return {
                    field: fieldName,
                    alias: alias || fieldName
                };
            });
            setExtraFields(fields);
        }
    }, []); // Only run on mount

    // Fetch available fields
    const { data: availableFields } = useQuery({
        queryKey: ['explorerFields'],
        queryFn: async () => {
            const response = await axios.get('/api/keys');
            return response.data;
        },
    });

    // Fetch available profiles
    const { data: availableProfiles } = useQuery({
        queryKey: ['profiles'],
        queryFn: async () => {
            const response = await axios.get('/api/profile/list');
            return response.data;
        },
    });

    // Fetch saved queries for load functionality
    const { data: savedQueries } = useQuery({
        queryKey: ['savedQueries'],
        queryFn: getAllSavedQueries,
    });

    const handleG1Change = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const value = event.target.value;
        setG1Value(value);
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            if (value) {
                newParams.set('g1', value);
            } else {
                newParams.delete('g1');
            }
            return newParams;
        });
    };

    const handleN1Change = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setN1Value(value);
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            if (value) {
                newParams.set('n1', value);
            } else {
                newParams.delete('n1');
            }
            return newParams;
        });
    };

    const handleG2Change = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const value = event.target.value;
        setG2Value(value);
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            if (value) {
                newParams.set('g2', value);
            } else {
                newParams.delete('g2');
            }
            return newParams;
        });
    };

    const handleN2Change = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setN2Value(value);
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            if (value) {
                newParams.set('n2', value);
            } else {
                newParams.delete('n2');
            }
            return newParams;
        });
    };

    const handleMetricChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const value = event.target.value;
        setMetricValue(value);
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            if (value) {
                newParams.set('metric', value);
            } else {
                newParams.delete('metric');
            }
            return newParams;
        });
    };

    const handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setColorValue(value);
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            if (value) {
                newParams.set('color', value);
            } else {
                newParams.delete('color');
            }
            return newParams;
        });
    };

    const handleExecIdsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setExecIdsValue(value);
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            if (value) {
                newParams.set('exec_ids', value);
            } else {
                newParams.delete('exec_ids');
            }
            return newParams;
        });
    };

    const handleProfileChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const value = event.target.value;
        setProfileValue(value);
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            if (value) {
                newParams.set('profile', value);
            } else {
                newParams.delete('profile');
            }
            return newParams;
        });
    };

    const handleInvertedChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.checked;
        setInvertedValue(value);
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            if (value) {
                newParams.set('inverted', 'true');
            } else {
                newParams.delete('inverted');
            }
            return newParams;
        });
    };

    const handleWeightedChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.checked;
        setWeightedValue(value);
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            if (value) {
                newParams.set('weighted', 'true');
            } else {
                newParams.delete('weighted');
            }
            return newParams;
        });
    };

    const addExtraField = () => {
        if (!selectedField) {
            toast({
                title: 'No field selected',
                description: 'Please select a field to add',
                status: 'warning',
                duration: 3000,
            });
            return;
        }

        const newField: ExtraField = {
            field: selectedField,
            alias: fieldAlias || selectedField
        };

        const updatedFields = [...extraFields, newField];
        setExtraFields(updatedFields);

        // Update more parameter with all fields
        const moreFields = updatedFields.map(f => `${f.field} as ${f.alias}`).join(',');
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            newParams.set('more', moreFields);
            return newParams;
        });

        // Reset form
        setSelectedField('');
        setFieldAlias('');
    };

    const removeExtraField = (index: number) => {
        const updatedFields = extraFields.filter((_, i) => i !== index);
        setExtraFields(updatedFields);

        // Update more parameter
        const moreFields = updatedFields.map(f => `${f.field} as ${f.alias}`).join(',');
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            newParams.set('more', moreFields);
            return newParams;
        });
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
            // Create the query object with all current parameters
            const queryData = {
                url: '/grouped',
                parameters: {
                    g1: g1Value,
                    n1: n1Value || 'Group 1',
                    g2: g2Value,
                    n2: n2Value || 'Group 2',
                    metric: metricValue || 'rate',
                    more: more,
                    exec_ids: execIdsValue,
                    color: colorValue || 'pytorch',
                    profile: profileValue || 'default',
                    inverted: invertedValue,
                    weighted: weightedValue
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
        const { parameters } = query.query;

        // Update all form values with the loaded parameters
        setG1Value(parameters.g1 || '');
        setN1Value(parameters.n1 || '');
        setG2Value(parameters.g2 || '');
        setN2Value(parameters.n2 || '');
        setMetricValue(parameters.metric || '');
        setColorValue(parameters.color || '');
        setExecIdsValue(parameters.exec_ids || '');
        setProfileValue(parameters.profile || '');
        setInvertedValue(parameters.inverted || false);
        setWeightedValue(parameters.weighted || false);

        // Update URL parameters
        const newParams = new URLSearchParams();
        Object.entries(parameters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                newParams.set(key, String(value));
            }
        });
        setSearchParams(newParams);

        // Update extra fields if they exist
        if (parameters.more) {
            const fields = parameters.more.split(',').map((field: string) => {
                const [fieldName, alias] = field.split(' as ');
                return {
                    field: fieldName,
                    alias: alias || fieldName
                };
            });
            setExtraFields(fields);
        }

        toast({
            title: 'Query loaded',
            description: `"${query.name}" has been loaded successfully`,
            status: 'success',
            duration: 3000,
        });

        onLoadModalClose();
    };

    return (
        <Box p={4} height="100vh" width="100vh" display="flex" flexDirection="column">
            <VStack align="stretch" spacing={6}>
                <HStack spacing={4} mb={4} width="100%">
                    <FormControl flex="1">
                        <FormLabel>Column Field</FormLabel>
                        <Select value={g1Value} onChange={handleG1Change}>
                            <option value="">None</option>
                            <option value="group1">group1</option>
                            <option value="group2">group2</option>
                            <option value="group3">group3</option>
                            <option value="group4">group4</option>
                        </Select>
                    </FormControl>

                    <FormControl flex="1">
                        <FormLabel>Column Label</FormLabel>
                        <Input value={n1Value} onChange={handleN1Change} placeholder="Enter group 1 label" />
                    </FormControl>

                    <FormControl flex="1">
                        <FormLabel>Row Field</FormLabel>
                        <Select value={g2Value} onChange={handleG2Change}>
                            <option value="">None</option>
                            <option value="group1">group1</option>
                            <option value="group2">group2</option>
                            <option value="group3">group3</option>
                            <option value="group4">group4</option>
                        </Select>
                    </FormControl>

                    <FormControl flex="1">
                        <FormLabel>Row Label</FormLabel>
                        <Input value={n2Value} onChange={handleN2Change} placeholder="Enter group 2 label" />
                    </FormControl>

                    <FormControl flex="1">
                        <FormLabel>Metric</FormLabel>
                        <Select value={metricValue} onChange={handleMetricChange}>
                            <option value="rate">rate</option>
                            <option value="memory">memory</option>
                            <option value="gpu">gpu</option>
                            <option value="cpu">cpu</option>
                            <option value="perf">perf</option>
                        </Select>
                    </FormControl>

                    <FormControl flex="1">
                        <FormLabel>Color Field</FormLabel>
                        <Input value={colorValue} onChange={handleColorChange} placeholder="Enter color field" />
                    </FormControl>

                    <FormControl flex="1">
                        <FormLabel>Invert X-Y Axis</FormLabel>
                        <Switch
                            isChecked={invertedValue}
                            onChange={handleInvertedChange}
                            colorScheme="blue"
                        />
                    </FormControl>

                    <FormControl flex="1">
                        <FormLabel>Weighted</FormLabel>
                        <Switch
                            isChecked={weightedValue}
                            onChange={handleWeightedChange}
                            colorScheme="blue"
                        />
                    </FormControl>
                </HStack>

                <HStack spacing={4}>
                    <FormControl flex="2">
                        <Heading size="md">Execution IDs (comma-separated)</Heading>
                        <Input
                            value={execIdsValue}
                            onChange={handleExecIdsChange}
                            placeholder="Enter execution IDs (e.g., 1,2,3)"
                        />
                    </FormControl>

                    <FormControl flex="1">
                        <FormLabel>Profile</FormLabel>
                        <Select value={profileValue} onChange={handleProfileChange}>
                            {availableProfiles?.map((profile: string) => (
                                <option key={profile} value={profile}>
                                    {profile}
                                </option>
                            ))}
                        </Select>
                    </FormControl>
                </HStack>

                {/* Extra Fields Section */}
                <Box borderWidth={1} borderRadius="md" p={4}>
                    <VStack align="stretch" spacing={4}>
                        <Heading size="md">Extra Fields</Heading>
                        {/* Add Field Form as the first row */}
                        <HStack>
                            <FormControl>
                                <Select
                                    value={selectedField}
                                    onChange={(e) => setSelectedField(e.target.value)}
                                    placeholder="Select a field"
                                >
                                    {availableFields?.map((field: string) => (
                                        <option key={field} value={field}>
                                            {field}
                                        </option>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl>
                                <Input
                                    value={fieldAlias}
                                    onChange={(e) => setFieldAlias(e.target.value)}
                                    placeholder="Field Alias (optional)"
                                />
                            </FormControl>
                            <Button
                                leftIcon={<AddIcon />}
                                onClick={addExtraField}
                                colorScheme="blue"
                                whiteSpace="nowrap"
                                minW="110px"
                                maxW="140px"
                                overflow="hidden"
                                textOverflow="ellipsis"
                            >
                                Add Field
                            </Button>
                        </HStack>
                        {/* List of added extra fields */}
                        {extraFields.length > 0 && (
                            <div style={{ padding: '10px' }}>
                                {extraFields.map((field, index) => (
                                    <HStack key={index} justify="space-between">
                                        <Text>
                                            <b>{field.field}</b> as <b>{field.alias}</b>
                                        </Text>
                                        <Button
                                            leftIcon={<DeleteIcon />}
                                            onClick={() => removeExtraField(index)}
                                            size="sm"
                                            colorScheme="red"
                                            variant="ghost"
                                        >
                                            Remove
                                        </Button>
                                    </HStack>
                                ))}
                            </div>
                        )}
                    </VStack>
                </Box>

                {/* Save Query Button */}
                <HStack justify="center" spacing={4}>
                    <Button
                        colorScheme="green"
                        onClick={onSaveModalOpen}
                        size="lg"
                    >
                        Save Query
                    </Button>
                    <Button
                        colorScheme="blue"
                        onClick={onLoadModalOpen}
                        size="lg"
                    >
                        Load Query
                    </Button>
                </HStack>

                <Box flex="1" width="100vh" height="100vh">
                    <iframe
                        src={`/html/grouped/plot?${[
                            g1Value && `g1=${g1Value}`,
                            n1Value && `n1=${n1Value}`,
                            g2Value && `g2=${g2Value}`,
                            n2Value && `n2=${n2Value}`,
                            `metric=${metricValue || 'rate'}`,
                            `more=${more}`,
                            `exec_ids=${execIdsValue}`,
                            `color=${colorValue || 'pytorch'}`,
                            `profile=${profileValue || 'default'}`,
                            invertedValue && 'inverted=true',
                            weightedValue && 'weighted=true'
                        ].filter(Boolean).join('&')}`}
                        style={{ width: '100vh', height: '100vh', border: 'none' }}
                        title="Grouped Plot"
                    />
                </Box>
            </VStack>

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
                                    .filter((query: any) => query.query.url === '/grouped')
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
                        </VStack>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Box>
    );
};

export default GroupedView;
