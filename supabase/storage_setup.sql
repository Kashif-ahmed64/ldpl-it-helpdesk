-- Run AFTER schema.sql — Storage bucket + policies for ticket attachments

INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read ticket attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ticket-attachments');

CREATE POLICY "Public upload ticket attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'ticket-attachments');

CREATE POLICY "Public update ticket attachments"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'ticket-attachments');

CREATE POLICY "Public delete ticket attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'ticket-attachments');
