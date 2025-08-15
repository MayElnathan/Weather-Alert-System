# Alert Toggle Implementation Guide

This guide shows how to implement the new alert toggle functionality in your parent components.

## 🆕 New Feature: Alert Active State Toggle

The `AlertCard` component now includes a toggle button that allows users to activate/deactivate alerts directly from the card interface.

## 🔧 Implementation Steps

### 1. Import the Required Service

```tsx
import { toggleAlertActive } from '../services/alertService';
```

### 2. Create the Toggle Handler Function

```tsx
const handleToggleActive = async (alertId: string, isActive: boolean) => {
  try {
    // Call the API to update the alert's active state
    await toggleAlertActive(alertId, isActive);
    
    // Refresh your alerts list or update local state
    await fetchAlerts(); // or however you refresh your alerts
    
    // Optional: Show success message
    toast.success(`Alert ${isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (error) {
    console.error('Failed to toggle alert:', error);
    
    // Handle error - show error message to user
    toast.error('Failed to update alert status');
  }
};
```

### 3. Pass the Handler to AlertCard

```tsx
<AlertCard
  alert={alert}
  onEdit={() => handleEdit(alert)}
  onDelete={() => handleDelete(alert.id)}
  onToggleActive={handleToggleActive}  // ← New prop
  operatorSymbol={getOperatorSymbol(alert.operator)}
  parameterName={getParameterName(alert.parameter)}
/>
```

## 🎨 Visual Features

### Toggle Button Appearance

- **Active State**: Green power icon (`Power`) with green hover effects
- **Inactive State**: Gray power-off icon (`PowerOff`) with gray hover effects
- **Position**: Located to the left of the edit button
- **Tooltip**: Shows "Activate alert" or "Deactivate alert" on hover

### Status Display

The card also shows the current status with:
- **Active**: Green badge with checkmark icon
- **Inactive**: Red badge with alert triangle icon

## 🔄 State Management

### Recommended Approach

1. **Optimistic Updates**: Update local state immediately for better UX
2. **API Call**: Make the API request in the background
3. **Error Handling**: Revert local state if API call fails
4. **Refresh**: Optionally refresh the entire alerts list

### Example with Optimistic Updates

```tsx
const handleToggleActive = async (alertId: string, isActive: boolean) => {
  // Store original state for potential rollback
  const originalAlerts = [...alerts];
  
  try {
    // Optimistically update local state
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, isActive } 
        : alert
    ));
    
    // Make API call
    await toggleAlertActive(alertId, isActive);
    
    // Success - state is already updated
    toast.success(`Alert ${isActive ? 'activated' : 'deactivated'}`);
  } catch (error) {
    // Rollback on error
    setAlerts(originalAlerts);
    toast.error('Failed to update alert status');
  }
};
```

## 🚀 Backend Requirements

Make sure your backend has the endpoint:

```
PATCH /api/alerts/:id/toggle-active
```

With request body:
```json
{
  "isActive": boolean
}
```

## 📱 User Experience

- **Immediate Feedback**: Toggle button changes appearance instantly
- **Visual Confirmation**: Status badge updates to show new state
- **Error Handling**: Clear error messages if something goes wrong
- **Accessibility**: Proper tooltips and keyboard navigation

## 🔍 Testing

Test the following scenarios:
1. ✅ Toggle from active to inactive
2. ✅ Toggle from inactive to active
3. ✅ Handle API errors gracefully
4. ✅ Verify state updates correctly
5. ✅ Check accessibility features

## 🎯 Benefits

- **Quick Actions**: Users can activate/deactivate alerts without editing
- **Better UX**: Immediate visual feedback
- **Efficient Workflow**: No need to open edit form for simple toggle
- **Consistent Design**: Matches your existing button styling
- **Accessibility**: Proper ARIA labels and keyboard support
