// using OfficeOpenXml;
// using OfficeOpenXml.Style;
// using System;
// using System.Collections.Generic;
// using System.Drawing;
// using System.IO;

// class Program
// {
//     static void Main(string[] args)
//     {
//         // Chemins des fichiers
//         string inputFilePath = @"D:\donne.xlsx"; // Chemin du fichier d'entrée
//         string outputFilePath = @"D:\sortie.xlsx"; // Chemin du fichier de sortie

//         try
//         {
//             // Définir le contexte de licence pour EPPlus (nécessaire pour les versions récentes d'EPPlus)
//             ExcelPackage.LicenseContext = LicenseContext.NonCommercial;

//             // Vérifiez que le fichier d'entrée existe
//             if (!File.Exists(inputFilePath))
//             {
//                 Console.WriteLine($"Erreur : Le fichier d'entrée n'a pas été trouvé : {inputFilePath}");
//                 return;
//             }

//             // Charger le fichier Excel d'entrée
//             using (var package = new ExcelPackage(new FileInfo(inputFilePath)))
//             {
//                 if (package.Workbook.Worksheets.Count == 0)
//                 {
//                     Console.WriteLine("Erreur : Le fichier d'entrée ne contient aucune feuille.");
//                     return;
//                 }

//                 var worksheet = package.Workbook.Worksheets[0]; // Accéder à la première feuille

//                 // Vérifier si le fichier n'est pas vide
//                 if (worksheet.Dimension == null)
//                 {
//                     Console.WriteLine("Erreur : Le fichier d'entrée est vide.");
//                     return;
//                 }

//                 Console.WriteLine($"Nombre de lignes dans le fichier d'entrée : {worksheet.Dimension.End.Row}");
//                 Console.WriteLine($"Nombre de colonnes dans le fichier d'entrée : {worksheet.Dimension.End.Column}");

//                 // Déterminer la dernière ligne avec des données réelles
//                 int lastRow = FindLastDataRow(worksheet);
//                 Console.WriteLine($"Dernière ligne avec des données : {lastRow}");

//                 // Créer une liste pour stocker les lignes transformées
//                 var transformedRows = new List<List<object>>();

//                 // Parcourir les lignes du fichier Excel à partir de la ligne 4 jusqu'à la dernière ligne avec des données
//                 for (int row = 4; row <= lastRow; row++)
//                 {
//                     string matricule = worksheet.Cells[row, 1].Text.Trim(); // Matricule dans la colonne 1

//                     // Vérifier si le matricule est valide
//                     if (!string.IsNullOrEmpty(matricule))
//                     {
//                         Console.WriteLine($"Traitement de la ligne {row} pour le matricule : {matricule}");

//                         bool hasValidIM = false;

//                         // Lire les valeurs IM, RA IM et Real IM pour les 3 ensembles
//                         for (int i = 0; i < 3; i++)
//                         {
//                             int baseCol = 2 + (i * 3); // Colonnes 2, 5, 8 pour IM1, IM2, IM3

//                             // Vérifier que les colonnes existent
//                             if (baseCol + 2 > worksheet.Dimension.End.Column)
//                             {
//                                 Console.WriteLine($"  Erreur : La ligne {row} ne contient pas assez de colonnes pour IM{i + 1}.");
//                                 continue;
//                             }

//                             string im = worksheet.Cells[row, baseCol].Text.Trim();
//                             string raIM = worksheet.Cells[row, baseCol + 1].Text.Trim();
//                             string realIM = worksheet.Cells[row, baseCol + 2].Text.Trim().Replace("%", ""); // Suppression du '%'

//                             Console.WriteLine($"  IM{i + 1} : '{im}', RA IM{i + 1} : '{raIM}', Real IM{i + 1} : '{realIM}'");

//                             // Ajouter uniquement si IM n'est pas vide
//                             if (!string.IsNullOrEmpty(im))
//                             {
//                                 transformedRows.Add(new List<object> { matricule, im, raIM, realIM });
//                                 hasValidIM = true;
//                             }
//                         }

//                         if (!hasValidIM)
//                         {
//                             Console.WriteLine($"  Avertissement : Aucun IM valide trouvé pour le matricule {matricule} à la ligne {row}.");
//                         }
//                     }
//                     else
//                     {
//                         Console.WriteLine($"  Avertissement : La ligne {row} a un matricule vide. Ignorée.");
//                     }
//                 }

//                 Console.WriteLine($"Nombre de lignes transformées : {transformedRows.Count}");

//                 if (transformedRows.Count == 0)
//                 {
//                     Console.WriteLine("Aucune donnée n'a été transformée. Vérifiez les données d'entrée.");
//                 }
//                 else
//                 {
//                     // Créer une nouvelle feuille pour stocker les données transformées
//                     using (var outputPackage = new ExcelPackage())
//                     {
//                         var transformedWorksheet = outputPackage.Workbook.Worksheets.Add("Transformed Data");

//                         // Ajouter les en-têtes de colonnes
//                         transformedWorksheet.Cells[1, 1].Value = "Matricule";
//                         transformedWorksheet.Cells[1, 2].Value = "Name";
//                         transformedWorksheet.Cells[1, 3].Value = "ResultText";
//                         transformedWorksheet.Cells[1, 4].Value = "Result";

//                         // Appliquer un style gras aux en-têtes
//                         using (var headerRange = transformedWorksheet.Cells[1, 1, 1, 4])
//                         {
//                             headerRange.Style.Font.Bold = true;
//                             headerRange.Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
//                             headerRange.Style.VerticalAlignment = ExcelVerticalAlignment.Center;
//                             headerRange.Style.Fill.PatternType = ExcelFillStyle.Solid;
//                             headerRange.Style.Fill.BackgroundColor.SetColor(Color.LightGray);
//                         }

//                         // Insérer les données transformées dans la feuille
//                         int rowIndex = 2; // Début des données à la ligne 2
//                         foreach (var rowData in transformedRows)
//                         {
//                             transformedWorksheet.Cells[rowIndex, 1].Value = rowData[0]; // Matricule
//                             transformedWorksheet.Cells[rowIndex, 2].Value = rowData[1]; // Name (IM)
//                             transformedWorksheet.Cells[rowIndex, 3].Value = rowData[2]; // ResultText (RA IM)
//                             transformedWorksheet.Cells[rowIndex, 4].Value = rowData[3]; // Result (Real IM)
//                             rowIndex++;
//                         }

