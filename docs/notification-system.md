# Notification System Documentation

## Overview

The notification system provides real-time, role-based notifications for clinicians, agency administrators, and schedulers. It includes a complete backend service, React hooks, UI components, and database schema.

## Architecture

### Components

1. **Types** (`src/types/notification.ts`)

   - TypeScript interfaces for notifications and preferences
   - Notification types, priorities, and metadata

2. **Service** (`src/services/notificationService.ts`)

   - Core notification logic
   - Real-time subscriptions via Supabase
   - CRUD operations for notifications
   - Role-specific notification helpers

3. **Triggers** (`src/services/notificationTriggers.ts`)

   - Pre-built notification triggers for common events
   - Examples of how to integrate notifications

4. **React Hook** (`src/hooks/useNotifications.ts`)

   - Custom hook for managing notifications in React components
   - Handles loading, marking as read, and real-time updates

5. **UI Component** (`src/components/NotificationCenter.tsx`)

   - Bell icon with unread count badge
   - Dropdown panel showing recent notifications
   - Actions: mark as read, delete, navigate to related content

6. **Database** (`database_migrations/notifications_system.sql`)
   - Tables: `notifications`, `notification_preferences`
   - Row Level Security policies
   - Indexes for performance
   - Triggers for auto-updating timestamps

## Role-Specific Notifications

### Clinicians Receive:

- ✅ **Chart Approved** - When their chart is approved
- ⚠️ **Chart Needs Revision** - When their chart is rejected with feedback
- 📋 **New Chart Assigned** - When assigned a new patient chart
- 📝 **Chart Updated** - When their chart is modified by another user

### Agency Admins Receive:

- 📥 **New Chart for Review** - When clinicians submit charts
- ⏰ **Overdue Chart Alert** - Daily alerts for overdue charts
- 📝 **Chart Updated** - When charts are modified
- 👨‍⚕️ **New Clinician** - When a clinician joins the agency
- 👤 **New Patient** - When a patient is added

### Schedulers Receive:

- 👤 **New Patient Added** - When patients are added to the system
- 👨‍⚕️ **New Clinician Added** - When clinicians join
- 📋 **Assignment Updated** - When patient assignments change

## Installation

### 1. Run Database Migration

```bash
# Connect to your Supabase project and run:
psql -h your-host -U your-user -d your-database -f database_migrations/notifications_system.sql
```

Or use the Supabase dashboard SQL editor to run the migration file.

### 2. Install Required Dependencies

The notification system uses these dependencies (already in your project):

- `@supabase/supabase-js` - For real-time subscriptions
- `lucide-react` - For icons
- `date-fns` - For time formatting
- `sonner` - For toast notifications

## Usage

### Adding NotificationCenter to Your App

```tsx
import NotificationCenter from "./components/NotificationCenter";

function YourDashboard() {
  const { user } = useAuth(); // Your auth context

  return (
    <div className="header">
      <h1>Dashboard</h1>

      {/* Add notification center in your header */}
      <NotificationCenter
        userId={user.id}
        userRole={user.role}
        onNavigate={(url) => navigate(url)}
      />
    </div>
  );
}
```

### Using the Hook in Custom Components

```tsx
import { useNotifications } from "../hooks/useNotifications";

function CustomNotificationPanel() {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications(userId);

  return (
    <div>
      <h2>You have {unreadCount} unread notifications</h2>
      {notifications.map((notification) => (
        <div key={notification.id}>
          <h3>{notification.title}</h3>
          <p>{notification.message}</p>
          <button onClick={() => markAsRead(notification.id)}>
            Mark as read
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Triggering Notifications from Your Services

#### Example 1: Chart Submission

```tsx
import { notifyAdminChartSubmitted } from "./services/notificationTriggers";

async function submitChart(chartId: string) {
  // Your existing chart submission logic
  await chartService.submit(chartId);

  // Send notification to admin
  await notifyAdminChartSubmitted(adminId, chartId, "John Doe", "Dr. Smith");
}
```

#### Example 2: Chart Review

```tsx
import { notifyClinicianChartReviewed } from "./services/notificationTriggers";

async function reviewChart(chartId: string, status: "approved" | "rejected") {
  // Your existing review logic
  await chartService.review(chartId, status);

  // Notify the clinician
  await notifyClinicianChartReviewed(
    clinicianId,
    chartId,
    "John Doe",
    status,
    status === "rejected" ? "Please add more detail to section 3" : undefined
  );
}
```

#### Example 3: New Patient Assignment

```tsx
import { notifyClinicianNewAssignment } from "./services/notificationTriggers";

async function assignChartToClinician(chartId: string, clinicianId: string) {
  // Your existing assignment logic
  await assignmentService.create(chartId, clinicianId);

  // Notify the clinician
  await notifyClinicianNewAssignment(
    clinicianId,
    chartId,
    "John Doe",
    "2025-12-15"
  );
}
```

### Direct Notification Creation

For custom notifications not covered by the triggers:

```tsx
import { notificationService } from "./services/notificationService";

