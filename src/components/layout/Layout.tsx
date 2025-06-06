import { Box } from '@chakra-ui/react';
import { useState } from 'react';
import { MainSidebar } from './MainSidebar';
import { SecondarySidebar } from './SecondarySidebar';

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
    const [isSecondaryOpen, setIsSecondaryOpen] = useState(false);
    const [secondaryTitle, setSecondaryTitle] = useState('');
    const [secondaryContent, setSecondaryContent] = useState<React.ReactNode>(null);

    const openSecondary = (title: string, content: React.ReactNode) => {
        setSecondaryTitle(title);
        setSecondaryContent(content);
        setIsSecondaryOpen(true);
    };

    const closeSecondary = () => {
        setIsSecondaryOpen(false);
    };

    return (
        <Box minH="100vh" bg="gray.50">
            <MainSidebar />
            <SecondarySidebar
                isOpen={isSecondaryOpen}
                onClose={closeSecondary}
                title={secondaryTitle}
            >
                {secondaryContent}
            </SecondarySidebar>
            <Box
                ml="280px"
                p={8}
                width="75%"
                minH="100vh"
                transition="margin-left 0.3s ease"
            >
                {children}
            </Box>
        </Box>
    );
};