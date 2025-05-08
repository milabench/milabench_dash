import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Executions } from './components/views/Executions';
import { Metrics } from './components/views/Metrics';
import { Summary } from './components/views/Summary';
import { PivotView } from './components/views/PivotView';
import { ExecutionReport } from './components/views/ExecutionReport';

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
              <Route path="/metrics" element={<Metrics />} />
              <Route path="/summary" element={<Summary />} />
              <Route path="/pivot" element={<PivotView />} />
            </Routes>
          </Layout>
        </Router>
      </ChakraProvider>
    </QueryClientProvider>
  );
}

export default App;
