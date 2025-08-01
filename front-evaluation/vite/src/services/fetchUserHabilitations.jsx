import { authInstance } from "../axiosConfig";

const fetchUserHabilitations = async (userId) => {
    try {
        const response = await authInstance.get(`/User/user-habilitations/${userId}`);
        if (response.data && response.data.habilitations) {
            // console.log("Habilitations récupérées :", response.data.habilitations);
            return response.data.habilitations;
        }
        console.warn("Aucune habilitation trouvée pour cet utilisateur.");
        return [];
    } catch (error) {
        console.error("Erreur lors de la récupération des habilitations :", error);
        return [];
    }
};

export default fetchUserHabilitations;