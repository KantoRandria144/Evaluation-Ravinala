import { authInstance } from "axiosConfig";

const AuditService = {
  /**
   * Envoie une action d'audit au backend.
   * @param {string} userId - Identifiant de l'utilisateur
   * @param {string} action - Action effectuée (INSERT, UPDATE, DELETE...)
   * @param {string|null} tableName - Nom de la table concernée
   * @param {string|null} recordId - Id du record concerné
   * @param {object|null} oldValues - Valeurs avant modification (objet)
   * @param {object|null} newValues - Valeurs après modification (objet)
   */
  getAllLogs: async () => {
    const response = await authInstance.get("/Audit/getAll");
    return response.data;
  },

  async logAction(userId, action, tableName = null, recordId = null, oldValues = null, newValues = null) {
    try {
      const response = await authInstance.post("/Audit/log", {
        userId,
        action,
        tableName,
        recordId: recordId ? JSON.stringify(recordId) : null,
        oldValues: oldValues ? JSON.stringify(oldValues) : null,
        newValues: newValues ? JSON.stringify(newValues) : null,
      });

      return {
        success: true,
        message: response.data.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to log action",
      };
    }
  },
};

export default AuditService;
