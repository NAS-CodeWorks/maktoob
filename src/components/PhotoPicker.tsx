import { useEffect, useRef, useState } from 'react';

type PhotoPickerProps = {
  label: string;
  value?: string | null;
  onChange: (photoUrl: string | null) => void;
};

function processImageFile(file: File, maxDim = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('فشل قراءة ملف الصورة'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('ملف الصورة غير صالح'));
      img.onload = () => {
        let width = img.naturalWidth;
        let height = img.naturalHeight;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('تعذر معالجة الصورة'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Converting via canvas strips EXIF metadata (including GPS/geotags)
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function PhotoPicker({ label, value, onChange }: PhotoPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [processing, setProcessing] = useState(false);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setCameraError('');
  };

  const startCamera = async () => {
    setCameraError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('الكاميرا غير مدعومة على هذا الجهاز أو محظورة');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
    } catch (err) {
      setCameraError(err instanceof Error ? err.message : 'تعذر تشغيل الكاميرا');
    }
  };

  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraActive]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    stopCamera();
    onChange(dataUrl);
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    try {
      const processed = await processImageFile(file);
      onChange(processed);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشل تحميل الصورة');
    } finally {
      setProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="photo-picker-container">
      <span className="photo-picker-label">{label}</span>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />

      <div className="photo-frame">
        {value ? (
          <div className="photo-preview-wrap">
            <img src={value} alt={label} className="photo-preview" />
            <div className="photo-actions">
              <button
                type="button"
                className="photo-btn-replace"
                onClick={() => fileInputRef.current?.click()}
                title="استبدال من الجهاز"
              >
                استبدال
              </button>
              <button
                type="button"
                className="photo-btn-camera"
                onClick={startCamera}
                title="التقاط بالكاميرا"
              >
                كاميرا
              </button>
              <button
                type="button"
                className="photo-btn-remove"
                onClick={() => onChange(null)}
                title="حذف الصورة"
              >
                حذف
              </button>
            </div>
          </div>
        ) : (
          <div className="photo-placeholder">
            <span className="placeholder-icon">👤</span>
            <span className="placeholder-text">صورة اختيارية</span>
            <div className="placeholder-buttons">
              <button
                type="button"
                className="btn-picker-action"
                onClick={() => fileInputRef.current?.click()}
                disabled={processing}
              >
                {processing ? 'جارٍ التحميل…' : 'اختيار ملف'}
              </button>
              <button
                type="button"
                className="btn-picker-action secondary"
                onClick={startCamera}
                disabled={processing}
              >
                كاميرا
              </button>
            </div>
          </div>
        )}
      </div>

      {cameraActive && (
        <div className="camera-modal-backdrop" role="dialog" aria-modal="true">
          <div className="camera-modal">
            <div className="camera-modal-head">
              <h3>التقاط {label}</h3>
              <button type="button" className="icon-button" onClick={stopCamera} aria-label="إغلاق">
                ✕
              </button>
            </div>
            <div className="camera-viewport">
              <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
            </div>
            {cameraError && <div className="form-error">{cameraError}</div>}
            <div className="camera-modal-actions">
              <button type="button" className="primary" onClick={handleCapture}>
                📸 التقاط الصورة
              </button>
              <button type="button" className="secondary" onClick={stopCamera}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
