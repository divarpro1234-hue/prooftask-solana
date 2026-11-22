/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from '@/src/components/Layout';
import { RepositoryProvider } from '@/src/context/RepositoryContext';
import { ToastProvider } from '@/src/context/ToastContext';
import { WalletProvider } from '@/src/context/WalletContext';
import { DashboardPage } from '@/src/pages/DashboardPage';
import { ProjectDetailPage } from '@/src/pages/ProjectDetailPage';
import { ProjectsPage } from '@/src/pages/ProjectsPage';
import { VerifyPage } from '@/src/pages/VerifyPage';

export default function App() {
  return (
    <WalletProvider>
      <RepositoryProvider>
        <ToastProvider>
          <BrowserRouter>
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/projects/:id" element={<ProjectDetailPage />} />
                <Route path="/verify" element={<VerifyPage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </ToastProvider>
      </RepositoryProvider>
    </WalletProvider>
  );
}
