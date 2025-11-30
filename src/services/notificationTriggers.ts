/**
 * Notification Triggers
 * 
 * This file contains examples of how to trigger notifications from various services.
 * Import these functions and call them when specific events occur in your application.
 */

import { notificationService } from './notificationService';

// ============================================================================
// CLINICIAN NOTIFICATIONS
// ============================================================================

/**
 * Notify clinician when their chart is reviewed
 * Call this after an agency admin approves or rejects a chart
 */
export async function notifyClinicianChartReviewed(
  clinicianId: string,
  chartId: string,
  patientName: string,
  status: 'approved' | 'rejected',
  feedback?: string
) {
  await notificationService.notifyChartReview(
    clinicianId,
    chartId,
    patientName,
    status,
    feedback
  );
}

/**
 * Notify clinician when assigned a new chart
 * Call this when a scheduler or admin assigns a chart to a clinician
 */
export async function notifyClinicianNewAssignment(
  clinicianId: string,
  chartId: string,
  patientName: string,
  dueDate?: string
) {
  await notificationService.notifyChartAssignment(
    clinicianId,
    chartId,
    patientName,
    dueDate
  );
}

/**
 * Notify clinician about chart updates
 * Call this when chart details are modified by another user
 */
export async function notifyClinicianChartUpdate(
  clinicianId: string,
  chartId: string,
  patientName: string,
  updateType: string
) {
  await notificationService.notifyChartUpdate(
    clinicianId,
    'clinician',
    chartId,
    patientName,
    updateType
  );
}

// ============================================================================
// AGENCY ADMIN NOTIFICATIONS
// ============================================================================

/**
 * Notify agency admin when a clinician submits a chart for review
 * Call this when a clinician marks a chart as "ready for review"
 */
export async function notifyAdminChartSubmitted(
  adminId: string,
  chartId: string,
  patientName: string,
  clinicianName: string
) {
  await notificationService.notifyChartSubmission(
    adminId,
    chartId,
    patientName,
    clinicianName
  );
}

/**
 * Notify agency admin about overdue charts
 * Call this from a scheduled job that checks for overdue charts
 */
export async function notifyAdminOverdueChart(
  adminId: string,
  chartId: string,
  patientName: string,
  clinicianName: string,
  daysOverdue: number
) {
  await notificationService.notifyOverdueChart(
    adminId,
    chartId,
    patientName,
    clinicianName,
    daysOverdue
  );
}

/**
 * Notify admin when charts are updated
 * Call this when clinicians make changes to charts
 */
export async function notifyAdminChartUpdate(
  adminId: string,
  chartId: string,
  patientName: string,
  updateType: string
) {
  await notificationService.notifyChartUpdate(
    adminId,
    'agency_admin',
    chartId,
    patientName,
    updateType
  );
}

/**
 * Notify admin about new clinician registration
 * Call this when a new clinician joins the agency
 */
export async function notifyAdminNewClinician(
  adminId: string,
  clinicianId: string,
  clinicianName: string
) {
  await notificationService.createNotification(
    adminId,
    'agency_admin',
    'clinician_added',
    '👨‍⚕️ New Clinician',
    `${clinicianName} has joined your agency`,
    'medium',
    { clinicianId, clinicianName },
    `/admin/clinicians/${clinicianId}`,
    'View Profile'
  );
}

/**
 * Notify admin about new patient
 * Call this when a new patient is added to the system
 */
export async function notifyAdminNewPatient(
  adminId: string,
  patientId: string,
  patientName: string
) {
  await notificationService.createNotification(
    adminId,
    'agency_admin',
    'patient_added',
    '👤 New Patient',
    `${patientName} has been added to the system`,
    'medium',
    { patientId, patientName },
    `/admin/patients/${patientId}`,
    'View Patient'
  );
}

// ============================================================================
// SCHEDULER NOTIFICATIONS
// ============================================================================

/**
 * Notify scheduler about new patient
 * Call this when a new patient is added
 */
