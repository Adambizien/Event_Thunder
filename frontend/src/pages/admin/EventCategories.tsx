import { useEffect, useState } from 'react';
import AdminPageHeader from '../../components/AdminPageHeader';
import EventCategoryFormModal from '../../components/EventCategoryFormModal';
import UniformTable from '../../components/UniformTable';
import { eventCategoryService } from '../../services/EventCategoryService';
import type { EventCategory } from '../../types/EventCategoryTypes';

const formatDate = (dateValue: string) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('fr-FR');
};

const AdminEventCategories = () => {
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [name, setName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(
    null,
  );
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await eventCategoryService.fetchCategories();
      setCategories(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('Le nom de la catégorie est requis');
      return;
    }

    try {
      setSubmitting(true);
      if (editingCategoryId) {
        await eventCategoryService.updateCategory(editingCategoryId, trimmedName);
      } else {
        await eventCategoryService.createCategory(trimmedName);
      }
      setName('');
      setEditingCategoryId(null);
      setFormError(null);
      setShowForm(false);
      await fetchCategories();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setEditingCategoryId(null);
    setFormError(null);
    setShowForm(false);
  };

  const handleEdit = (category: EventCategory) => {
    setName(category.name);
    setEditingCategoryId(category.id);
    setFormError(null);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimér cette catégorie ?')) return;

    setDeletingCategoryId(id);
    try {
      await eventCategoryService.deleteCategory(id);
      setError(null);
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setDeletingCategoryId(null);
    }
  };

  const filteredCategories = categories
    .filter((category) => {
      const normalizedName = category.name.toLowerCase();
      const searchWords = searchTerm
        .toLowerCase()
        .split(' ')
        .filter(Boolean);
      const matchesSearch = searchWords.every((word) =>
        normalizedName.includes(word),
      );

      return matchesSearch;
    })
    .sort((first, second) => {
      const compared = first.name.localeCompare(second.name, 'fr', {
        sensitivity: 'base',
      });
      return sortOrder === 'asc' ? compared : -compared;
    });

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-gray-300 shadow-2xl backdrop-blur-lg">
        <span className="spinner mr-2 align-middle"></span>
        Chargement des catégories...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Catégories d'événements"
        subtitle="Créez et consultez les catégories disponibles"
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full md:w-auto bg-white/15 hover:bg-white/25 border border-white/30 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Nouvelle catégorie
          </button>
        }
      />

      {error && (
        <div className="rounded-xl border border-red-500/50 bg-red-500/30 p-4 text-red-300">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Rechercher
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nom de catégorie..."
              className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tri
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
            >
              <option value="asc">Nom (A → Z)</option>
              <option value="desc">Nom (Z → A)</option>
            </select>
          </div>
        </div>
      </div>

      <EventCategoryFormModal
        isOpen={showForm}
        isEditing={Boolean(editingCategoryId)}
        name={name}
        formError={formError}
        submitting={submitting}
        onClose={resetForm}
        onSubmit={handleSubmit}
        onNameChange={setName}
      />

      {/* Categories Table */}
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden shadow-2xl backdrop-blur-lg">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">
              {categories.length === 0
                ? 'Aucune catégorie trouvée'
                : 'Aucune catégorie ne correspond à votre recherche'}
            </p>
          </div>
        ) : (
          <UniformTable
            headers={['Nom', 'Date de création', 'Date de mise à jour', 'Actions']}
            tableClassName="min-w-[640px] w-full"
            headerCellClassName="px-4 py-3 text-left text-xs font-semibold text-gray-300 sm:px-6 sm:py-4 sm:text-sm"
          >
            {filteredCategories.map((category) => {
              const isDeleting = deletingCategoryId === category.id;

              return (
                <tr
                  key={category.id}
                  className={`border-b border-white/10 transition-colors ${isDeleting ? 'opacity-60 pointer-events-none' : 'hover:bg-white/5'}`}
                >
                  <td className="px-4 py-3 sm:px-6 sm:py-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium text-white">{category.name}</p>
                        <p className="text-xs text-gray-400">{category.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 sm:px-6 sm:py-4 text-gray-300">
                    {formatDate(category.created_at)}
                  </td>
                  <td className="px-4 py-3 sm:px-6 sm:py-4 text-gray-300">
                    {formatDate(category.updated_at)}
                  </td>
                  <td className="px-4 py-3 sm:px-6 sm:py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleEdit(category)}
                        className="w-full sm:w-auto bg-white/15 hover:bg-white/25 border border-white/30 text-white px-4 py-2 rounded transition-colors"
                        disabled={isDeleting}
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="w-full sm:w-auto bg-red-500/25 hover:bg-red-500/30 border border-red-500/50 text-red-200 px-4 py-2 rounded transition-colors"
                        disabled={isDeleting}
                      >
                        {isDeleting ? 'Suppression...' : 'Supprimer'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </UniformTable>
        )}
      </div>
    </div>
  );
};

export default AdminEventCategories;
