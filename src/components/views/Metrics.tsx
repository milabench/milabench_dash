import { Box, Heading, Select } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { getMetricsList, getGpuList } from '../../services/api';
import { Loading } from '../common/Loading';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const Metrics = () => {
    const { data: metrics, isLoading: isLoadingMetrics } = useQuery<string[]>({
        queryKey: ['metrics'],
        queryFn: getMetricsList,
    });

    const { data: gpus, isLoading: isLoadingGpus } = useQuery<string[]>({
        queryKey: ['gpus'],
        queryFn: getGpuList,
    });

    if (isLoadingMetrics || isLoadingGpus) {
        return <Loading message="Loading metrics..." />;
    }

    return (
        <Box>
            <Heading mb={6}>Metrics</Heading>
            <Box mb={4}>
                <Select placeholder="Select metric" mb={4}>
                    {metrics?.map((metric) => (
                        <option key={metric} value={metric}>
                            {metric}
                        </option>
                    ))}
                </Select>
                <Select placeholder="Select GPU">
                    {gpus?.map((gpu) => (
                        <option key={gpu} value={gpu}>
                            {gpu}
                        </option>
                    ))}
                </Select>
            </Box>
            <Box h="400px">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={[]} // We'll implement this later
                        margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="value" stroke="#8884d8" />
                    </LineChart>
                </ResponsiveContainer>
            </Box>
        </Box>
    );
};