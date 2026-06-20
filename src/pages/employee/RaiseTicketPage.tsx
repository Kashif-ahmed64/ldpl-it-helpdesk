import { useRef, useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';
import type { DbTicket, TicketCategory, TicketPriority } from '../../types';

const CATEGORIES: TicketCategory[] = [
  'Hardware', 'Software', 'Network', 'Account', 'Email', 'CCTV', 'Other',
];

const PRIORITIES: TicketPriority[] = ['Urgent', 'High', 'Medium', 'Low'];

export default function RaiseTicketPage() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('Hardware');
  const [priority, setPriority] = useState<TicketPriority | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ ticketNumber: string } | null>(null);

  const stopCamera = () => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setCameraOpen(false);
  };

  const startCamera = async () => {
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(media);
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = media;
          videoRef.current.play();
        }
      }, 100);
    } catch {
      setError('Camera access denied or unavailable.');
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setAttachment(file);
      setPreview(URL.createObjectURL(blob));
      stopCamera();
    }, 'image/jpeg', 0.9);
  };

  const handleFile = (file: File | null) => {
    if (!file) return;
    setAttachment(file);
    setPreview(URL.createObjectURL(file));
  };

  const clearAttachment = () => {
    setAttachment(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  };

  const uploadAttachment = async (): Promise<string | null> => {
    if (!attachment || !supabase || !user) return null;
    const ext = attachment.name.split('.').pop() || 'jpg';
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('ticket-attachments')
      .upload(path, attachment);

    if (upErr) throw new Error(upErr.message);

    const { data } = supabase.storage.from('ticket-attachments').getPublicUrl(path);
    return data.publicUrl;
  };

  const generateTicketNumber = async (): Promise<string> => {
    if (!supabase) return `IT-2026-0001`;
    const yearStart = '2026-01-01T00:00:00Z';
    const yearEnd = '2027-01-01T00:00:00Z';
    const { count } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yearStart)
      .lt('created_at', yearEnd);

    const next = (count ?? 0) + 1;
    return `IT-2026-${String(next).padStart(4, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priority) {
      setError('Please select a priority.');
      return;
    }
    if (!supabase || !user) {
      setError('Supabase is not configured.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      let attachmentUrl: string | null = null;
      if (attachment) attachmentUrl = await uploadAttachment();

      const ticketNumber = await generateTicketNumber();

      const { data, error: insertErr } = await supabase
        .from('tickets')
        .insert({
          ticket_number: ticketNumber,
          title: title.trim(),
          description: description.trim(),
          category,
          priority,
          status: 'Open',
          raised_by: user.id,
          attachment_url: attachmentUrl,
        })
        .select()
        .single<DbTicket>();

      if (insertErr) throw new Error(insertErr.message);

      setSuccess({ ticketNumber: data?.ticket_number ?? ticketNumber });
      setTitle('');
      setDescription('');
      setCategory('Hardware');
      setPriority(null);
      clearAttachment();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="page">
        <div className="card success-card">
          <h1>Ticket Submitted</h1>
          <p>Your ticket has been raised successfully.</p>
          <p className="success-card__number">{success.ticketNumber}</p>
          <button type="button" className="btn-primary" onClick={() => setSuccess(null)}>
            Raise Another Ticket
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page__title">Raise a Ticket</h1>

      <form className="card form-card" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>Title</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} />
        </label>

        <label className="form-field">
          <span>Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={5} />
        </label>

        <label className="form-field">
          <span>Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as TicketCategory)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <fieldset className="form-field">
          <span>Priority</span>
          <div className="priority-pills">
            {PRIORITIES.map((p) => (
              <button
                key={p}
                type="button"
                className={`priority-pill priority-pill--${p.toLowerCase()}${priority === p ? ' priority-pill--selected' : ''}`}
                onClick={() => setPriority(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="form-field">
          <span>Screenshot / Photo (optional)</span>
          <div className="upload-area">
            {preview ? (
              <div className="upload-preview">
                <img src={preview} alt="Attachment preview" />
                <button type="button" className="upload-preview__remove" onClick={clearAttachment}>
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="upload-actions">
                <button type="button" className="btn-secondary" onClick={startCamera}>
                  <Camera size={18} /> Capture Photo
                </button>
                <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()}>
                  <Upload size={18} /> Upload File
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                />
              </div>
            )}
          </div>
        </fieldset>

        {cameraOpen && (
          <div className="camera-modal">
            <video ref={videoRef} autoPlay playsInline muted />
            <canvas ref={canvasRef} hidden />
            <div className="camera-modal__actions">
              <button type="button" className="btn-primary" onClick={capturePhoto}>Capture</button>
              <button type="button" className="btn-secondary" onClick={stopCamera}>Cancel</button>
            </div>
          </div>
        )}

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Ticket'}
        </button>
      </form>
    </div>
  );
}
