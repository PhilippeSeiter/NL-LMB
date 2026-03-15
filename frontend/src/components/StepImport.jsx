import { useState, useRef } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, Loader2, CheckCircle, AlertCircle, ArrowRight, RotateCcw } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function StepImport({ onComplete }) {
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef();

  const runOCROnFile = async (index, file) => {
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, status: "loading" } : f));
    try {
      const formData = new FormData();
      formData.append("file", file);
      const resp = await axios.post(`${API}/ocr`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFiles(prev => prev.map((f, i) =>
        i === index ? { ...f, status: "done", titre: resp.data.titre, file_key: resp.data.file_key || "" } : f
      ));
    } catch {
      setFiles(prev => prev.map((f, i) =>
        i === index ? { ...f, status: "error", error: "Extraction échouée", titre: file.name.replace(/\.[^.]+$/, "") } : f
      ));
    }
  };

  const addFiles = (newFiles) => {
    const valid = Array.from(newFiles).filter(f =>
      f.type === "image/jpeg" || f.type === "image/png" || f.type === "image/webp"
    );
    if (!valid.length) return;

    const startIdx = files.length;
    const entries = valid.map(f => ({
      file: f,
      name: f.name,
      preview: URL.createObjectURL(f),
      status: "pending",
      titre: "",
      error: "",
      file_key: "",
    }));

    setFiles(prev => [...prev, ...entries]);

    // OCR automatique sur chaque nouveau fichier
    entries.forEach((entry, i) => runOCROnFile(startIdx + i, entry.file));
  };

  const retranscribe = (index) => {
    const f = files[index];
    setFiles(prev => prev.map((fi, i) =>
      i === index ? { ...fi, status: "pending", titre: "", error: "", file_key: "" } : fi
    ));
    runOCROnFile(index, f.file);
  };

  const removeFile = (index) => {
    const f = files[index];
    if (f.preview) URL.revokeObjectURL(f.preview);
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const updateTitre = (index, value) => {
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, titre: value } : f));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e) => {
    addFiles(e.target.files);
    e.target.value = "";
  };

  const handleValidate = async () => {
    const valid = files.filter(f => f.titre.trim());
    if (!valid.length) return;
    setSubmitting(true);
    try {
      await onComplete(valid.map(f => ({
        titre: f.titre.trim(),
        original_file_key: f.file_key || "",
      })));
    } finally {
      setSubmitting(false);
    }
  };

  const isProcessing = files.some(f => f.status === "loading");
  const hasTitres = files.some(f => f.titre.trim());

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Étape 1 — Import des articles
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Déposez vos captures d'articles (JPG, PNG). L'extraction du titre démarre automatiquement.
        </p>
      </div>

      <div
        className={`upload-zone rounded-xl p-10 text-center cursor-pointer ${dragOver ? "drag-over" : ""}`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        data-testid="upload-zone"
      >
        <Upload className="w-8 h-8 mx-auto mb-3 text-gray-400" />
        <p className="text-sm font-medium text-gray-500">
          Glissez vos images ici ou <span className="text-[#3B9FE8]">parcourez</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">JPG, PNG — upload multiple</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleFileInput}
        data-testid="file-input"
      />

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3"
              data-testid={`file-item-${i}`}
            >
              {/* Thumbnail */}
              <div className="flex-shrink-0 w-14 h-14 rounded-md overflow-hidden bg-gray-100 border border-gray-200">
                <img
                  src={f.preview}
                  alt={f.name}
                  className="w-full h-full object-cover"
                  data-testid={`thumbnail-${i}`}
                />
              </div>

              {/* Status */}
              <div className="flex-shrink-0 w-4">
                {f.status === "loading" && <Loader2 className="w-4 h-4 spin text-[#3B9FE8]" />}
                {f.status === "done" && <CheckCircle className="w-4 h-4 text-green-500" />}
                {f.status === "error" && <AlertCircle className="w-4 h-4 text-orange-400" />}
                {f.status === "pending" && <div className="w-4 h-4 rounded-full border-2 border-gray-300" />}
              </div>

              {/* Titre éditable */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 truncate mb-1">{f.name}</p>
                <Input
                  value={f.titre}
                  onChange={(e) => updateTitre(i, e.target.value)}
                  placeholder={f.status === "loading" ? "Extraction en cours…" : "Titre de l'article"}
                  className="h-8 text-sm border-gray-200"
                  data-testid={`titre-input-${i}`}
                />
                {f.error && <p className="text-xs text-orange-400 mt-1">{f.error}</p>}
              </div>

              {/* Icône re-transcription */}
              {(f.status === "done" || f.status === "error") && (
                <button
                  onClick={() => retranscribe(i)}
                  title="Relancer l'extraction OCR"
                  className="flex-shrink-0 text-gray-300 hover:text-[#3B9FE8] transition-colors"
                  data-testid={`btn-retranscribe-${i}`}
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}

              {/* Supprimer */}
              <button
                onClick={() => removeFile(i)}
                className="flex-shrink-0 text-gray-300 hover:text-red-400 transition-colors"
                data-testid={`remove-file-${i}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {hasTitres && (
        <div className="flex justify-end">
          <Button
            onClick={handleValidate}
            disabled={submitting || isProcessing}
            className="bg-[#3B9FE8] hover:bg-[#2563EB] text-white"
            data-testid="btn-validate-titles"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 spin mr-2" />Création de la session…</>
            ) : isProcessing ? (
              <><Loader2 className="w-4 h-4 spin mr-2" />Extraction en cours…</>
            ) : (
              <>Valider les titres <ArrowRight className="w-4 h-4 ml-1" /></>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
