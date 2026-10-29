import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AgentProvider } from './context/AgentContext.jsx';
import Layout from './components/Layout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import TicketsPage from './pages/TicketsPage.jsx';
import NewTicketPage from './pages/NewTicketPage.jsx';
import TicketDetailPage from './pages/TicketDetailPage.jsx';

export default function App() {
  return (
    <AgentProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="tickets" element={<TicketsPage />} />
            <Route path="tickets/new" element={<NewTicketPage />} />
            <Route path="tickets/:id" element={<TicketDetailPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AgentProvider>
  );
}
