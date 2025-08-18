import { authInstance } from "axiosConfig";

const AuditService = {
  async logAction(userId, action, tableName = null, recordId = null) {
    try {
      const response = await authInstance.post('/Audit/log', {
        userId,
        action,
        tableName,
        recordId
      });

      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to log action'
      };
    }
  }
};

export default AuditService;