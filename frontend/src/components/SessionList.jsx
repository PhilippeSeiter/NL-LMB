import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FolderOpen, Pencil, Trash2, Loader2, Plus } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_lmb-illustrations/artifacts/xiaswxau_avatar%20logo%20artyplanet%20d.png";

export default function SessionList() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [titleDraft, setTitleDraft] = useState("");

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const resp = await axios.get(`${API}/sessions`);
      setSessions(resp.data);
    } catch (e) {
      console.error("Erreur chargement sessions", e);
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Supprimer cette session ?")) return;
    try {
      await axios.delete(`${API}/sessions/${id}`);
      setSessions(sessions.filter(s => s.id !== id));
      toast.success("Session supprimée.");
    } catch {
      toast.error("Impossible de supprimer la session.");
    }
  };

  const handleRenameStart = (id, titre, e) => {
    e.stopPropagation();
    setEditingId(id);
    setTitleDraft(titre);
  };

  const handleRenameConfirm = async (id) => {
    const newTitre = titleDraft.trim();
    setEditingId(null);
    if (!newTitre || newTitre === sessions.find(s => s.id === id)?.titre) return;
    try {
      await axios.put(`${API}/sessions/${id}`, { titre: newTitre });
      setSessions(sessions.map(s => s.id === id ? { ...s, titre: newTitre } : s));
      toast.success("Session renommée.");
    } catch {
      toast.error("Impossible de renommer la session.");
    }
  };

  const handleRenameKeyDown = (e, id) => {
    if (e.key === "Enter") { e.preventDefault(); handleRenameConfirm(id); }
    if (e.key === "Escape") { e.stopPropagation(); setEditingId(null); }
  };

  const formatDate = (iso) => {
    try {
      return new Date(iso).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <img src={LOGO_URL} alt="Artyplanet" className="w-8 h-8 object-contain" />
        <span className="font-bold text-[#3B1FA8] text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Les Maîtres Bâtisseurs
        </span>
        <div className="ml-auto flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-gray-500 hover:text-gray-800"
            data-testid="btn-back-home"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Accueil
          </Button>
          <Button
            onClick={() => navigate("/session/new")}
            className="bg-[#3B9FE8] hover:bg-[#2563EB] text-white"
            data-testid="btn-new-session"
          >
            <Plus className="w-4 h-4 mr-1" /> Nouvelle session
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 fade-in">
        <h2 className="text-2xl font-bold text-[#0F172A] mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Sessions sauvegardées
        </h2>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 spin text-[#3B9FE8]" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20 text-gray-400" data-testid="no-sessions">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucune session enregistrée.</p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="sessions-list">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="bg-white border border-gray-200 rounded-lg px-5 py-4 flex items-center gap-4 hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => navigate(`/session/${session.id}`)}
                data-testid={`session-item-${session.id}`}
              >
                <div className="flex-1 min-w-0">
                  {editingId === session.id ? (
                    <input
                      autoFocus
                      value={titleDraft}
                      onChange={e => setTitleDraft(e.target.value)}
                      onBlur={() => handleRenameConfirm(session.id)}
                      onKeyDown={e => handleRenameKeyDown(e, session.id)}
                      onClick={e => e.stopPropagation()}
                      className="font-semibold text-[#0F172A] bg-transparent border-b border-[#3B9FE8] outline-none w-full"
                      style={{ fontFamily: 'Manrope, sans-serif' }}
                      data-testid={`session-title-input-${session.id}`}
                    />
                  ) : (
                    <div className="flex items-center gap-1.5 group">
                      <p className="font-semibold text-[#0F172A] truncate" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        {session.titre}
                      </p>
                      <button
                        onClick={e => handleRenameStart(session.id, session.titre, e)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-[#3B9FE8] transition-opacity flex-shrink-0"
                        data-testid={`btn-rename-${session.id}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <p className="text-sm text-gray-400 mt-0.5">
                    {formatDate(session.date_creation)} — {session.articles?.length || 0} article(s)
                  </p>
                </div>

                <Badge
                  variant="outline"
                  className={
                    session.statut === "terminee"
                      ? "border-green-200 text-green-700 bg-green-50"
                      : "border-blue-200 text-blue-700 bg-blue-50"
                  }
                  data-testid={`session-status-${session.id}`}
                >
                  {session.statut === "terminee" ? "Terminée" : "En cours"}
                </Badge>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => deleteSession(session.id, e)}
                  className="text-gray-300 hover:text-red-500 flex-shrink-0"
                  data-testid={`btn-delete-session-${session.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
