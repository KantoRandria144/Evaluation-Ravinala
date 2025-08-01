using OpenCvSharp;
using System;
using System.Linq;
using System.Collections.Generic;

public class SignatureComparer
{
    public static Mat PreprocessImage(Mat image)
    {
        Mat gray;

        // Convertir en niveaux de gris
        if (image.Channels() == 3)
            Cv2.CvtColor(image, gray = new Mat(), ColorConversionCodes.BGR2GRAY);
        else if (image.Channels() == 1)
            gray = image.Clone();
        else
            throw new ArgumentException("Image avec un nombre de canaux non pris en charge.");

        // Normaliser les contrastes
        Cv2.Normalize(gray, gray, 0, 255, NormTypes.MinMax);

        // Seuillage adaptatif (par exemple)
        Mat binary = new Mat();
        Cv2.AdaptiveThreshold(gray, binary, 255, AdaptiveThresholdTypes.GaussianC, ThresholdTypes.BinaryInv, 21, 10);

        Mat nonZeroLocations = new Mat();
        Cv2.FindNonZero(binary, nonZeroLocations);

        // Récupération des coordonnées en Vec2i
        Vec2i[] vecPoints;
        nonZeroLocations.GetArray<Vec2i>(out vecPoints);

        // Conversion des Vec2i en Points
        Point[] points = vecPoints.Select(v => new Point(v.Item0, v.Item1)).ToArray();


        if (points.Length == 0)
        {
            // Si aucun point non nul n’est trouvé, retourner directement l’image binaire
            return binary;
        }

        // Calcul du bounding box
        Rect rect = Cv2.BoundingRect(points);

        // Recadrage de l'image
        Mat cropped = new Mat(binary, rect);

        // Redimensionnement
        double aspectRatio = (double)cropped.Width / cropped.Height;
        int newWidth = 300;
        int newHeight = (int)(newWidth / aspectRatio);
        Mat resized = new Mat();
        Cv2.Resize(cropped, resized, new Size(newWidth, newHeight));

        return resized;
    }


    public static double CompareSignatures(string base64Signature1, string base64Signature2)
    {
        // Prétraitement des images
        Mat image1 = PreprocessImage(Base64ToMat(base64Signature1));
        Mat image2 = PreprocessImage(Base64ToMat(base64Signature2));

        // Détection des caractéristiques avec ORB
        var orb = ORB.Create();
        KeyPoint[] keypoints1, keypoints2;
        Mat descriptors1 = new Mat(), descriptors2 = new Mat();
        orb.DetectAndCompute(image1, null, out keypoints1, descriptors1);
        orb.DetectAndCompute(image2, null, out keypoints2, descriptors2);

        if (keypoints1.Length == 0 || keypoints2.Length == 0)
        {
            // Pas assez de points pour comparaison
            return 1.0;
        }

        // Correspondances avec BFMatcher + KnnMatch
        var bfMatcher = new BFMatcher(NormTypes.Hamming, crossCheck: false);
        var knnMatches = bfMatcher.KnnMatch(descriptors1, descriptors2, k: 2);

        // Ratio test de Lowe
        double ratioThreshold = 0.75;
        List<DMatch> goodMatches = new List<DMatch>();
        foreach (var m in knnMatches)
        {
            if (m.Length < 2) continue;
            if (m[0].Distance < ratioThreshold * m[1].Distance)
            {
                goodMatches.Add(m[0]);
            }
        }

        if (goodMatches.Count < 4)
        {
            // Très peu de bonnes correspondances
            return 1.0;
        }

        Mat CreatePoint2fMat(Point2f[] points)
        {
            // Créer une Mat vide avec le type CV_32FC2 (2 canaux : x, y)
            Mat mat = new Mat(points.Length, 1, MatType.CV_32FC2);

            // Remplir la Mat avec les données de points
            for (int i = 0; i < points.Length; i++)
            {
                mat.Set(i, 0, new Vec2f(points[i].X, points[i].Y));
            }

            return mat;
        }

        // Utilisation dans la méthode CompareSignatures
        Point2f[] pts1 = goodMatches.Select(g => keypoints1[g.QueryIdx].Pt).ToArray();
        Point2f[] pts2 = goodMatches.Select(g => keypoints2[g.TrainIdx].Pt).ToArray();

        Mat srcPointsMat = CreatePoint2fMat(pts1);
        Mat dstPointsMat = CreatePoint2fMat(pts2);

        Mat mask = new Mat();
        Mat homography = Cv2.FindHomography(srcPointsMat, dstPointsMat, HomographyMethods.Ransac, 5.0, mask);


        if (homography.Empty())
        {
            // Pas d'homographie trouvée -> correspondances incohérentes
            return 1.0;
        }

        // mask indique quelles correspondances sont inliers
        int inliersCount = 0;
        for (int i = 0; i < mask.Rows; i++)
        {
            if (mask.Get<byte>(i, 0) == 1)
                inliersCount++;
        }

        double inlierRatio = (double)inliersCount / goodMatches.Count;

        // Plus le inlierRatio est élevé, plus les signatures se ressemblent
        // On peut définir un score final comme (1 - inlierRatio) pour que plus petit = plus similaire
        double score = 1.0 - inlierRatio;

        // Par exemple, si les signatures sont très similaires, on pourrait avoir un inlierRatio proche de 1,
        // donc un score proche de 0. S'il n'y a presque pas d'inliers, le score sera proche de 1.
        return score;
    }

    private static Mat Base64ToMat(string base64)
    {
        byte[] imageBytes = Convert.FromBase64String(base64);
        return Cv2.ImDecode(imageBytes, ImreadModes.Color);
    }
}
