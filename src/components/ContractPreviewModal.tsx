import { useEffect, useRef, useState } from 'react';
import type { ContractInput, OfficeProfile } from '../../shared/domain';

type ContractPreviewModalProps = {
  contractInput: ContractInput;
  officeProfile?: OfficeProfile | null;
  onClose: () => void;
  onExportPdf?: () => void;
  onPrint?: () => void;
};

export function ContractPreviewModal({
  contractInput,
  officeProfile,
  onClose,
  onExportPdf,
  onPrint,
}: ContractPreviewModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    let cancelled = false;
    async function loadPreview() {
      setLoading(true);
      setError('');
      try {
        const html = await window.maktoob.previewContractHtml(contractInput, officeProfile ?? undefined);
        if (!cancelled) {
          setHtmlContent(html);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'تعذر إنشاء معاينة العقد');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    loadPreview();
    return () => {
      cancelled = true;
    };
  }, [contractInput, officeProfile]);

  const handleZoomIn = () => setZoom((z) => Math.min(160, z + 10));
  const handleZoomOut = () => setZoom((z) => Math.max(50, z - 10));
  const handleFitWidth = () => setZoom(115);
  const handleFitPage = () => setZoom(85);

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
      return;
    }
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    }
  };

  return (
    <div className="modal-backdrop preview-backdrop" role="dialog" aria-modal="true">
      <div className="preview-modal">
        <header className="preview-head">
          <div className="preview-title-group">
            <span className="eyebrow">معاينة مطابقة للمستند النهائي</span>
            <h2>معاينة العقد الحية — قياس A4</h2>
          </div>

          <div className="preview-toolbar">
            <div className="zoom-controls">
              <button
                type="button"
                className="btn-zoom"
                onClick={handleZoomOut}
                title="تصغير (-)"
                disabled={zoom <= 50}
              >
                －
              </button>
              <span className="zoom-level">{zoom}%</span>
              <button
                type="button"
                className="btn-zoom"
                onClick={handleZoomIn}
                title="تكبير (+)"
                disabled={zoom >= 160}
              >
                ＋
              </button>
            </div>

            <button type="button" className="btn-tool" onClick={handleFitWidth} title="ملاءمة العرض">
              ملاءمة العرض
            </button>
            <button type="button" className="btn-tool" onClick={handleFitPage} title="ملاءمة الصفحة">
              ملاءمة الصفحة
            </button>

            {onExportPdf && (
              <button type="button" className="secondary btn-tool" onClick={onExportPdf}>
                تصدير PDF
              </button>
            )}

            <button type="button" className="primary btn-tool" onClick={handlePrint}>
              طباعة
            </button>

            <button type="button" className="icon-button" onClick={onClose} aria-label="إغلاق المعاينة">
              ✕
            </button>
          </div>
        </header>

        <div className="preview-body">
          {loading && (
            <div className="preview-loading">
              <span className="loading-spinner">↻</span>
              <p>جارٍ توليد المعاينة الحية للعقد…</p>
            </div>
          )}

          {error && (
            <div className="preview-error">
              <p>⚠️ {error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="preview-sheet-wrapper">
              <div
                className="preview-sheet-container"
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'top center',
                }}
              >
                <iframe
                  ref={iframeRef}
                  srcDoc={htmlContent}
                  title="معاينة العقد"
                  className="preview-iframe-a4"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
