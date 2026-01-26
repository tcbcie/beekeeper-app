# Apiary Visit Checklist Feature

## Overview
When filtering tasks by a specific apiary, users can generate a consolidated checklist of all equipment and tasks needed for that apiary visit.

## User Flow
1. Navigate to Tasks & Events page
2. Select an apiary from the filter dropdown
3. Click "Visit Checklist" button (appears when apiary is selected)
4. Modal opens showing:
   - Apiary name and visit date
   - Aggregated list of all equipment needed from filtered tasks
   - List of tasks/actions to perform
   - Notes section for field notes
5. Use Print button to print checklist for field use

## Features

### Equipment Aggregation
- Collects `equipment_needed` field from all filtered tasks
- Splits by comma or newline
- Deduplicates items
- Sorts alphabetically
- Displays with checkboxes

### Task List
- Shows all filtered tasks for the selected apiary
- Includes hive numbers when applicable
- Shows task descriptions
- Checkboxes pre-checked for completed tasks

### Print Support
- Print-optimized layout using CSS print classes
- Hides close button and actions when printing
- Notes section expands for handwritten notes
- Clean black/white styling for printing

## Technical Implementation

### File Modified
- `src/app/dashboard/tasks/page.tsx`

### Key Components
- `showChecklist` state - Controls modal visibility
- `getEquipmentList()` - Aggregates equipment from filtered tasks
- `getSelectedApiaryName()` - Returns selected apiary name
- Checklist Modal - Full modal with equipment, tasks, notes, and print

### Equipment Parsing
```typescript
const getEquipmentList = () => {
  const equipmentSet = new Set<string>()
  filteredTasks.forEach(task => {
    if (task.equipment_needed) {
      task.equipment_needed.split(/[,\n]/).forEach(item => {
        const trimmed = item.trim()
        if (trimmed) equipmentSet.add(trimmed)
      })
    }
  })
  return Array.from(equipmentSet).sort()
}
```

## UI Design

```
+-------------------------------------+
|  Apiary Visit Checklist         [X] |
|  Colm (AP01) - 26 Jan 2026          |
+-------------------------------------+
|                                     |
|  [box] EQUIPMENT NEEDED             |
|  +-------------------------------+  |
|  | [ ] New frames                |  |
|  | [ ] Queen excluder            |  |
|  | [ ] Smoker fuel               |  |
|  +-------------------------------+  |
|                                     |
|  [check] TASKS TO COMPLETE          |
|  +-------------------------------+  |
|  | [ ] Check queen (Hive 29-DA)  |  |
|  | [ ] Add super (Hive 30-DA)    |  |
|  +-------------------------------+  |
|                                     |
|  [pencil] NOTES                     |
|  +-------------------------------+  |
|  | Space for field notes...      |  |
|  +-------------------------------+  |
|                                     |
|  [Print Checklist]        [Close]   |
+-------------------------------------+
```

## Version History
- **v1.0** (January 26, 2026) - Initial implementation
