import React, { useEffect, useState } from "react";
import { Typography, Box, Skeleton } from "@mui/material";
import NavGroup from "./NavGroup";
import menuItem from "menu-items";
import { useAuthorization } from "../../../../context/AuthorizationContext"; // Importer le contexte
import { filterMenuItems } from "../../../../utils/filterMenuItems"; // Importer la fonction de filtrage

// ==============================|| SIDEBAR MENU LIST ||============================== //

const MenuList = () => {
  const { habilitations } = useAuthorization(); // Récupérer les habilitations
  const [filteredMenuItems, setFilteredMenuItems] = useState([]); // État pour les menus filtrés
  const [loading, setLoading] = useState(true); // État pour indiquer le chargement

  useEffect(() => {
    const fetchFilteredMenuItems = async () => {
      const userId = JSON.parse(localStorage.getItem("user"))?.id; // Récupérer l'ID utilisateur
      if (userId) {
        setLoading(true); // Début du chargement
        const filteredItems = await filterMenuItems(menuItem.items, userId);
        setFilteredMenuItems(filteredItems); // Mettre à jour les menus filtrés
        setLoading(false); // Fin du chargement
      }
    };

    fetchFilteredMenuItems();
  }, [habilitations]); // Recalculer si les habilitations changent

  if (loading) {
    // Composant Skeleton pendant le chargement
    return (
      <Box sx={{ p: 2 }}>
        {[1, 2, 3, 4].map((index) => (
          <Skeleton key={index} height={40} sx={{ mb: 1 }} />
        ))}
      </Box>
    );
  }

  // Mapper les items filtrés
  const navItems = filteredMenuItems.map((item) => {
    switch (item.type) {
      case "group":
        return <NavGroup key={item.id} item={item} />;
      default:
        return (
          <Typography key={item.id} variant="h6" color="error" align="center">
            Menu Items Error
          </Typography>
        );
    }
  });

  return <>{navItems}</>;
};

export default MenuList;
