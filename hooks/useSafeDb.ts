import { db, safeAddPerson, safeAddDocument, safeUpdateDocument, safeDeleteDocument, toggleFavorite } from '@/lib/db';
import { useHapticFeedback } from '@/lib/haptics';

export function useSafeDb() {
  const haptic = useHapticFeedback();

  const addPerson = async (person: Parameters<typeof safeAddPerson>[0]) => {
    try {
      const id = await safeAddPerson(person);
      haptic.trigger('success');
      return id;
    } catch (error) {
      haptic.trigger('error');
      console.error('Erro ao adicionar pessoa:', error);
      throw error;
    }
  };

  const addDocument = async (doc: Parameters<typeof safeAddDocument>[0]) => {
    try {
      const id = await safeAddDocument(doc);
      haptic.trigger('success');
      return id;
    } catch (error) {
      haptic.trigger('error');
      console.error('Erro ao adicionar documento:', error);
      throw error;
    }
  };

  const updateDocument = async (id: number, changes: Parameters<typeof safeUpdateDocument>[1]) => {
    try {
      await safeUpdateDocument(id, changes);
      haptic.trigger('vibrate');
    } catch (error) {
      haptic.trigger('error');
      console.error('Erro ao atualizar documento:', error);
      throw error;
    }
  };

  const deleteDocument = async (id: number) => {
    try {
      await safeDeleteDocument(id);
      haptic.trigger('vibrate');
    } catch (error) {
      haptic.trigger('error');
      console.error('Erro ao deletar documento:', error);
      throw error;
    }
  };

  const favorite = async (id: number) => {
    try {
      await toggleFavorite(id);
      haptic.trigger('vibrate');
    } catch (error) {
      console.error('Erro ao favoritar:', error);
      throw error;
    }
  };

  return { addPerson, addDocument, updateDocument, deleteDocument, favorite };
}