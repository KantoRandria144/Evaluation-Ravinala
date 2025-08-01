import fetchUserHabilitations from "./fetchUserHabilitations";
import fetchUserAuthorization from "./fetchUserAuthorization";

const checkUserAccess = async (userId, requiredHabilitationAdminId) => {
    return true;
    // const habilitations = await fetchUserHabilitations(userId);


    // const hasRequiredHabilitation = habilitations.some((habilitation) =>
    //     habilitation.habilitationAdmins.some((admin) => admin.id === requiredHabilitationAdminId)
    // );


    // if (!hasRequiredHabilitation) {
    //     // console.warn(`L'utilisateur n'a pas l'habilitation ID : ${requiredHabilitationAdminId}`);
    //     return false;
    // }

    // const hasAccess = await fetchUserAuthorization(userId, requiredHabilitationAdminId);
    // return hasAccess;
};

export default checkUserAccess;