export async function notifySchedulerNewPatient(
  schedulerId: string,
  patientId: string,
  patientName: string
) {
  await notificationService.notifyNewPatient(
    schedulerId,
    patientId,
    patientName
  );
}

/**
 * Notify scheduler about new clinician
 * Call this when a new clinician joins
 */
export async function notifySchedulerNewClinician(
  schedulerId: string,
  clinicianId: string,
  clinicianName: string
) {
  await notificationService.notifyNewClinician(
    schedulerId,
    clinicianId,
    clinicianName
  );
}

/**
 * Notify scheduler about assignment updates
 * Call this when patient assignments change
 */
export async function notifySchedulerAssignmentUpdate(
  schedulerId: string,
  assignmentId: string,
  patientName: string,
  clinicianName: string
) {
  await notificationService.createNotification(
    schedulerId,
    'scheduler',
    'assignment_updated',
    '📋 Assignment Updated',
    `Assignment for ${patientName} (${clinicianName}) has been updated`,
    'low',
    { assignmentId, patientName, clinicianName },
    `/scheduler/assignments/${assignmentId}`,
    'View Assignment'
  );
}

// ============================================================================
// USAGE EXAMPLES IN SERVICES
// ============================================================================

/**
 * Example: In your chart submission service
 */
export async function exampleChartSubmissionFlow(
  chartId: string,
  clinicianId: string,
  adminId: string,
  patientName: string,
  clinicianName: string
) {
  // 1. Submit the chart (your existing logic)
  // await chartService.submitChart(chartId);

  // 2. Notify the admin
  await notifyAdminChartSubmitted(adminId, chartId, patientName, clinicianName);
}

/**
 * Example: In your chart review service
 */
export async function exampleChartReviewFlow(
  chartId: string,
  clinicianId: string,
  patientName: string,
  status: 'approved' | 'rejected',
  feedback?: string
) {
  // 1. Save the review (your existing logic)
  // await chartService.reviewChart(chartId, status, feedback);

  // 2. Notify the clinician
  await notifyClinicianChartReviewed(
    clinicianId,
    chartId,
    patientName,
    status,
    feedback
  );
}

/**
 * Example: In your chart assignment service
 */
export async function exampleChartAssignmentFlow(
  chartId: string,
  clinicianId: string,
  patientName: string,
  dueDate?: string
) {
  // 1. Create the assignment (your existing logic)
  // await chartService.assignChart(chartId, clinicianId);

  // 2. Notify the clinician
  await notifyClinicianNewAssignment(clinicianId, chartId, patientName, dueDate);
}

/**
 * Example: Scheduled job to check for overdue charts
 */
export async function exampleCheckOverdueCharts() {
  // This would be called by a scheduled job (e.g., cron job, scheduled function)
  
  // 1. Get all overdue charts (your existing logic)
  // const overdueCharts = await chartService.getOverdueCharts();

  // 2. For each overdue chart, notify the admin
  // for (const chart of overdueCharts) {
  //   await notifyAdminOverdueChart(
  //     chart.adminId,
  //     chart.id,
  //     chart.patientName,
  //     chart.clinicianName,
  //     chart.daysOverdue
  //   );
  // }
}

// ============================================================================
// BULK NOTIFICATIONS
// ============================================================================

/**
 * Send notification to multiple users
 */
export async function notifyMultipleUsers(
  userIds: string[],
  userRole: string,
  type: any,
  title: string,
  message: string,
  priority: any = 'medium'
) {
  const promises = userIds.map((userId) =>
    notificationService.createNotification(
      userId,
      userRole,
      type,
      title,
      message,
      priority
    )
  );
  await Promise.all(promises);
}

/**
 * Example: Notify all admins about a critical issue
 */
export async function notifyAllAdminsSystemAlert(
  adminIds: string[],
  message: string
) {
  await notifyMultipleUsers(
    adminIds,
    'agency_admin',
    'system_alert',
    '⚠️ System Alert',
    message,
    'urgent'
  );
}
