import { LocalNotifications } from '@capacitor/local-notifications';

// ============================================================
// NOTIFICAÇÕES DE VENCIMENTO DE DOCUMENTOS
// ============================================================

/**
 * Agenda uma notificação local para quando um documento estiver próximo do vencimento
 * @param documentId - ID do documento (string - UUID)
 * @param title - Título do documento
 * @param expiryDate - Data de vencimento (formato YYYY-MM-DD)
 * @param categoryName - Nome da categoria
 * @param daysBefore - Dias de antecedência para notificar (padrão: 30)
 */
export async function scheduleDocumentExpiryNotification(
  documentId: string,
  title: string,
  expiryDate: string,
  categoryName: string,
  daysBefore: number = 30
): Promise<void> {
  // Verifica se está no ambiente web (não suporta notificações locais)
  if (typeof window !== 'undefined' && !('cordova' in window)) {
    console.log('📱 Notificação programada para:', title);
    return;
  }

  try {
    const expiry = new Date(expiryDate);
    const notificationDate = new Date(expiry);
    notificationDate.setDate(notificationDate.getDate() - daysBefore);

    if (notificationDate > new Date()) {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Math.random() * 1000000), // Usa ID aleatório
            title: '📄 Documento vencendo em breve',
            body: `${title} (${categoryName}) vence em ${expiryDate}`,
            schedule: {
              at: notificationDate,
            },
            sound: 'default',
            extra: {
              type: 'document_expiry',
              docId: documentId,
            },
          },
        ],
      });
      console.log('✅ Notificação agendada para:', notificationDate);
    }
  } catch (error) {
    console.error('❌ Erro ao agendar notificação:', error);
  }
}

// ============================================================
// NOTIFICAÇÕES DE RENOVAÇÃO DE MEDICAMENTOS
// ============================================================

/**
 * Agenda uma notificação local para renovação de medicamento
 * @param medicamentoId - ID do medicamento (string - UUID)
 * @param nome - Nome do medicamento
 * @param dataRenovacao - Data de renovação
 * @param medico - Nome do médico
 * @param daysBefore - Dias de antecedência (padrão: 7)
 */
export async function scheduleMedicationRenewalNotification(
  medicamentoId: string,
  nome: string,
  dataRenovacao: string,
  medico: string,
  daysBefore: number = 7
): Promise<void> {
  if (typeof window !== 'undefined' && !('cordova' in window)) {
    console.log('📱 Notificação de renovação programada para:', nome);
    return;
  }

  try {
    const renewal = new Date(dataRenovacao);
    const notificationDate = new Date(renewal);
    notificationDate.setDate(notificationDate.getDate() - daysBefore);

    if (notificationDate > new Date()) {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Math.random() * 1000000),
            title: '💊 Medicamento precisa ser renovado',
            body: `${nome} - Dr(a). ${medico}`,
            schedule: {
              at: notificationDate,
            },
            sound: 'default',
            extra: {
              type: 'medication_renewal',
              medicamentoId: medicamentoId,
            },
          },
        ],
      });
      console.log('✅ Notificação de renovação agendada para:', notificationDate);
    }
  } catch (error) {
    console.error('❌ Erro ao agendar notificação de renovação:', error);
  }
}

// ============================================================
// LIMPAR NOTIFICAÇÕES
// ============================================================

/**
 * Remove uma notificação local
 * @param notificationId - ID da notificação
 */
export async function cancelNotification(notificationId: number): Promise<void> {
  if (typeof window !== 'undefined' && !('cordova' in window)) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
  } catch (error) {
    console.error('❌ Erro ao cancelar notificação:', error);
  }
}

/**
 * Remove todas as notificações locais
 */
export async function cancelAllNotifications(): Promise<void> {
  if (typeof window !== 'undefined' && !('cordova' in window)) return;
  try {
    await LocalNotifications.cancelAll();
  } catch (error) {
    console.error('❌ Erro ao cancelar todas as notificações:', error);
  }
}