await notificationService.createNotification(
  userId,
  "clinician",
  "system_alert",
  "⚠️ System Maintenance",
  "The system will be under maintenance tonight from 10 PM to 2 AM",
  "medium",
  { maintenanceWindow: "10 PM - 2 AM" },
  "/system/status",
  "View Details"
);
```

## Notification Types

| Type                 | Description                | Typical Recipients |
| -------------------- | -------------------------- | ------------------ |
| `chart_review`       | Chart has been reviewed    | Clinicians         |
| `chart_assigned`     | New chart assigned         | Clinicians         |
| `chart_updated`      | Chart details changed      | Clinicians, Admins |
| `chart_submitted`    | Chart submitted for review | Admins             |
| `chart_approved`     | Chart approved             | Clinicians         |
| `chart_rejected`     | Chart rejected             | Clinicians         |
| `chart_overdue`      | Chart is overdue           | Admins             |
| `patient_added`      | New patient added          | Admins, Schedulers |
| `patient_updated`    | Patient info changed       | Admins, Schedulers |
| `clinician_added`    | New clinician joined       | Admins, Schedulers |
| `clinician_updated`  | Clinician info changed     | Admins             |
| `assignment_created` | New assignment created     | Schedulers         |
| `assignment_updated` | Assignment modified        | Schedulers         |
| `message_received`   | New message                | All roles          |
| `system_alert`       | System-wide alert          | All roles          |

## Priority Levels

- **urgent** 🔴 - Requires immediate attention (red badge)
- **high** 🟠 - Important but not urgent (orange badge)
- **medium** 🔵 - Normal priority (blue badge)
- **low** ⚪ - Informational (gray badge)

## Notification Preferences

Users can manage their notification preferences. By default, all notification types are enabled.

```tsx
import { notificationService } from "./services/notificationService";

// Get preferences
const prefs = await notificationService.getPreferences(userId);

// Update preferences
await notificationService.updatePreferences({
  userId,
  emailNotifications: true,
  pushNotifications: true,
  chartReviews: true,
  chartAssignments: true,
  chartUpdates: false, // User disabled chart update notifications
  patientUpdates: true,
  clinicianUpdates: true,
  systemAlerts: true,
});
```

## Real-Time Subscriptions

Notifications are delivered in real-time using Supabase's real-time functionality. When a new notification is created, all active users receive it instantly through WebSocket connections.

The subscription is automatically managed by:

1. The `useNotifications` hook
2. The `NotificationCenter` component

No additional setup required!

## Scheduled Jobs

Some notifications should be sent on a schedule. Here's an example cron job:

### Check for Overdue Charts (Daily at 9 AM)

```tsx
// This would run as a scheduled function (e.g., Vercel Cron, AWS Lambda)
import { notificationService } from "./services/notificationService";
import { chartService } from "./services/chartService";

export async function checkOverdueCharts() {
  const overdueCharts = await chartService.getOverdueCharts();

  for (const chart of overdueCharts) {
    await notificationService.notifyOverdueChart(
      chart.agencyAdminId,
      chart.id,
      chart.patientName,
      chart.clinicianName,
      chart.daysOverdue
    );
  }
}
```

## Best Practices

### 1. Don't Over-Notify

- Only send notifications for important events
- Let users control which notifications they receive

### 2. Provide Context

- Include relevant details in the message
- Use metadata to store additional information
- Provide action URLs when applicable

### 3. Use Appropriate Priorities

- Reserve "urgent" for critical issues
- Use "high" for time-sensitive matters
- Default to "medium" for most notifications
- Use "low" for informational updates

### 4. Handle Errors Gracefully

```tsx
try {
  await notificationService.createNotification(...);
} catch (error) {
  // Don't fail the main operation if notification fails
  console.error('Failed to send notification:', error);
  // Log to monitoring service
}
```

### 5. Batch Notifications

For bulk operations, batch notification creation:

```tsx
const notifications = userIds.map((userId) => ({
  user_id: userId,
  type: "system_alert",
  title: "System Update",
  message: "We've added new features!",
  // ...
}));

await supabaseClient.from("notifications").insert(notifications);
```

## Troubleshooting

### Notifications Not Appearing

1. **Check database connection**

   ```tsx
   const { data, error } = await supabaseClient
     .from("notifications")
     .select("*")
     .limit(1);
   ```

2. **Verify RLS policies**

   - Ensure user is authenticated
   - Check that policies allow user to see their notifications

3. **Check real-time subscription**
   - Look for WebSocket errors in console
   - Verify Supabase real-time is enabled for your project

### Performance Issues

1. **Add database indexes** (already included in migration)
2. **Limit notification history** - Consider archiving old notifications
3. **Paginate results** - Load notifications in batches

```tsx
const notifications = await notificationService.getNotifications(userId, 20); // Limit to 20
```

## Security

- **Row Level Security**: Users can only see their own notifications
- **Service Role**: Only the service role can create notifications for other users
- **HIPAA Compliance**: No PHI should be stored in notification messages
  - ✅ "Chart for patient John D. needs review"
  - ❌ "Chart with diagnosis 'diabetes' needs review"

## Future Enhancements

Potential additions to the notification system:

- Email delivery integration
- SMS notifications
- Push notifications for mobile apps
- Notification sound preferences
- Snooze/remind me later functionality
- Notification templates
- Analytics and reporting

## Support

For questions or issues with the notification system:

1. Check this documentation first
2. Review the example code in `notificationTriggers.ts`
3. Check database logs in Supabase dashboard
4. Contact your development team
