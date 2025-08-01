import checkUserAccess from "../services/checkUserAccess";

export const filterMenuItems = async (menuItems, userId) => {
    const filteredMenuItems = await Promise.all(
        menuItems.map(async (menuItem) => {
            if (menuItem.requiredHabilitation) {
                const hasAccess = await checkUserAccess(userId, menuItem.requiredHabilitation);
                if (!hasAccess) {
                    return null; // Exclure cet item si l'accès est refusé
                }
            }

            // Vérifiez les enfants récursivement
            if (menuItem.children) {
                menuItem.children = await filterMenuItems(menuItem.children, userId);
                if (!menuItem.children.length) {
                    return null; // Exclure le parent si tous les enfants sont exclus
                }
            }

            return menuItem;
        })
    );

    return filteredMenuItems.filter(Boolean); // Supprimez les éléments `null`
};

