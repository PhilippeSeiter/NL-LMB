import axios from "axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, CheckCircle, Image } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SessionSummary({ session }) {
  const handleExport = () => {
    window.location.href = `${API}/sessions/${session.id}/export`;
  };

  const pictoCount = session.articles.reduce((acc, a) =>
    acc + (a.picto?.images?.filter(Boolean).length || 0), 0);
  const illusCount = session.articles.filter(a => a.illustration?.image).length;

  return (
    <div className="space-y-6 fade-in">
      <div className="text-center py-6">
        <CheckCircle className="w-12 h-12 mx-auto mb-3 text-[#10B981]" />
        <h2 className="text-2xl font-bold text-[#0F172A] mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Session terminée
        </h2>
        <p className="text-gray-500 text-sm">{session.titre}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-[#3B1FA8]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {session.articles.length}
          </p>
          <p className="text-sm text-gray-500 mt-1">Articles</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-[#3B9FE8]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {pictoCount}
          </p>
          <p className="text-sm text-gray-500 mt-1">Pictos</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-[#10B981]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {illusCount}
          </p>
          <p className="text-sm text-gray-500 mt-1">Illustrations</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {session.articles.map((article, i) => (
          <div key={i} className="border-b border-gray-100 last:border-b-0 px-5 py-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-mono text-gray-400">#{String(article.index).padStart(2, '0')}</span>
              <p className="font-semibold text-gray-800 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {article.titre}
              </p>
            </div>

            <div className="flex gap-6">
              <div className="flex-1">
                <p className="text-xs text-gray-400 mb-2 font-medium">Pictos</p>
                <div className="flex gap-2">
                  {article.picto?.images?.map((url, j) => url && (
                    <img
                      key={j}
                      src={url}
                      alt={`Picto ${j + 1}`}
                      className="w-16 h-16 object-contain border border-gray-200 rounded bg-gray-50"
                      data-testid={`summary-picto-${i}-${j}`}
                    />
                  ))}
                  {(!article.picto?.images?.length) && (
                    <div className="w-16 h-16 border border-dashed border-gray-200 rounded flex items-center justify-center">
                      <Image className="w-5 h-5 text-gray-300" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1">
                <p className="text-xs text-gray-400 mb-2 font-medium">Illustration</p>
                {article.illustration?.image ? (
                  <img
                    src={article.illustration.image}
                    alt="Illustration"
                    className="h-16 aspect-video object-cover border border-gray-200 rounded bg-gray-50"
                    data-testid={`summary-illustration-${i}`}
                  />
                ) : (
                  <div className="h-16 aspect-video border border-dashed border-gray-200 rounded flex items-center justify-center">
                    <Image className="w-5 h-5 text-gray-300" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center pt-2">
        <Button
          onClick={handleExport}
          className="h-12 px-8 text-base bg-[#3B9FE8] hover:bg-[#2563EB] text-white rounded-lg shadow-sm"
          data-testid="btn-export-zip"
        >
          <Download className="w-5 h-5 mr-2" />
          Télécharger le ZIP
        </Button>
      </div>
    </div>
  );
}
