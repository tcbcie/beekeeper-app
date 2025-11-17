# Tasks & Events Team Collaboration Implementation

## Overview
This document outlines the implementation of team collaboration support for the Tasks & Events feature, allowing team members to create and manage tasks for shared hives.

## Database Changes

### New Column
- `is_team_task` (BOOLEAN): Automatically set to `true` when a task is created for a shared hive by a team member

### RLS Policies
1. **SELECT**: Users can view their own tasks AND tasks for hives/apiaries they have access to (shared)
2. **INSERT**: Users can create tasks for hives/apiaries they can access (own or shared)
3. **UPDATE**: Users can update their own tasks OR team tasks for accessible hives
4. **DELETE**: Users can only delete tasks they created

### Trigger Function
`set_task_team_flag()`: Automatically sets `is_team_task` flag based on whether the associated hive/apiary is shared

## UI Changes Required

### 1. Update TaskEvent Interface
```typescript
interface TaskEvent {
  // ... existing fields
  is_team_task?: boolean  // Add this field
}
```

### 2. Update fetchTasks() Function
**Current (line 98-113)**:
```typescript
const { data, error } = await supabase
  .from('tasks_events')
  .select('*')
  .eq('user_id', userId)  // ❌ Only fetches user's own tasks
```

**Updated**:
```typescript
// Fetch ALL tasks user can access (RLS handles permissions)
const { data, error} = await supabase
  .from('tasks_events')
  .select('*')
  .order('start_date', { ascending: true })
// RLS policy will return: own tasks + tasks for shared hives
```

### 3. Update fetchAssociations() Function
**Current (lines 116-128)**: Only fetches user's own hives/apiaries

**Updated**: Fetch both own and shared hives/apiaries (similar to hives page pattern)
```typescript
// Fetch own hives
const ownHives = await supabase
  .from('hives')
  .select('id, hive_number, apiary_id, user_id')
  .eq('user_id', userId)

// Fetch team memberships
const teamMemberships = await supabase
  .from('team_members')
  .select('team_id')
  .eq('user_id', userId)

const teamIds = teamMemberships.map(tm => tm.team_id)

// Fetch shared hives (if in teams)
let sharedHives = []
if (teamIds.length > 0) {
  const sharedHiveData = await supabase
    .from('team_apiaries')
    .select('apiaries(hives(id, hive_number, apiary_id, user_id))')
    .in('team_id', teamIds)

  // Extract and mark as shared
  sharedHives = extractedHives.map(h => ({...h, is_shared: true}))
}

// Combine
const allHives = [...ownHives, ...sharedHives]
```

Same pattern for apiaries.

### 4. Add Ownership Filter
Add new filter state:
```typescript
const [filterOwnership, setFilterOwnership] = useState<'my' | 'team' | 'all'>('all')
```

Add filter dropdown in UI (line 364-444 filter section):
```tsx
<div>
  <label>Ownership</label>
  <select value={filterOwnership} onChange={(e) => setFilterOwnership(e.target.value)}>
    <option value="all">All Tasks</option>
    <option value="my">My Tasks</option>
    <option value="team">Team Tasks</option>
  </select>
</div>
```

### 5. Update Filter Logic
**Current (lines 295-303)**: Filters by various criteria

**Updated**: Add ownership filtering
```typescript
const filteredTasks = tasks.filter(task => {
  // ... existing filters

  // Add ownership filter
  if (filterOwnership === 'my' && task.user_id !== userId) return false
  if (filterOwnership === 'team' && task.user_id === userId) return false

  return true
})
```

### 6. Visual Distinction in Task Cards
**Update task display (lines 456-560)**: Add visual indicator for team tasks

```tsx
<div className={`bg-white rounded-lg shadow p-4 border-l-4 ${
  task.completed ? 'border-green-500 opacity-60' :
  task.is_team_task ? 'border-purple-500' :  // Team task
  'border-blue-500'  // Personal task
}`}>
  {/* ... existing content ... */}

  {/* Add team task indicator */}
  {task.is_team_task && (
    <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
      Team Task
    </span>
  )}

  {/* Show creator if not current user */}
  {task.user_id !== userId && (
    <span className="text-xs text-gray-500">
      Created by: {/* fetch creator name */}
    </span>
  )}
</div>
```

### 7. Update Hive/Apiary Dropdowns in Form
**Current (lines 722-758)**: Shows only user's hives/apiaries

**Updated**: Mark shared resources
```tsx
<select value={formData.hive_id}>
  <option value="">None</option>
  <optgroup label="My Hives">
    {hives.filter(h => !h.is_shared).map(hive => (
      <option key={hive.id} value={hive.id}>
        Hive {hive.hive_number}
      </option>
    ))}
  </optgroup>
  {sharedHives.length > 0 && (
    <optgroup label="Shared Hives">
      {hives.filter(h => h.is_shared).map(hive => (
        <option key={hive.id} value={hive.id}>
          Hive {hive.hive_number} (Shared)
        </option>
      ))}
    </optgroup>
  )}
</select>
```

## Implementation Steps

### Phase 1: Database (Complete)
1. ✅ Run `sql/enable_tasks_events_team_support.sql` in Supabase
2. ✅ Verify RLS policies are active
3. ✅ Test backfill of existing tasks

### Phase 2: UI Updates (To Do)
1. Update TaskEvent interface
2. Update fetchTasks to remove user_id filter
3. Update fetchAssociations to include shared hives/apiaries
4. Add ownership filter dropdown
5. Update filter logic
6. Add visual indicators for team tasks
7. Update form dropdowns to show shared resources

### Phase 3: Testing
1. Test creating personal tasks
2. Test creating team tasks for shared hives
3. Test visibility (owner sees team member tasks, vice versa)
4. Test filtering by ownership
5. Test editing/deleting permissions
6. Test marking team tasks as complete

## Security Considerations
- RLS policies ensure users can only create tasks for hives they can access
- `user_id` always reflects the creator (never changes)
- `is_team_task` flag automatically set (users can't manipulate it)
- Delete permission restricted to task creator only
- Update permission allows team members to mark tasks complete

## User Experience
- **Visual Distinction**: Purple border for team tasks, blue for personal tasks
- **Clear Ownership**: "Created by [name]" shown for team tasks
- **Easy Filtering**: Dropdown to show "My Tasks", "Team Tasks", or "All"
- **Grouped Dropdowns**: "My Hives" and "Shared Hives" clearly separated
- **Consistent Pattern**: Matches hives page UX for shared resources

## Benefits
✅ Team members can coordinate hive management tasks
✅ Clear visibility of who created each task
✅ Flexible filtering to focus on personal or team work
✅ Maintains individual accountability (user_id never changes)
✅ Automatic flagging prevents manual errors
