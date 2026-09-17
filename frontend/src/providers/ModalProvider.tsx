'use client';

import * as React from 'react';
import { AnalyticsModal, SettingsModal, AuditReportModal } from '@/components/modals';

export function ModalProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AnalyticsModal />
      <SettingsModal />
      <AuditReportModal />
    </>
  );
}
