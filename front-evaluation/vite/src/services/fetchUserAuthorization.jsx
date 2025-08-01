import { formulaireInstance } from "../axiosConfig";

const fetchUserAuthorization = async (userId, requiredHabilitationAdminId) => {
    // console.log("Appel à fetchUserAuthorization avec :", { userId, requiredHabilitationAdminId });
    try {
        const response = await formulaireInstance.get(`/Periode/test-authorization`,
            {
                params: {
                    userId,
                    requiredHabilitationAdminId
                }
            }
        );
        return response.data.hasAccess;
    } catch (error) {
        console.error(
            "Erreur lors de la vérification de l'autorisation:",
            error
        );
        return false; 
    }
};

export default fetchUserAuthorization;