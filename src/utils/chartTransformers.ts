// Helper utility to transform database chart format to UI format
// This can be used in the scheduler service or in the dashboard component

import { ChartWithPatient } from '../services/schedulerService';

export interface UIChart {
  id: string;
  patientId: string;
  patientName: string;
  patientDob: string;
  status: 'Needs Assignment' | 'Assigned' | 'Docs Available' | 'Completed';
  createdDate: string;
  assignedTo?: string;
  assignedToId?: string;
  documentCount: number;
  isNew: boolean;
  waitingDays: number;
}

export function transformChartForUI(chart: ChartWithPatient): UIChart {
  // Determine status based on assignment and chart state
  const getStatus = (): UIChart['status'] => {
    // Check database status for completed states first
    if (chart.status === 'delivered_locked' || chart.status === 'archived') {
      return 'Completed';
    }
    
    // If there's an assigned clinician, it's assigned
    if (chart.assigned_clinician || chart.patient.assigned_clinician_id) {
      return 'Assigned';
    }
    
    // If no clinician assigned and has documents, show docs available
    if ((chart.document_count || 0) > 0) {
      return 'Docs Available';
    }
    
    // Default: needs assignment
    return 'Needs Assignment';
  };

  // Check if chart is new (created within 24 hours)
  const isNew = (): boolean => {
    const created = new Date(chart.created_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 24;
  };

  // Calculate waiting days for unassigned charts
  const getWaitingDays = (): number => {
    if (chart.assigned_clinician || chart.patient.assigned_clinician_id) return 0;
    const created = new Date(chart.created_at);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff;
  };

  // Get assigned clinician name
  const getAssignedTo = (): string | undefined => {
    if (!chart.assigned_clinician) return undefined;
    return `${chart.assigned_clinician.first_name} ${chart.assigned_clinician.last_name}`;
  };

  return {
    id: chart.id,
    patientId: chart.patient_id,
    patientName: `${chart.patient.first_name} ${chart.patient.last_name}`,
    patientDob: chart.patient.date_of_birth,
    status: getStatus(),
    createdDate: chart.created_at,
    assignedTo: getAssignedTo(),
    assignedToId: chart.patient.assigned_clinician_id,
    documentCount: chart.document_count || 0,
    isNew: isNew(),
    waitingDays: getWaitingDays(),
  };
}

export function transformChartsForUI(charts: ChartWithPatient[]): UIChart[] {
  return charts.map(transformChartForUI);
}

// Usage in SchedulerDashboard:
// const uiCharts = transformChartsForUI(charts);
// Then use uiCharts in your filtering and rendering logic