//                         // Définir l'alignement pour toutes les données
//                         using (var dataRange = transformedWorksheet.Cells[2, 1, rowIndex - 1, 4])
//                         {
//                             dataRange.Style.HorizontalAlignment = ExcelHorizontalAlignment.Left;
//                             dataRange.Style.VerticalAlignment = ExcelVerticalAlignment.Top;
//                             dataRange.Style.WrapText = true;
//                         }

//                         // Exemple : Aligner la colonne "Result" à droite
//                         transformedWorksheet.Column(4).Style.HorizontalAlignment = ExcelHorizontalAlignment.Right;

//                         // Ajuster la largeur des colonnes pour une meilleure lisibilité
//                         transformedWorksheet.Cells[transformedWorksheet.Dimension.Address].AutoFitColumns();

//                         // Sauvegarder le fichier Excel transformé
//                         outputPackage.SaveAs(new FileInfo(outputFilePath));
//                     }

//                     Console.WriteLine("Transformation terminée et fichier sauvegardé.");
//                 }
//             }
//         }
//         catch (Exception ex)
//         {
//             Console.WriteLine($"Une erreur est survenue : {ex.Message}");
//         }
//     } // Fin de la méthode Main

//     /// <summary>
//     /// Trouve la dernière ligne contenant des données réelles dans la feuille de calcul.
//     /// </summary>
//     /// <param name="worksheet">La feuille de calcul Excel.</param>
//     /// <returns>Le numéro de la dernière ligne avec des données.</returns>
//     static int FindLastDataRow(ExcelWorksheet worksheet)
//     {
//         int lastRow = worksheet.Dimension.End.Row;

//         for (int row = lastRow; row >= 1; row--)
//         {
//             bool isEmpty = true;
//             for (int col = 1; col <= worksheet.Dimension.End.Column; col++)
//             {
//                 if (!string.IsNullOrEmpty(worksheet.Cells[row, col].Text.Trim()))
//                 {
//                     isEmpty = false;
//                     break;
//                 }
//             }

//             if (!isEmpty)
//             {
//                 return row;
//             }
//         }

//         return lastRow;
//     }
// }

// using OfficeOpenXml;
// using OfficeOpenXml.Style;
// using System;
// using System.Collections.Generic;
// using System.Drawing;
// using System.IO;

// class Program
// {
//     static void Main(string[] args)
//     {
//         // Chemins des fichiers
//         string inputFilePath = @"D:\competence.xlsx"; // Chemin du fichier d'entrée
//         string outputFilePath = @"D:\sortieCompetence.xlsx";    // Chemin du fichier de sortie

//         // Définir l'année (peut être dynamique si nécessaire)
//         string annee = "2024";

//         try
//         {
//             // Définir le contexte de licence pour EPPlus (nécessaire pour les versions récentes d'EPPlus)
//             ExcelPackage.LicenseContext = LicenseContext.NonCommercial;

//             // Vérifiez que le fichier d'entrée existe
//             if (!File.Exists(inputFilePath))
//             {
//                 Console.WriteLine($"Erreur : Le fichier d'entrée n'a pas été trouvé : {inputFilePath}");
//                 return;
//             }

//             // Charger le fichier Excel d'entrée
//             using (var package = new ExcelPackage(new FileInfo(inputFilePath)))
//             {
//                 if (package.Workbook.Worksheets.Count == 0)
//                 {
//                     Console.WriteLine("Erreur : Le fichier d'entrée ne contient aucune feuille.");
//                     return;
//                 }

//                 var worksheet = package.Workbook.Worksheets[0]; // Accéder à la première feuille

//                 // Vérifier si le fichier n'est pas vide
//                 if (worksheet.Dimension == null)
//                 {
//                     Console.WriteLine("Erreur : Le fichier d'entrée est vide.");
//                     return;
//                 }

//                 Console.WriteLine($"Nombre de lignes dans le fichier d'entrée : {worksheet.Dimension.End.Row}");
//                 Console.WriteLine($"Nombre de colonnes dans le fichier d'entrée : {worksheet.Dimension.End.Column}");

//                 // Dynamiser la détection de la ligne d'en-tête en recherchant "Matricule" dans la première colonne
//                 int headerRow = FindHeaderRow(worksheet, "Matricule");
//                 if (headerRow == -1)
//                 {
//                     Console.WriteLine("Erreur : La ligne d'en-tête contenant 'Matricule' n'a pas été trouvée.");
//                     return;
//                 }

//                 Console.WriteLine($"Ligne d'en-tête trouvée à la ligne : {headerRow}");

//                 int dataStartRow = headerRow + 1;

//                 // Lire les noms des compétences à partir des en-têtes
//                 var competenceNames = new List<string>();
//                 for (int col = 2; col <= worksheet.Dimension.End.Column; col++)
//                 {
//                     string header = worksheet.Cells[headerRow, col].Text.Trim();
//                     if (!string.IsNullOrEmpty(header))
//                     {
//                         competenceNames.Add(header);
//                     }
//                 }

//                 Console.WriteLine($"Noms des compétences trouvés : {string.Join(", ", competenceNames)}");

//                 if (competenceNames.Count == 0)
//                 {
//                     Console.WriteLine("Erreur : Aucun nom de compétence n'a été trouvé. Vérifiez la ligne d'en-tête.");
//                     return;
//                 }

//                 // Déterminer la dernière ligne avec des données réelles
//                 int lastRow = FindLastDataRow(worksheet);
//                 Console.WriteLine($"Dernière ligne avec des données : {lastRow}");

//                 // Créer une liste pour stocker les lignes transformées
//                 var transformedRows = new List<List<object>>();

//                 // Parcourir les lignes du fichier Excel à partir de la ligne de début des données
//                 for (int row = dataStartRow; row <= lastRow; row++)
//                 {
//                     string matricule = worksheet.Cells[row, 1].Text.Trim(); // Matricule dans la colonne 1

//                     // Vérifier si le matricule est valide
//                     if (!string.IsNullOrEmpty(matricule))
//                     {
//                         Console.WriteLine($"Traitement de la ligne {row} pour le matricule : {matricule}");

//                         bool hasValidPerformance = false;

//                         // Parcourir chaque compétence
//                         for (int i = 0; i < competenceNames.Count; i++)
//                         {
//                             int currentCol = 2 + i; // Colonnes 2 à N pour les compétences

