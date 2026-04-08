import { useRef } from 'react';

export default function ChatInput({ inputText, imageFile, placeholder, onChange, onKeyDown, onSend, onImagePick, onRemoveImage }) {
  const fileInputRef = useRef(null);

  return (
    <footer className="flex-none px-4 pb-5 pt-2 bg-surface-container-lowest">

      {/* Image preview strip */}
      {imageFile && (
        <div className="flex items-center gap-2 mb-2 pl-1">
          <div className="relative">
            <img src={imageFile.previewUrl} alt="preview" className="w-14 h-14 rounded-lg object-cover border border-outline-variant/30" />
            <button
              onClick={onRemoveImage}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-error flex items-center justify-center shadow"
            >
              <span className="material-symbols-outlined text-on-error text-[10px]">close</span>
            </button>
          </div>
          <p className="font-body text-[11px] text-on-surface-variant truncate max-w-[160px]">{imageFile.file.name}</p>
        </div>
      )}

      <div className="flex items-center gap-2">

        {/* Image picker button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { onImagePick(e.target.files?.[0]); e.target.value = ''; }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={!!imageFile}
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all shadow-sm ${
            imageFile
              ? 'bg-surface-container-high text-outline-variant opacity-40 cursor-not-allowed'
              : 'bg-surface-container text-on-surface-variant hover:text-primary hover:bg-surface-container-high active:scale-90'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">add_photo_alternate</span>
        </button>

        {/* Text input pill */}
        <div className="flex-1 flex items-center bg-surface-container rounded-full px-4 py-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.08)] border border-outline-variant/20">
          <input
            type="text"
            value={inputText}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent font-body text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none min-w-0"
            autoFocus
          />
        </div>

        {/* Send button */}
        <button
          onClick={onSend}
          disabled={!inputText.trim() && !imageFile}
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90 shadow-sm ${
            inputText.trim() || imageFile
              ? 'bg-primary hover:brightness-110 shadow-[0_2px_8px_rgba(0,79,69,0.3)]'
              : 'bg-surface-container text-outline-variant'
          }`}
        >
          <span className={`material-symbols-outlined text-[20px] ${inputText.trim() || imageFile ? 'text-on-primary' : ''}`}>
            arrow_upward
          </span>
        </button>

      </div>
    </footer>
  );
}
