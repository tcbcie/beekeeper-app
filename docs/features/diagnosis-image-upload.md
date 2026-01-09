# Diagnosis Image Upload Feature

## Overview
A tool that allows users to upload images for diagnosis purposes. Users can upload photos of potential bee diseases, varroa/pest issues, general hive problems, or frames/comb for analysis.

## Feature Location
- **UI**: Dashboard > Tools > "Diagnosis Image Upload" card
- **Component**: `src/components/tools/DiagnosisUploader.tsx`
- **Database Table**: `public.diagnosis_images`

## User Flow
1. Navigate to Tools page
2. Click "Diagnosis Image Upload" card
3. Select diagnosis type from dropdown
4. Enter a description of the issue
5. Upload an image (click or drag-and-drop)
6. Click "Upload for Diagnosis" button
7. See success confirmation

## Diagnosis Types
- **Disease**: Photos of potential bee diseases (foulbrood, nosema, etc.)
- **Varroa/Pest**: Photos for mite counts or pest identification
- **General Hive Issue**: Any bee-related problem needing visual diagnosis
- **Frame/Comb Analysis**: Photos of frames for brood pattern analysis

## Technical Details

### Database Schema
```sql
CREATE TABLE public.diagnosis_images (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    image_url text NOT NULL,
    description text NOT NULL,
    diagnosis_type text NOT NULL CHECK (diagnosis_type IN ('disease', 'varroa_pest', 'general', 'frame_comb')),
    created_at timestamptz DEFAULT now()
);
```

### Storage
- **Bucket**: `inspection-images` (existing)
- **Folder**: `diagnoses/`
- **Path Format**: `diagnoses/{random_id}_{timestamp}.{ext}`

### RLS Policies
- Users can only view, insert, and delete their own diagnosis images
- All operations require authentication

## Future Enhancements
- AI-powered diagnosis suggestions (infrastructure ready)
- History view of past uploads
- Link images to specific hives/apiaries
- Share images with veterinarians or other beekeepers