//                             // Vérifier que la colonne existe
//                             if (currentCol > worksheet.Dimension.End.Column)
//                             {
//                                 Console.WriteLine($"  Erreur : La ligne {row} ne contient pas la colonne pour la compétence '{competenceNames[i]}'.");
//                                 continue;
//                             }

//                             string competenceName = competenceNames[i];
//                             string performanceRaw = worksheet.Cells[row, currentCol].Text.Trim();

//                             // Supprimer le caractère '%' et convertir en entier
//                             string performanceStr = performanceRaw.Replace("%", "").Replace(" ", "");
//                             if (!int.TryParse(performanceStr, out int performance))
//                             {
//                                 Console.WriteLine($"  Avertissement : La performance '{performanceRaw}' n'est pas un nombre valide pour la compétence '{competenceName}'. Ignorée.");
//                                 continue;
//                             }

//                             Console.WriteLine($"  Compétence : '{competenceName}', Performance : '{performance}'");

//                             // Ajouter uniquement si la performance est valide
//                             transformedRows.Add(new List<object> { matricule, annee, competenceName, performance });
//                             hasValidPerformance = true;
//                         }

//                         if (!hasValidPerformance)
//                         {
//                             Console.WriteLine($"  Avertissement : Aucune performance valide trouvée pour le matricule {matricule} à la ligne {row}.");
//                         }
//                     }
//                     else
//                     {
//                         Console.WriteLine($"  Avertissement : La ligne {row} a un matricule vide. Ignorée.");
//                     }
//                 }

//                 Console.WriteLine($"Nombre de lignes transformées : {transformedRows.Count}");

//                 if (transformedRows.Count == 0)
//                 {
//                     Console.WriteLine("Aucune donnée n'a été transformée. Vérifiez les données d'entrée.");
//                 }
//                 else
//                 {
//                     // Créer une nouvelle feuille pour stocker les données transformées
//                     using (var outputPackage = new ExcelPackage())
//                     {
//                         var transformedWorksheet = outputPackage.Workbook.Worksheets.Add("Transformed Data");

//                         // Ajouter les en-têtes de colonnes
//                         transformedWorksheet.Cells[1, 1].Value = "Matricule";
//                         transformedWorksheet.Cells[1, 2].Value = "Année";
//                         transformedWorksheet.Cells[1, 3].Value = "CompetenceName";
//                         transformedWorksheet.Cells[1, 4].Value = "Performance";

//                         // Appliquer un style gras aux en-têtes
//                         using (var headerRange = transformedWorksheet.Cells[1, 1, 1, 4])
//                         {
//                             headerRange.Style.Font.Bold = true;
//                             headerRange.Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
//                             headerRange.Style.VerticalAlignment = ExcelVerticalAlignment.Center;
//                             headerRange.Style.Fill.PatternType = ExcelFillStyle.Solid;
//                             headerRange.Style.Fill.BackgroundColor.SetColor(Color.LightGray);
//                         }

//                         // Insérer les données transformées dans la feuille
//                         int rowIndex = 2; // Début des données à la ligne 2
//                         foreach (var rowData in transformedRows)
//                         {
//                             transformedWorksheet.Cells[rowIndex, 1].Value = rowData[0]; // Matricule
//                             transformedWorksheet.Cells[rowIndex, 2].Value = rowData[1]; // Année
//                             transformedWorksheet.Cells[rowIndex, 3].Value = rowData[2]; // CompetenceName
//                             transformedWorksheet.Cells[rowIndex, 4].Value = rowData[3]; // Performance
//                             rowIndex++;
//                         }

//                         // Définir l'alignement pour toutes les données
//                         using (var dataRange = transformedWorksheet.Cells[2, 1, rowIndex - 1, 4])
//                         {
//                             dataRange.Style.HorizontalAlignment = ExcelHorizontalAlignment.Left;
//                             dataRange.Style.VerticalAlignment = ExcelVerticalAlignment.Top;
//                             dataRange.Style.WrapText = true;
//                         }

//                         // Exemple : Aligner la colonne "Performance" à droite
//                         transformedWorksheet.Column(4).Style.HorizontalAlignment = ExcelHorizontalAlignment.Right;

//                         // Ajuster la largeur des colonnes pour une meilleure lisibilité
//                         transformedWorksheet.Cells[transformedWorksheet.Dimension.Address].AutoFitColumns();

//                         // Sauvegarder le fichier Excel transformé
//                         outputPackage.SaveAs(new FileInfo(outputFilePath));
//                     }

//                     Console.WriteLine("Transformation terminée et fichier sauvegardé.");
//                 }
//             }
//         } catch (Exception ex)
//             {
//                 Console.WriteLine($"Une erreur est survenue : {ex.Message}");
//             }

//         /// <summary>
//         /// Trouve la ligne contenant un en-tête spécifique dans la première colonne.
//         /// </summary>
//         /// <param name="worksheet">La feuille de calcul Excel.</param>
//         /// <param name="headerName">Le nom de l'en-tête à rechercher.</param>
//         /// <returns>Le numéro de la ligne contenant l'en-tête, ou -1 si non trouvé.</returns>
//         static int FindHeaderRow(ExcelWorksheet worksheet, string headerName)
//         {
//             for (int row = 1; row <= worksheet.Dimension.End.Row; row++)
//             {
//                 string cellValue = worksheet.Cells[row, 1].Text.Trim();
//                 if (string.Equals(cellValue, headerName, StringComparison.OrdinalIgnoreCase))
//                 {
//                     return row;
//                 }
//             }
//             return -1; // Non trouvé
//         }

//         /// <summary>
//         /// Trouve la dernière ligne contenant des données réelles dans la feuille de calcul.
//         /// </summary>
//         /// <param name="worksheet">La feuille de calcul Excel.</param>
//         /// <returns>Le numéro de la dernière ligne avec des données.</returns>
//         static int FindLastDataRow(ExcelWorksheet worksheet)
//         {
//             int lastRow = worksheet.Dimension.End.Row;

//             for (int row = lastRow; row >= 1; row--)
//             {
//                 bool isEmpty = true;
//                 for (int col = 1; col <= worksheet.Dimension.End.Column; col++)
//                 {
//                     if (!string.IsNullOrEmpty(worksheet.Cells[row, col].Text.Trim()))
//                     {
//                         isEmpty = false;
//                         break;
//                     }
//                 }

