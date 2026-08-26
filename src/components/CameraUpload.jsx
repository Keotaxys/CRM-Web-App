import { useId, useRef } from 'react';

const ACCEPTED_IMAGES = 'image/jpeg,image/png,image/webp';

export default function CameraUpload({ label, actionLabel, changeActionLabel = actionLabel, file, onChange }) {
  const inputRef = useRef(null);
  const fileNameId = useId();

  return <div className="camera-upload-field">
    <span className="camera-upload-label">{label}</span>
    <input
      ref={inputRef}
      hidden
      type="file"
      accept={ACCEPTED_IMAGES}
      onChange={(event) => onChange(event.target.files[0] ?? null)}
    />
    <button
      type="button"
      className="camera-upload-button"
      aria-label={file ? changeActionLabel : actionLabel}
      aria-describedby={file ? fileNameId : undefined}
      onClick={() => inputRef.current?.click()}
    >
      <span className="material-symbols-outlined camera-upload-icon" aria-hidden="true">photo_camera</span>
      <span>{file ? 'ປ່ຽນຮູບ' : 'ເລືອກຮູບ'}</span>
    </button>
    {file && <small id={fileNameId} className="camera-upload-file" aria-live="polite">{file.name}</small>}
  </div>;
}
