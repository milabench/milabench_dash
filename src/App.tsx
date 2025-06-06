import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Executions } from './components/views/Executions';
import { PivotView } from './components/views/PivotView';
import { ExecutionReport } from './components/views/ExecutionReport';
import { ExplorerView } from './components/views/ExplorerView';
import { Profile } from './components/views/Profile';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider>
        <Router>
          <Layout>
            <Routes> 
              <Route path="/" element={<Executions />} />
              <Route path="/executions" element={<Executions />} />
              <Route path="/executions/:id" element={<ExecutionReport />} />
              <Route path="/pivot" element={<PivotView />} />
              <Route path="/explorer" element={<ExplorerView />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </Layout>
        </Router>
      </ChakraProvider>
    </QueryClientProvider>
  );
}

export default App;
