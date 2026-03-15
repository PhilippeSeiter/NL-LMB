import axios from "axios";
import { Button } from "@/components/ui/button";
import { Download, FileText, Image } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SessionRecap({ session }) {
  const handleExport = () => {
    window.location.href = `${API}/sessions/${session.id}/export`;
  };

  const handleExportWord = () => {
    window.location.href = `${API}/sessions/${session.id}/export-word`;
  };

  const pictoCount = session.articles.reduce(
    (acc, a) => acc + (a.picto?.images?.filter(Boolean).length || 0), 0
  );
  const illusCount = session.articles.filter(a => a.illustration?.image).length;

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Récapitulatif de session
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">{session.titre}</p>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <p className="text-xl font-bold text-[#3B1FA8]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {session.articles.length}
            </p>
            <p className="text-xs text-gray-400">articles</p>
          </div>
          <div>
            <p className="text-xl font-bold text-[#3B9FE8]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {pictoCount}
            </p>
            <p className="text-xs text-gray-400">pictos</p>
          </div>
          <div>
            <p className="text-xl font-bold text-[#10B981]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {illusCount}
            </p>
            <p className="text-xs text-gray-400">illustrations</p>
          </div>
        </div>
      </div>

      {/* Grille articles */}
      <div className="space-y-4" data-testid="recap-grid">
        {session.articles.map((article, i) => (
          <div
            key={i}
            className="bg-white border border-gray-200 rounded-xl overflow-hidden"
            data-testid={`recap-article-${i}`}
          >
            {/* Titre article */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
              <span className="text-xs font-mono text-gray-400">
                #{String(article.index).padStart(2, "0")}
              </span>
              <p className="font-semibold text-gray-800 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {article.titre}
              </p>
            </div>

            <div className="p-4 grid grid-cols-3 gap-4">
              {/* Picto 1 */}
              <div>
                <p className="text-xs text-gray-400 mb-2 font-medium">Picto 1</p>
                {article.picto?.images?.[0] ? (
                  <img
                    src={article.picto.images[0]}
                    alt="Picto 1"
                    className="w-full aspect-square object-contain border border-gray-100 rounded-lg bg-gray-50"
                    data-testid={`recap-picto1-${i}`}
                  />
                ) : (
                  <Placeholder />
                )}
              </div>

              {/* Picto 2 */}
              <div>
                <p className="text-xs text-gray-400 mb-2 font-medium">Picto 2</p>
                {article.picto?.images?.[1] ? (
                  <img
                    src={article.picto.images[1]}
                    alt="Picto 2"
                    className="w-full aspect-square object-contain border border-gray-100 rounded-lg bg-gray-50"
                    data-testid={`recap-picto2-${i}`}
                  />
                ) : (
                  <Placeholder />
                )}
              </div>

              {/* Illustration */}
              <div>
                <p className="text-xs text-gray-400 mb-2 font-medium">Illustration 16/9</p>
                {article.illustration?.image ? (
                  <img
                    src={article.illustration.image}
                    alt="Illustration"
                    className="w-full aspect-video object-cover border border-gray-100 rounded-lg bg-gray-50"
                    data-testid={`recap-illus-${i}`}
                  />
                ) : (
                  <Placeholder ratio="video" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Export */}
      <div className="flex flex-wrap justify-center gap-3 pt-2 pb-6">
        <Button
          onClick={handleExport}
          className="h-12 px-10 text-base bg-[#3B9FE8] hover:bg-[#2563EB] text-white rounded-lg shadow-sm"
          data-testid="btn-export-zip"
        >
          <Download className="w-5 h-5 mr-2" />
          Exporter le ZIP
        </Button>
        <Button
          onClick={handleExportWord}
          variant="outline"
          className="h-12 px-10 text-base border-[#3B1FA8] text-[#3B1FA8] hover:bg-[#3B1FA8] hover:text-white rounded-lg shadow-sm"
          data-testid="btn-export-word"
        >
          <FileText className="w-5 h-5 mr-2" />
          Exporter Word
        </Button>
      </div>
    </div>
  );
}

function Placeholder({ ratio = "square" }) {
  return (
    <div className={`w-full ${ratio === "video" ? "aspect-video" : "aspect-square"} border border-dashed border-gray-200 rounded-lg flex items-center justify-center bg-gray-50`}>
      <Image className="w-5 h-5 text-gray-300" />
    </div>
  );
}
