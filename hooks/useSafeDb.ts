import { db, safeAdd, safeUpdate, safeDelete, toggleFavorite } from '@/lib/db';
import { useHapticFeedback } from '@/lib/haptics';

export function useSafeDb() {
  const haptic = useHapticFeedback();

  const add = async (doc: Parameters<typeof safeAdd>[0]) => {
    try {
      const id = await safeAdd(doc);
      haptic.trigger('success');
      return id;
    } catch (error) {
      haptic.trigger('error');
      console.error('Erro ao adicionar documento:', error);
      throw error;
    }
  };

  const update = async (id: number, changes: Parameters<typeof safeUpdate>[1]) => {
    try {
      await safeUpdate(id, changes);
      haptic.trigger('vibrate');
    } catch (error) {
      haptic.trigger('error');
      console.error('Erro ao atualizar documento:', error);
      throw error;
    }
  };

  const remove = async (id: number) => {
    try {
      await safeDelete(id);
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

  return { add, update, remove, favorite };
}