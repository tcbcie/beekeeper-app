-- Enable RLS on the storage.objects table (should already be enabled)
-- This script creates policies for the 'inspection-images' bucket

-- Policy to allow authenticated users to upload images to inspection-images bucket
CREATE POLICY "Allow authenticated users to upload inspection images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'inspection-images');

-- Policy to allow authenticated users to update their own images
CREATE POLICY "Allow authenticated users to update inspection images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'inspection-images');

-- Policy to allow authenticated users to delete their own images
CREATE POLICY "Allow authenticated users to delete inspection images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'inspection-images');

-- Policy to allow public read access to inspection images
CREATE POLICY "Allow public read access to inspection images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'inspection-images');

-- Alternatively, if you want more restrictive policies (only authenticated users can upload/view):
-- Comment out the public read policy above and uncomment this one:
/*
CREATE POLICY "Allow authenticated users to read inspection images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'inspection-images');
*/
