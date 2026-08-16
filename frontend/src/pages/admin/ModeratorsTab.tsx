import { useEffect, useState } from "react";
import { AlertCircle, Pencil, Plus, ShieldCheck, Trash2, UserCog, X } from "lucide-react";
import {
  listAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  type AdminUserOut,
  type AdminRole,
} from "../../api/adminUsers";
import { ApiError } from "../../api/client";

const ROLE_LABELS_FR: Record<AdminRole, string> = {
  admin: "Administrateur",
  moderator: "Modérateur",
};

interface FormState {
  email: string;
  full_name: string;
  password: string;
  role: AdminRole;
}

const emptyForm: FormState = { email: "", full_name: "", password: "", role: "moderator" };

export default function ModeratorsTab() {
  const [users, setUsers] = useState<AdminUserOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserOut | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    setErrorMessage(null);
    try {
      setUsers(await listAdminUsers());
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Impossible de charger les comptes.");
    } finally {
      setLoading(false);
    }
  }

  function openCreateForm() {
    setEditingUser(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEditForm(user: AdminUserOut) {
    setEditingUser(user);
    setForm({ email: user.email, full_name: user.full_name, password: "", role: user.role });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingUser(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!form.email.trim() || !form.full_name.trim()) {
      setErrorMessage("Email et nom complet sont obligatoires.");
      return;
    }
    if (!editingUser && form.password.length < 8) {
      setErrorMessage("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        const payload: Record<string, unknown> = {
          email: form.email.trim(),
          full_name: form.full_name.trim(),
          role: form.role,
        };
        if (form.password.trim()) payload.password = form.password.trim();
        const updated = await updateAdminUser(editingUser.id, payload);
        setUsers((current) => current.map((u) => (u.id === updated.id ? updated : u)));
      } else {
        const created = await createAdminUser({
          email: form.email.trim(),
          full_name: form.full_name.trim(),
          password: form.password.trim(),
          role: form.role,
        });
        setUsers((current) => [created, ...current]);
      }
      closeForm();
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Échec de l'enregistrement du compte.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(user: AdminUserOut) {
    setErrorMessage(null);
    try {
      const updated = await updateAdminUser(user.id, { is_active: !user.is_active });
      setUsers((current) => current.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Échec de la mise à jour du statut.");
    }
  }

  async function handleDelete(user: AdminUserOut) {
    if (!confirm(`Supprimer le compte de ${user.full_name} ? Cette action ne peut pas être annulée.`)) return;
    setDeletingId(user.id);
    setErrorMessage(null);
    try {
      await deleteAdminUser(user.id);
      setUsers((current) => current.filter((u) => u.id !== user.id));
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Échec de la suppression du compte.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {users.length} compte{users.length !== 1 ? "s" : ""} back-office
        </p>
        <button
          onClick={openCreateForm}
          className="inline-flex items-center gap-1.5 bg-primary text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-blue-900 transition-colors"
        >
          <Plus size={14} /> Nouveau compte
        </button>
      </div>

      {errorMessage && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary border-b border-border">
              <tr>
                {["Nom", "Email", "Rôle", "Statut", "Actions"].map((h) => (
                  <th key={h} className="text-left text-xs text-muted-foreground font-semibold px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    Chargement des comptes...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    Aucun compte trouvé.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-secondary/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground">{user.full_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          user.role === "admin"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-orange-100 text-orange-600"
                        }`}
                      >
                        {user.role === "admin" ? <ShieldCheck size={11} /> : <UserCog size={11} />}
                        {ROLE_LABELS_FR[user.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                          user.is_active
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-red-100 text-red-600 hover:bg-red-200"
                        }`}
                      >
                        {user.is_active ? "Actif" : "Désactivé"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditForm(user)}
                          className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-secondary"
                          title="Modifier"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          disabled={deletingId === user.id}
                          className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-40"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-bold text-foreground">
                {editingUser ? "Modifier le compte" : "Nouveau compte"}
              </h3>
              <button
                onClick={closeForm}
                className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Nom complet *</label>
                <input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  required
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  {editingUser ? "Nouveau mot de passe (laisser vide pour ne pas changer)" : "Mot de passe *"}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!editingUser}
                  minLength={8}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Rôle *</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as AdminRole })}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:border-primary"
                >
                  <option value="moderator">Modérateur</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-primary text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-blue-900 transition-colors disabled:opacity-60"
                >
                  {saving ? "Enregistrement..." : editingUser ? "Enregistrer" : "Créer le compte"}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-5 border border-border text-sm rounded-lg hover:border-primary transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}