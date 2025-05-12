import { Box, VStack, Text, useColorModeValue } from '@chakra-ui/react';
import { Link, useLocation } from 'react-router-dom';

interface NavItem {
    label: string;
    path: string;
}

const navItems: NavItem[] = [
    { label: 'Dashboard', path: '/' },
    { label: 'Executions', path: '/executions' },
    // { label: 'Metrics', path: '/metrics' },
    // { label: 'Summary', path: '/summary' },
    { label: 'Pivot View', path: '/pivot' },
    { label: 'Explorer', path: '/explorer' },
];

export const MainSidebar = () => {
    const location = useLocation();
    const bgColor = useColorModeValue('gray.800', 'gray.900');
    const hoverBg = useColorModeValue('gray.700', 'gray.800');
    const activeBg = useColorModeValue('blue.500', 'blue.400');
    const textColor = useColorModeValue('white', 'gray.100');

    return (
        <Box
            w="280px"
            h="100vh"
            bg={bgColor}
            color={textColor}
            p={6}
            position="fixed"
            left={0}
            top={0}
            borderRight="1px"
            borderColor="gray.700"
        >
            <Text fontSize="2xl" fontWeight="bold" mb={8}>
                Milabench
            </Text>
            <VStack spacing={2} align="stretch">
                {navItems.map((item) => (
                    <Link key={item.path} to={item.path}>
                        <Box
                            p={3}
                            borderRadius="md"
                            bg={location.pathname === item.path ? activeBg : 'transparent'}
                            _hover={{ bg: hoverBg }}
                            transition="all 0.2s"
                        >
                            <Text>{item.label}</Text>
                        </Box>
                    </Link>
                ))}
            </VStack>
        </Box>
    );
};