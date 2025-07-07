import React, { useState, useEffect } from 'react';
import { Box, VStack, Text, useColorModeValue, Badge } from '@chakra-ui/react';
import { Link, useLocation } from 'react-router-dom';
import Cookies from 'js-cookie';

interface NavItem {
    label: string;
    path?: string;
    routes?: NavItem[];
}

// const navItems: NavItem[] = [
//     { label: 'Dashboard', path: '/' },
//     { label: 'Executions', path: '/executions' },
//     // { label: 'Metrics', path: '/metrics' },
//     // { label: 'Summary', path: '/summary' },
//     { label: 'Pivot View', path: '/pivot' },
//     { label: 'Explorer', path: '/explorer' },
//     { label: 'Profiles', path: '/profile' },
//     { label: 'Scaling', path: '/scaling' },
//     { label: 'Grouped View', path: '/grouped' },
//     { label: 'Saved Queries', path: '/saved-queries' },
// ];



const navItems: NavItem[] = [
    { label: 'Dashboard', path: '/' },
    { label: 'Latest Executions', path: '/executions' },
    {
        label: 'Search',
        routes: [
            { label: 'Pivot View', path: '/pivot' },
            { label: 'Explorer', path: '/explorer' },
        ]
    },

    {
        label: 'Plot',
        routes: [
            { label: 'Scaling', path: '/scaling' },
            { label: 'Grouped View', path: '/grouped' },
        ]
    },
    {
        label: 'Manage',
        routes: [
            { label: 'Profiles', path: '/profile' },
            { label: 'Saved Queries', path: '/saved-queries' }
        ]
    }
];

export const MainSidebar: React.FC = () => {
    const location = useLocation();
    const bgColor = useColorModeValue('gray.800', 'gray.900');
    const hoverBg = useColorModeValue('gray.700', 'gray.800');
    const activeBg = useColorModeValue('blue.500', 'blue.400');
    const textColor = useColorModeValue('white', 'gray.100');
    const [currentProfile, setCurrentProfile] = useState<string>('default');

    useEffect(() => {
        const savedProfile = Cookies.get('scoreProfile');
        if (savedProfile) {
            setCurrentProfile(savedProfile);
        }
    }, []);

    const renderNavItem = (item: NavItem, isSubItem: boolean = false) => {
        if (item.routes) {
            // Render category header and its routes
            return (
                <Box key={item.label}>
                    <Box
                        p={3}
                        borderRadius="md"
                        bg="transparent"
                        opacity={0.7}
                        borderBottom="1px solid"
                        borderColor="gray.600"
                        mb={2}
                    >
                        <Text fontSize="sm" fontWeight="semibold" textTransform="uppercase" letterSpacing="wide">
                            {item.label}
                        </Text>
                    </Box>
                    <VStack spacing={1} align="stretch" ml={4} mb={4}>
                        {item.routes.map((route) => renderNavItem(route, true))}
                    </VStack>
                </Box>
            );
        } else {
            // Render direct link
            return (
                <Link key={item.path} to={item.path!}>
                    <Box
                        p={3}
                        borderRadius="md"
                        bg={location.pathname === item.path ? activeBg : 'transparent'}
                        _hover={{ bg: hoverBg }}
                        transition="all 0.2s"
                        ml={isSubItem ? 2 : 0}
                    >
                        <Text fontSize={isSubItem ? 'sm' : 'md'}>{item.label}</Text>
                    </Box>
                </Link>
            );
        }
    };

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
            <Text fontSize="2xl" fontWeight="bold" mb={8} display="flex" alignItems="center" gap={2}>
                Milabench
                <Badge colorScheme="blue" fontSize="sm">
                    {currentProfile}
                </Badge>
            </Text>
            <VStack spacing={2} align="stretch">
                {navItems.map((item) => renderNavItem(item))}
            </VStack>
        </Box>
    );
};