//                 if (!isEmpty)
//                 {
//                     return row;
//                 }
//             }

//             return lastRow;
//         }
//     }
// }


//NONCADRE
// using OfficeOpenXml;
// using OfficeOpenXml.Style;
// using System;
// using System.Collections.Generic;
// using System.Drawing;
// using System.IO;

// class Program
// {
//     static void Main(string[] args)
//     {
//         // Chemins des fichiers
//         string inputFilePath = @"D:\donne.xlsx"; // Chemin du fichier d'entrée
//         string outputFilePath = @"D:\sortie.xlsx"; // Chemin du fichier de sortie

//         try
//         {
//             // Définir le contexte de licence pour EPPlus (nécessaire pour les versions récentes d'EPPlus)
//             ExcelPackage.LicenseContext = LicenseContext.NonCommercial;

//             // Vérifiez que le fichier d'entrée existe
//             if (!File.Exists(inputFilePath))
//             {
//                 Console.WriteLine($"Erreur : Le fichier d'entrée n'a pas été trouvé : {inputFilePath}");
//                 return;
//             }

//             // Charger le fichier Excel d'entrée
//             using (var package = new ExcelPackage(new FileInfo(inputFilePath)))
//             {
//                 if (package.Workbook.Worksheets.Count == 0)
//                 {
//                     Console.WriteLine("Erreur : Le fichier d'entrée ne contient aucune feuille.");
//                     return;
//                 }

//                 var worksheet = package.Workbook.Worksheets[0]; // Accéder à la première feuille

//                 // Vérifier si le fichier n'est pas vide
//                 if (worksheet.Dimension == null)
//                 {
//                     Console.WriteLine("Erreur : Le fichier d'entrée est vide.");
//                     return;
//                 }

//                 Console.WriteLine($"Nombre de lignes dans le fichier d'entrée : {worksheet.Dimension.End.Row}");
//                 Console.WriteLine($"Nombre de colonnes dans le fichier d'entrée : {worksheet.Dimension.End.Column}");

//                 // Déterminer la dernière ligne avec des données réelles
//                 int lastRow = FindLastDataRow(worksheet);
//                 Console.WriteLine($"Dernière ligne avec des données : {lastRow}");

//                 // Créer une liste pour stocker les lignes transformées
//                 var transformedRows = new List<List<object>>();

//                 // Parcourir les lignes du fichier Excel à partir de la ligne 4 jusqu'à la dernière ligne avec des données
//                 for (int row = 4; row <= lastRow; row++)
//                 {
//                     // Lire le matricule et ajouter des zéros à gauche pour qu'il ait 5 caractères
//                     string rawMatricule = worksheet.Cells[row, 1].Text.Trim();
//                     string matricule = rawMatricule.PadLeft(5, '0'); // Matricule dans la colonne 1 avec 5 caractères

//                     // Vérifier si le matricule est valide
//                     if (!string.IsNullOrEmpty(matricule))
//                     {
//                         Console.WriteLine($"Traitement de la ligne {row} pour le matricule : {matricule}");

//                         bool hasValidIM = false;

//                         // Lire les valeurs IM, RA IM et Real IM pour les 3 ensembles
//                         for (int i = 0; i < 3; i++)
//                         {
//                             int baseCol = 2 + (i * 3); // Colonnes 2, 5, 8 pour IM1, IM2, IM3

//                             // Vérifier que les colonnes existent
//                             if (baseCol + 2 > worksheet.Dimension.End.Column)
//                             {
//                                 Console.WriteLine($"  Erreur : La ligne {row} ne contient pas assez de colonnes pour IM{i + 1}.");
//                                 continue;
//                             }

//                             string im = worksheet.Cells[row, baseCol].Text.Trim();
//                             string raIM = worksheet.Cells[row, baseCol + 1].Text.Trim();
//                             string realIMRaw = worksheet.Cells[row, baseCol + 2].Text.Trim().Replace("%", ""); // Suppression du '%'

//                             Console.WriteLine($"  IM{i + 1} : '{im}', RA IM{i + 1} : '{raIM}', Real IM{i + 1} : '{realIMRaw}'");

//                             // Gérer les résultats manquants ou invalides
//                             string realIM = string.IsNullOrEmpty(realIMRaw) ? "0" : realIMRaw;
//                             if (!int.TryParse(realIM, out int realIMValue))
//                             {
//                                 Console.WriteLine($"  Avertissement : La valeur '{realIMRaw}' n'est pas valide pour Real IM{i + 1}. Définition à 0.");
//                                 realIMValue = 0;
//                             }

//                             // Ajouter uniquement si IM n'est pas vide
//                             if (!string.IsNullOrEmpty(im))
//                             {
//                                 transformedRows.Add(new List<object> { matricule, im, raIM, realIMValue });
//                                 hasValidIM = true;
//                             }
//                         }

//                         if (!hasValidIM)
//                         {
//                             Console.WriteLine($"  Avertissement : Aucun IM valide trouvé pour le matricule {matricule} à la ligne {row}.");
//                         }
//                     }
//                     else
//                     {
//                         Console.WriteLine($"  Avertissement : La ligne {row} a un matricule vide. Ignorée.");
//                     }
//                 }

//                 Console.WriteLine($"Nombre de lignes transformées : {transformedRows.Count}");

//                 if (transformedRows.Count == 0)
//                 {
//                     Console.WriteLine("Aucune donnée n'a été transformée. Vérifiez les données d'entrée.");
//                 }
//                 else
//                 {
//                     // Créer une nouvelle feuille pour stocker les données transformées
//                     using (var outputPackage = new ExcelPackage())
//                     {
//                         var transformedWorksheet = outputPackage.Workbook.Worksheets.Add("Transformed Data");

//                         // Ajouter les en-têtes de colonnes
//                         transformedWorksheet.Cells[1, 1].Value = "Matricule";
//                         transformedWorksheet.Cells[1, 2].Value = "Name";
//                         transformedWorksheet.Cells[1, 3].Value = "ResultText";
//                         transformedWorksheet.Cells[1, 4].Value = "Result";

//                         // Appliquer un style gras aux en-têtes
//                         using (var headerRange = transformedWorksheet.Cells[1, 1, 1, 4])
//                         {
//                             headerRange.Style.Font.Bold = true;
//                             headerRange.Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
//                             headerRange.Style.VerticalAlignment = ExcelVerticalAlignment.Center;
//                             headerRange.Style.Fill.PatternType = ExcelFillStyle.Solid;
//                             headerRange.Style.Fill.BackgroundColor.SetColor(Color.LightGray);
//                         }

