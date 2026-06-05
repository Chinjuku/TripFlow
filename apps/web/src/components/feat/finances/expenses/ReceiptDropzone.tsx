import React from 'react';
import { CloudUpload, Loader2, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ReceiptDropzoneProps {
  isScanning: boolean;
  uploadedFile: { name: string; size: string } | null;
  onUpload: (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => void;
}

/** Drag-and-drop / file-picker zone that feeds a receipt image into OCR scanning. */
export function ReceiptDropzone({ isScanning, uploadedFile, onUpload }: ReceiptDropzoneProps) {
  const { t } = useTranslation();

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={onUpload}
      className="relative group cursor-pointer border-2 border-dashed border-border hover:border-primary/50 rounded-2xl p-6 bg-muted/50 text-center transition-all duration-200"
    >
      <input
        id="receipt-upload"
        type="file"
        accept="image/*,application/pdf"
        onChange={onUpload}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      />
      <div className="flex flex-col items-center justify-center gap-2">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform duration-200">
          {isScanning ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <CloudUpload className="w-6 h-6" />
          )}
        </div>
        {isScanning ? (
          <div className="space-y-1.5 z-20">
            <p className="text-sm font-semibold text-muted-foreground">
              {t('finances.scanningReceipt')}
            </p>
            <div className="w-48 h-1.5 bg-muted rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-primary animate-infinite-loading rounded-full" />
            </div>
          </div>
        ) : uploadedFile ? (
          <div className="z-20">
            <p className="text-sm font-semibold text-primary flex items-center gap-1.5 justify-center">
              <Check className="w-4 h-4" /> {t('finances.receiptLoaded')}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {uploadedFile.name} ({uploadedFile.size})
            </p>
          </div>
        ) : (
          <div className="z-20">
            <p className="text-sm font-semibold text-muted-foreground">
              {t('finances.uploadReceipt')}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('finances.uploadReceiptFormat')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
