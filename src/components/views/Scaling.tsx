import React from 'react';
import { Box, Select, FormControl, FormLabel, HStack } from '@chakra-ui/react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const Scaling: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const xAxis = searchParams.get('x') || 'memory';
    const yAxis = searchParams.get('y') || 'perf';

    const handleXAxisChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSearchParams({ x: event.target.value, y: yAxis });
    };

    const handleYAxisChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSearchParams({ x: xAxis, y: event.target.value });
    };

    return (
        <Box p={4} height="100vh" display="flex" flexDirection="column" className='scaling-container'>
            <HStack spacing={4} mb={4} width="100%">
                <FormControl flex="1">
                    <FormLabel>X Axis</FormLabel>
                    <Select value={xAxis} onChange={handleXAxisChange}>
                        <option value="batch_size">batch_size</option>
                        <option value="memory">memory</option>
                        <option value="gpu">gpu</option>
                        <option value="cpu">cpu</option>
                        <option value="perf">perf</option>
                        {/* <option value="bench">bench</option>
                        <option value="time">time</option> */}
                    </Select>
                </FormControl>

                <FormControl flex="1">
                    <FormLabel>Y Axis</FormLabel>
                    <Select value={yAxis} onChange={handleYAxisChange}>
                        <option value="batch_size">batch_size</option>
                        <option value="memory">memory</option>
                        <option value="gpu">gpu</option>
                        <option value="cpu">cpu</option>
                        <option value="perf">perf</option>
                    </Select>
                </FormControl>
            </HStack>

            <Box flex="1">
                <iframe
                    src={`/html/scaling/x=${xAxis}/y=${yAxis}`}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    title="Scaling Plot"
                />
            </Box>
        </Box>
    );
};

export default Scaling;