//                         // Insérer les données transformées dans la feuille
//                         int rowIndex = 2; // Début des données à la ligne 2
//                         foreach (var rowData in transformedRows)
//                         {
//                             transformedWorksheet.Cells[rowIndex, 1].Value = rowData[0]; // Matricule
//                             transformedWorksheet.Cells[rowIndex, 2].Value = rowData[1]; // Name (IM)
//                             transformedWorksheet.Cells[rowIndex, 3].Value = rowData[2]; // ResultText (RA IM)
//                             transformedWorksheet.Cells[rowIndex, 4].Value = rowData[3]; // Result (Real IM)
//                             rowIndex++;
//                         }

//                         // Définir l'alignement pour toutes les données
//                         using (var dataRange = transformedWorksheet.Cells[2, 1, rowIndex - 1, 4])
//                         {
//                             dataRange.Style.HorizontalAlignment = ExcelHorizontalAlignment.Left;
//                             dataRange.Style.VerticalAlignment = ExcelVerticalAlignment.Top;
//                             dataRange.Style.WrapText = true;
//                         }

//                         // Exemple : Aligner la colonne "Result" à droite
//                         transformedWorksheet.Column(4).Style.HorizontalAlignment = ExcelHorizontalAlignment.Right;

//                         // Définir le format de la colonne "Matricule" comme texte pour conserver les zéros à gauche
//                         transformedWorksheet.Column(1).Style.Numberformat.Format = "@";

//                         // Définir le format de la colonne "Result" comme nombre entier
//                         transformedWorksheet.Column(4).Style.Numberformat.Format = "0";

//                         // Ajuster la largeur des colonnes pour une meilleure lisibilité
//                         transformedWorksheet.Cells[transformedWorksheet.Dimension.Address].AutoFitColumns();

//                         // Sauvegarder le fichier Excel transformé
//                         outputPackage.SaveAs(new FileInfo(outputFilePath));
//                     }

//                     Console.WriteLine("Transformation terminée et fichier sauvegardé.");
//                 }
//             }
//         }
//         catch (Exception ex)
//         {
//             Console.WriteLine($"Une erreur est survenue : {ex.Message}");
//         }
//     } // Fin de la méthode Main

//     /// <summary>
//     /// Trouve la dernière ligne contenant des données réelles dans la feuille de calcul.
//     /// </summary>
//     /// <param name="worksheet">La feuille de calcul Excel.</param>
//     /// <returns>Le numéro de la dernière ligne avec des données.</returns>
//     static int FindLastDataRow(ExcelWorksheet worksheet)
//     {
//         int lastRow = worksheet.Dimension.End.Row;

//         for (int row = lastRow; row >= 1; row--)
//         {
//             bool isEmpty = true;
//             for (int col = 1; col <= worksheet.Dimension.End.Column; col++)
//             {
//                 if (!string.IsNullOrEmpty(worksheet.Cells[row, col].Text.Trim()))
//                 {
//                     isEmpty = false;
//                     break;
//                 }
//             }

//             if (!isEmpty)
//             {
//                 return row;
//             }
//         }

//         return lastRow;
//     }
// }

using OfficeOpenXml;
using OfficeOpenXml.Style;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;

class Program
{
    static void Main(string[] args)
    {
        // Chemins des fichiers
        string inputFilePath = @"D:\competence.xlsx"; // Chemin du fichier d'entrée
        string outputFilePath = @"D:\sortieCompetence.xlsx";    // Chemin du fichier de sortie

        // Définir l'année (peut être dynamique si nécessaire)
        string annee = "2024";

        try
        {
            // Définir le contexte de licence pour EPPlus (nécessaire pour les versions récentes d'EPPlus)
            ExcelPackage.LicenseContext = LicenseContext.NonCommercial;

            // Vérifiez que le fichier d'entrée existe
            if (!File.Exists(inputFilePath))
            {
                Console.WriteLine($"Erreur : Le fichier d'entrée n'a pas été trouvé : {inputFilePath}");
                return;
            }

            // Charger le fichier Excel d'entrée
            using (var package = new ExcelPackage(new FileInfo(inputFilePath)))
            {
                if (package.Workbook.Worksheets.Count == 0)
                {
                    Console.WriteLine("Erreur : Le fichier d'entrée ne contient aucune feuille.");
                    return;
                }

                var worksheet = package.Workbook.Worksheets[0]; // Accéder à la première feuille

                // Vérifier si le fichier n'est pas vide
                if (worksheet.Dimension == null)
                {
                    Console.WriteLine("Erreur : Le fichier d'entrée est vide.");
                    return;
                }

                Console.WriteLine($"Nombre de lignes dans le fichier d'entrée : {worksheet.Dimension.End.Row}");
                Console.WriteLine($"Nombre de colonnes dans le fichier d'entrée : {worksheet.Dimension.End.Column}");

                // Dynamiser la détection de la ligne d'en-tête en recherchant "Matricule" dans la première colonne
                int headerRow = FindHeaderRow(worksheet, "Matricule");
                if (headerRow == -1)
                {
                    Console.WriteLine("Erreur : La ligne d'en-tête contenant 'Matricule' n'a pas été trouvée.");
                    return;
                }

                Console.WriteLine($"Ligne d'en-tête trouvée à la ligne : {headerRow}");

                int dataStartRow = headerRow + 1;

                // Lire les noms des compétences à partir des en-têtes
                var competenceNames = new List<string>();
                for (int col = 2; col <= worksheet.Dimension.End.Column; col++)
                {
                    string header = worksheet.Cells[headerRow, col].Text.Trim();
                    if (!string.IsNullOrEmpty(header))
                    {
                        competenceNames.Add(header);
                    }
                }

                Console.WriteLine($"Noms des compétences trouvés : {string.Join(", ", competenceNames)}");

                if (competenceNames.Count == 0)
                {
                    Console.WriteLine("Erreur : Aucun nom de compétence n'a été trouvé. Vérifiez la ligne d'en-tête.");
                    return;
                }

                // Déterminer la dernière ligne avec des données réelles
                int lastRow = FindLastDataRow(worksheet);
                Console.WriteLine($"Dernière ligne avec des données : {lastRow}");

                // Créer une liste pour stocker les lignes transformées
                var transformedRows = new List<List<object>>();

                // Parcourir les lignes du fichier Excel à partir de la ligne de début des données
                for (int row = dataStartRow; row <= lastRow; row++)
                {
                    // Lire le matricule et ajouter des zéros à gauche pour qu'il ait 5 caractères
                    string rawMatricule = worksheet.Cells[row, 1].Text.Trim();
                    string matricule = rawMatricule.PadLeft(5, '0'); // Matricule dans la colonne 1 avec 5 caractères

                    // Vérifier si le matricule est valide
                    if (!string.IsNullOrEmpty(matricule))
                    {
                        Console.WriteLine($"Traitement de la ligne {row} pour le matricule : {matricule}");

                        bool hasValidPerformance = false;

                        // Parcourir chaque compétence
                        for (int i = 0; i < competenceNames.Count; i++)
                        {
                            int currentCol = 2 + i; // Colonnes 2 à N pour les compétences

                            // Vérifier que la colonne existe
                            if (currentCol > worksheet.Dimension.End.Column)
                            {
                                Console.WriteLine($"  Erreur : La ligne {row} ne contient pas la colonne pour la compétence '{competenceNames[i]}'.");
                                continue;
                            }

                            string competenceName = competenceNames[i];
                            string performanceRaw = worksheet.Cells[row, currentCol].Text.Trim();

                            // Supprimer le caractère '%' et convertir en entier
                            string performanceStr = performanceRaw.Replace("%", "").Replace(" ", "");
                            if (!int.TryParse(performanceStr, out int performance))
                            {
                                Console.WriteLine($"  Avertissement : La performance '{performanceRaw}' n'est pas un nombre valide pour la compétence '{competenceName}'. Ignorée.");
                                continue;
                            }

                            Console.WriteLine($"  Compétence : '{competenceName}', Performance : '{performance}'");

                            // Ajouter uniquement si la performance est valide
                            transformedRows.Add(new List<object> { matricule, annee, competenceName, performance });
                            hasValidPerformance = true;
                        }

                        if (!hasValidPerformance)
                        {
                            Console.WriteLine($"  Avertissement : Aucune performance valide trouvée pour le matricule {matricule} à la ligne {row}.");
                        }
                    }
                    else
                    {
                        Console.WriteLine($"  Avertissement : La ligne {row} a un matricule vide. Ignorée.");
                    }
                }

                Console.WriteLine($"Nombre de lignes transformées : {transformedRows.Count}");

                if (transformedRows.Count == 0)
                {
                    Console.WriteLine("Aucune donnée n'a été transformée. Vérifiez les données d'entrée.");
                }
                else
                {
                    // Créer une nouvelle feuille pour stocker les données transformées
                    using (var outputPackage = new ExcelPackage())
                    {
                        var transformedWorksheet = outputPackage.Workbook.Worksheets.Add("Transformed Data");

                        // Ajouter les en-têtes de colonnes
                        transformedWorksheet.Cells[1, 1].Value = "Matricule";
                        transformedWorksheet.Cells[1, 2].Value = "Année";
                        transformedWorksheet.Cells[1, 3].Value = "CompetenceName";
                        transformedWorksheet.Cells[1, 4].Value = "Performance";

                        // Appliquer un style gras aux en-têtes
                        using (var headerRange = transformedWorksheet.Cells[1, 1, 1, 4])
                        {
                            headerRange.Style.Font.Bold = true;
                            headerRange.Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                            headerRange.Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                            headerRange.Style.Fill.PatternType = ExcelFillStyle.Solid;
                            headerRange.Style.Fill.BackgroundColor.SetColor(Color.LightGray);
                        }

                        // Insérer les données transformées dans la feuille
                        int rowIndex = 2; // Début des données à la ligne 2
                        foreach (var rowData in transformedRows)
                        {
                            transformedWorksheet.Cells[rowIndex, 1].Value = rowData[0]; // Matricule
                            transformedWorksheet.Cells[rowIndex, 2].Value = rowData[1]; // Année
                            transformedWorksheet.Cells[rowIndex, 3].Value = rowData[2]; // CompetenceName
                            transformedWorksheet.Cells[rowIndex, 4].Value = rowData[3]; // Performance
                            rowIndex++;
                        }

                        // Définir l'alignement pour toutes les données
                        using (var dataRange = transformedWorksheet.Cells[2, 1, rowIndex - 1, 4])
                        {
                            dataRange.Style.HorizontalAlignment = ExcelHorizontalAlignment.Left;
                            dataRange.Style.VerticalAlignment = ExcelVerticalAlignment.Top;
                            dataRange.Style.WrapText = true;
                        }

                        // Exemple : Aligner la colonne "Performance" à droite
                        transformedWorksheet.Column(4).Style.HorizontalAlignment = ExcelHorizontalAlignment.Right;

                        // Ajuster la largeur des colonnes pour une meilleure lisibilité
                        transformedWorksheet.Cells[transformedWorksheet.Dimension.Address].AutoFitColumns();

                        // Sauvegarder le fichier Excel transformé
                        outputPackage.SaveAs(new FileInfo(outputFilePath));
                    }

                    Console.WriteLine("Transformation terminée et fichier sauvegardé.");
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Une erreur est survenue : {ex.Message}");
        }
    } // Fin de la méthode Main

    /// <summary>
    /// Trouve la ligne contenant un en-tête spécifique dans la première colonne.
    /// </summary>
    /// <param name="worksheet">La feuille de calcul Excel.</param>
    /// <param name="headerName">Le nom de l'en-tête à rechercher.</param>
    /// <returns>Le numéro de la ligne contenant l'en-tête, ou -1 si non trouvé.</returns>
    static int FindHeaderRow(ExcelWorksheet worksheet, string headerName)
    {
        for (int row = 1; row <= worksheet.Dimension.End.Row; row++)
        {
            string cellValue = worksheet.Cells[row, 1].Text.Trim();
            if (string.Equals(cellValue, headerName, StringComparison.OrdinalIgnoreCase))
            {
                return row;
            }
        }
        return -1; // Non trouvé
    }

    /// <summary>
    /// Trouve la dernière ligne contenant des données réelles dans la feuille de calcul.
    /// </summary>
    /// <param name="worksheet">La feuille de calcul Excel.</param>
    /// <returns>Le numéro de la dernière ligne avec des données.</returns>
    static int FindLastDataRow(ExcelWorksheet worksheet)
    {
        int lastRow = worksheet.Dimension.End.Row;

        for (int row = lastRow; row >= 1; row--)
        {
            bool isEmpty = true;
            for (int col = 1; col <= worksheet.Dimension.End.Column; col++)
            {
                if (!string.IsNullOrEmpty(worksheet.Cells[row, col].Text.Trim()))
                {
                    isEmpty = false;
                    break;
                }
            }

            if (!isEmpty)
            {
                return row;
            }
        }

        return lastRow;
    }
}



//CADRE

// using System;
// using System.Collections.Generic;
// using System.Globalization;
// using System.IO;
// using ClosedXML.Excel;
// using System.Linq;

// class Program
// {
//     static void Main(string[] args)
//     {
//         // Chemins des fichiers
//         string inputFilePath = @"D:\DonneCadre.xlsx"; // Chemin du fichier d'entrée (Excel)
//         string outputFilePath = @"D:\SortieCadre.xlsx"; // Chemin du fichier de sortie (Excel)
//         string logFilePath = @"D:\transformation_logs.txt"; // Chemin du fichier de log

//         // Définir l'année (peut être dynamique si nécessaire)
//         string annee = "2024";

//         try
//         {
//             if (!File.Exists(inputFilePath))
//             {
//                 Console.WriteLine($"Erreur : Le fichier d'entrée n'a pas été trouvé : {inputFilePath}");
//                 return;
//             }

//             using (var logWriter = new StreamWriter(logFilePath, append: true))
//             using (var workbookInput = new XLWorkbook(inputFilePath))
//             using (var workbookOutput = new XLWorkbook())
//             {
//                 var worksheetInput = workbookInput.Worksheet(1); // Supposons que les données sont dans la première feuille
//                 var worksheetOutput = workbookOutput.Worksheets.Add("Sortie");

//                 // Lire la première ligne pour obtenir les en-têtes
//                 var headerRow = worksheetInput.Row(1);
//                 var headers = headerRow.CellsUsed().Select(c => c.GetString().Trim()).ToList();
//                 var headerMap = GetHeaderMap(headers, logWriter);

//                 // Vérifier si les en-têtes requis sont présents
//                 var requiredHeaders = new List<string>
//                 {
//                     "Matricule",
//                     "ROP1", "Pdr1", "iROP1", "Rrop1", "Com1",
//                     "ROP2", "Pdr2", "iROP2", "Rrop2", "Com2",
//                     "ROP3", "Pdr3", "iROP3", "Rrop3", "Com3",
//                     "ROP4", "Pdr4", "iROP4", "Rrop4", "Com4",
//                     "PFI1", "Pdr5", "iPFI1", "rPFI1", "Com5",
//                     "PFI2", "Pdr6", "iPFI2", "rPFI2", "Com6",
//                     "PFI3", "Pdr7", "iPFI3", "rPFI3", "Com7",
//                     "PFI4", "Pdr8", "iPFI4", "rPFI4", "Com8",
//                     "RSE1", "Pdr9", "iRSE1", "rRSE1", "Com9",
//                     "RSE2", "Pdr10", "iRSE2", "rRSE2", "Com10",
//                     "RSE3", "Pdr11", "iRSE3", "rRSE3", "Com11",
//                     "RSE4", "Pdr12", "iRSE4", "rRSE4", "Com12"
//                 };

//                 foreach (var requiredHeader in requiredHeaders)
//                 {
//                     if (!headerMap.ContainsKey(requiredHeader))
//                     {
//                         LogWarning(logWriter, $"Avertissement : L'en-tête '{requiredHeader}' n'est pas présent dans le fichier.");
//                     }
//                 }

//                 // Écrire les en-têtes du fichier de sortie
//                 var outputHeaders = new List<string>
//                 {
//                     "Matricule",
//                     "Année",
//                     "PriorityStrategique",
//                     "Description",
//                     "Ponderation",
//                     "IndicateurResultat",
//                     "Resultat",
//                     "Commentaire"
//                 };

//                 for (int i = 0; i < outputHeaders.Count; i++)
//                 {
//                     worksheetOutput.Cell(1, i + 1).Value = outputHeaders[i];
//                 }

//                 int outputRowNumber = 2; // Commence à la deuxième ligne pour les données

//                 // Définir la plage de lignes à traiter
//                 int startRow = 2; // Supposons que les en-têtes sont en ligne 1
//                 int endRow = worksheetInput.LastRowUsed().RowNumber();

//                 for (int r = startRow; r <= endRow; r++)
//                 {
//                     var dataRow = worksheetInput.Row(r);
//                     int lineNumber = r; // Utiliser le numéro réel de la ligne Excel

//                     // Obtenir les valeurs des cellules sous forme de dictionnaire
//                     var fields = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
//                     foreach (var cell in dataRow.CellsUsed())
//                     {
//                         string header = headers[cell.Address.ColumnNumber - 1];
//                         fields[header] = cell.GetString();
//                     }

//                     string matricule = GetField(fields, "Matricule")?.Trim();

//                     if (string.IsNullOrEmpty(matricule))
//                     {
//                         LogWarning(logWriter, $"Avertissement : La ligne {lineNumber} a un matricule vide. Ignorée.");
//                         continue;
//                     }

//                     Console.WriteLine($"Traitement de la ligne {lineNumber}.");

//                     // Ajouter des zéros en tête pour que le matricule soit de 5 chiffres
//                     matricule = matricule.PadLeft(5, '0');

//                     // Définir les catégories
//                     var categories = new List<Category>
//                     {
//                         new Category { Prefix = "ROP", Priority = "Robustesse Opérationnelle", Count = 4 },
//                         new Category { Prefix = "PFI", Priority = "Performance Financière", Count = 4 },
//                         new Category { Prefix = "RSE", Priority = "Responsabilité Sociétale d'Entreprise", Count = 4 }
//                     };

//                     foreach (var category in categories)
//                     {
//                         for (int i = 1; i <= category.Count; i++)
//                         {
//                             string description = GetField(fields, $"{category.Prefix}{i}")?.Trim();
//                             string pdr = GetField(fields, $"Pdr{GetPdrNumber(category.Prefix, i)}")?.Trim();
//                             string iResult = GetField(fields, $"i{category.Prefix}{i}")?.Trim();

//                             // Récupérer et nettoyer le champ rResult
//                             string rResultRaw = category.Prefix.Equals("ROP", StringComparison.OrdinalIgnoreCase)
//                                 ? GetField(fields, $"Rrop{i}")?.Trim()
//                                 : GetField(fields, $"r{category.Prefix}{i}")?.Trim();

//                             // Supprimer le caractère '%' si présent
//                             string rResultClean = rResultRaw?.Replace("%", "").Trim();

//                             // Convertir Resultat en entier, assigner 0 si manquant ou invalide
//                             int rResult = 0;
//                             if (!string.IsNullOrEmpty(rResultClean))
//                             {
//                                 if (!int.TryParse(rResultClean, NumberStyles.Any, CultureInfo.InvariantCulture, out rResult))
//                                 {
//                                     LogWarning(logWriter, $"Avertissement : Le champ Resultat '{rResultRaw}' pour {category.Prefix}{i} dans la ligne {lineNumber} n'est pas un nombre valide. Assigné à 0.");
//                                     rResult = 0;
//                                 }
//                             }
//                             else
//                             {
//                                 LogWarning(logWriter, $"Avertissement : Le champ Resultat pour {category.Prefix}{i} dans la ligne {lineNumber} est manquant. Assigné à 0.");
//                             }

//                             string commentaire = GetField(fields, $"Com{GetComNumber(category.Prefix, i)}")?.Trim();

//                             // Convertir la pondération en entier si possible, assigner 0 sinon
//                             int ponderation = 0;
//                             if (!string.IsNullOrEmpty(pdr))
//                             {
//                                 string ponderationStr = pdr.Replace("%", "").Replace(" ", "");
//                                 if (!int.TryParse(ponderationStr, NumberStyles.Any, CultureInfo.InvariantCulture, out ponderation))
//                                 {
//                                     LogWarning(logWriter, $"Avertissement : La pondération '{pdr}' n'est pas un nombre valide pour {category.Prefix}{i} dans la ligne {lineNumber}. Assignée à 0.");
//                                     ponderation = 0; // Assignation par défaut
//                                 }
//                             }
//                             else
//                             {
//                                 LogWarning(logWriter, $"Avertissement : La pondération est manquante pour {category.Prefix}{i} dans la ligne {lineNumber}. Assignée à 0.");
//                             }

//                             // Écrire la ligne transformée dans le fichier de sortie
//                             worksheetOutput.Cell(outputRowNumber, 1).Value = matricule;
//                             worksheetOutput.Cell(outputRowNumber, 2).Value = annee;
//                             worksheetOutput.Cell(outputRowNumber, 3).Value = category.Priority;
//                             worksheetOutput.Cell(outputRowNumber, 4).Value = description ?? ""; // Assignation vide si null
//                             worksheetOutput.Cell(outputRowNumber, 5).Value = ponderation;
//                             worksheetOutput.Cell(outputRowNumber, 6).Value = iResult ?? ""; // Assignation vide si null
//                             worksheetOutput.Cell(outputRowNumber, 7).Value = rResult; // Valeur entière, 0 si invalide
//                             worksheetOutput.Cell(outputRowNumber, 8).Value = commentaire ?? ""; // Assignation vide si null

//                             outputRowNumber++;
//                         }
//                     }
//                 }

//                 // Enregistrer le fichier de sortie
//                 workbookOutput.SaveAs(outputFilePath);
//                 Console.WriteLine("Transformation terminée et fichier sauvegardé.");
//             }
//         }
//         catch (Exception ex)
//         {
//             Console.WriteLine($"Une erreur est survenue : {ex.Message}");
//         }
//     }

//     // Classe pour représenter une catégorie
//     class Category
//     {
//         public string Prefix { get; set; }
//         public string Priority { get; set; }
//         public int Count { get; set; }
//     }

//     // Obtenir la valeur d'un champ en fonction de la clé
//     static string GetField(Dictionary<string, string> fields, string key)
//     {
//         if (fields.TryGetValue(key, out string value))
//         {
//             return value;
//         }
//         return null;
//     }

//     // Mapper les numéros PDR en fonction de la catégorie
//     static int GetPdrNumber(string prefix, int i)
//     {
//         // Logique pour mapper Pdr1-Pdr4 pour ROP, Pdr5-Pdr8 pour PFI, Pdr9-Pdr12 pour RSE
//         if (prefix.Equals("ROP", StringComparison.OrdinalIgnoreCase))
//         {
//             return i;
//         }
//         else if (prefix.Equals("PFI", StringComparison.OrdinalIgnoreCase))
//         {
//             return 4 + i;
//         }
//         else if (prefix.Equals("RSE", StringComparison.OrdinalIgnoreCase))
//         {
//             return 8 + i;
//         }
//         return i;
//     }

//     // Mapper les numéros Com en fonction de la catégorie
//     static int GetComNumber(string prefix, int i)
//     {
//         // Logique pour mapper Com1-Com4 pour ROP, Com5-Com8 pour PFI, Com9-Com12 pour RSE
//         if (prefix.Equals("ROP", StringComparison.OrdinalIgnoreCase))
//         {
//             return i;
//         }
//         else if (prefix.Equals("PFI", StringComparison.OrdinalIgnoreCase))
//         {
//             return 4 + i;
//         }
//         else if (prefix.Equals("RSE", StringComparison.OrdinalIgnoreCase))
//         {
//             return 8 + i;
//         }
//         return i;
//     }

//     // Journaliser les avertissements
//     static void LogWarning(StreamWriter logWriter, string message)
//     {
//         string logMessage = $"{DateTime.Now}: {message}";
//         logWriter.WriteLine(logMessage);
//         Console.WriteLine(logMessage);
//     }

//     // Obtenir la correspondance des en-têtes
//     static Dictionary<string, int> GetHeaderMap(List<string> headers, StreamWriter logWriter)
//     {
//         var headerMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

//         for (int i = 0; i < headers.Count; i++)
//         {
//             string header = headers[i].Trim();
//             if (!headerMap.ContainsKey(header))
//             {
//                 headerMap[header] = i + 1; // Les colonnes dans ClosedXML commencent à 1
//             }
//             else
//             {
//                 LogWarning(logWriter, $"Avertissement : L'en-tête '{header}' est dupliqué à la colonne {i + 1}.");
//             }
//         }

//         return headerMap;
//     }
// }

