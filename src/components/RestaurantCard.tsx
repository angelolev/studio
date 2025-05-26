
"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import type { Restaurant } from "@/types";
import type { Review as AppReviewType } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import StarRating from "./StarRating";
import ReviewForm from "./ReviewForm";
import ReviewList from "./ReviewList";
import ReviewSummary from "./ReviewSummary";
import { useAuth } from "@/contexts/AuthContext";
import {
  getReviewsFromFirestore,
  checkIfUserReviewed,
  type ReviewWithNumericTimestamp,
} from "@/lib/firestoreService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MapPin, Navigation } from "lucide-react";
import { Separator } from "./ui/separator";
import { useToast } from "@/hooks/use-toast";
import { cuisines as allCuisines } from "@/data/cuisines";

import type {
  LatLngExpression,
  Icon as LeafletIconType,
  Map as LeafletMapType,
} from "leaflet";
import type leaflet from "leaflet";

// Import marker images directly
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import dynamic from "next/dynamic";

const LeafletMapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  {
    ssr: false,
    loading: () => (
      <div className="h-[200px] w-full flex items-center justify-center bg-muted rounded-md my-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="ml-2">Cargando mapa...</p>
      </div>
    ),
  }
);
const LeafletTileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const LeafletMarker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const LeafletPopup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export default function RestaurantCard({ restaurant }: RestaurantCardProps) {
  const { user, loadingAuthState } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [L, setL] = useState<typeof leaflet | null>(null);
  const [markerIconInstance, setMarkerIconInstance] = useState<LeafletIconType | null>(null);
  const [isLeafletCoreConfigured, setIsLeafletCoreConfigured] = useState(false);
  const [mapReadyDialog, setMapReadyDialog] = useState(false);
  const mapRefDialog = useRef<LeafletMapType | null>(null);


  const restaurantReviewsQueryKey = ["reviews", restaurant.id];
  const userReviewedQueryKey = ["userReviewed", restaurant.id, user?.uid];

  const {
    data: reviews = [],
    isLoading: isLoadingReviews,
    error: reviewsError,
  } = useQuery<ReviewWithNumericTimestamp[], Error, AppReviewType[]>({
    queryKey: restaurantReviewsQueryKey,
    queryFn: () => getReviewsFromFirestore(restaurant.id),
    staleTime: 5 * 60 * 1000,
    enabled: true, 
    select: (data) =>
      data.map((review) => ({
        ...review,
        timestamp: review.timestamp,
      })),
  });

  const {
    data: userHasAlreadyReviewed,
    isLoading: isLoadingUserReviewedCheck,
  } = useQuery<boolean, Error>({
    queryKey: userReviewedQueryKey,
    queryFn: () => checkIfUserReviewed(restaurant.id, user!.uid),
    enabled: isDialogOpen && !!user && !loadingAuthState,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (isDialogOpen && typeof window !== 'undefined' && !isLeafletCoreConfigured) {
      import("leaflet").then((leafletModule) => {
        if (!(leafletModule.Icon.Default.prototype as any)._iconInit) {
          delete (leafletModule.Icon.Default.prototype as any)._getIconUrl;
          leafletModule.Icon.Default.mergeOptions({
            iconRetinaUrl: markerIcon2x.src,
            iconUrl: markerIcon.src,
            shadowUrl: markerShadow.src,
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
          });
          (leafletModule.Icon.Default.prototype as any)._iconInit = true;
        }
        setL(leafletModule);
        setMarkerIconInstance(new leafletModule.Icon.Default());
        setIsLeafletCoreConfigured(true);
      }).catch((err) => {
        console.error("Error loading Leaflet module in RestaurantCard:", err);
      });
    }
  }, [isDialogOpen, isLeafletCoreConfigured]);

  useEffect(() => {
    if (isDialogOpen && isLeafletCoreConfigured && L && markerIconInstance) {
      setMapReadyDialog(true);
    } else if (!isDialogOpen) {
      if (mapRefDialog.current && typeof mapRefDialog.current.remove === 'function') {
        try {
          mapRefDialog.current.remove();
        } catch (e) {
          console.error("Error removing map instance in RestaurantCard:", e);
        }
      }
      mapRefDialog.current = null;
      setMapReadyDialog(false);
    }
  }, [isDialogOpen, L, isLeafletCoreConfigured, markerIconInstance]);


  useEffect(() => {
    if (reviewsError) {
      toast({
        title: "Error",
        description:
          "No se pudieron cargar las opiniones para este restaurante.",
        variant: "destructive",
      });
    }
  }, [reviewsError, toast]);


  const averageRating = useMemo(() => {
    if (reviews.length > 0) {
      const totalRating = reviews.reduce(
        (sum, review) => sum + review.rating,
        0
      );
      return totalRating / reviews.length;
    }
    return 0;
  }, [reviews]);

  const reviewCount = useMemo(() => reviews.length, [reviews]);

  const handleReviewAdded = (newReview: AppReviewType) => {
    queryClient.invalidateQueries({ queryKey: restaurantReviewsQueryKey });
    queryClient.invalidateQueries({ queryKey: userReviewedQueryKey });
  };

  const showReviewForm = useMemo(() => {
    if (loadingAuthState || isLoadingUserReviewedCheck) return false;
    if (!user) return false;
    return !userHasAlreadyReviewed;
  }, [
    user,
    loadingAuthState,
    userHasAlreadyReviewed,
    isLoadingUserReviewedCheck,
  ]);

  const cuisineNames = useMemo(() => {
    if (!restaurant.cuisine || restaurant.cuisine.length === 0) return "N/A";
    return restaurant.cuisine
      .map((cId) => {
        const foundCuisine = allCuisines.find((c) => c.id === cId);
        return foundCuisine ? foundCuisine.name : cId;
      })
      .join(", ");
  }, [restaurant.cuisine]);

  const imageHint = useMemo(() => {
    if (
      restaurant.imageUrl &&
      restaurant.imageUrl.startsWith("https://placehold.co")
    ) {
      const firstCuisineId = restaurant.cuisine?.[0];
      if (firstCuisineId) {
        const cuisineForHint = allCuisines.find((c) => c.id === firstCuisineId);
        if (cuisineForHint && cuisineForHint.name) {
          const words = cuisineForHint.name.split(" ");
          if (words.length > 0 && words[0].length > 2) {
            const hint = words[0].toLowerCase();
            if (words.length > 1 && words[1].length > 2) {
              return `${hint} ${words[1].toLowerCase()}`;
            }
            return hint;
          }
        }
      }
      return "restaurante logo";
    }
    return undefined;
  }, [restaurant.imageUrl, restaurant.cuisine]);

  const restaurantLocation: LatLngExpression | undefined =
    restaurant.latitude !== undefined && restaurant.longitude !== undefined
      ? [restaurant.latitude, restaurant.longitude]
      : undefined;

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <Card
        className="flex items-center p-3 sm:p-4 shadow-md hover:shadow-lg transition-shadow duration-300 rounded-lg w-full cursor-pointer"
        aria-label={`Ver detalles y opiniones de ${restaurant.name}`}
        role="button"
        tabIndex={0}
        onClick={() => setIsDialogOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            setIsDialogOpen(true);
          }
        }}
      >
        <div className="flex-shrink-0">
          <Image
            src={restaurant.imageUrl}
            alt={restaurant.name || "Logo del restaurante"}
            width={64}
            height={64}
            className="rounded-md object-cover aspect-square"
            data-ai-hint={imageHint}
          />
        </div>

        <div className="ml-3 sm:ml-4 flex-grow min-w-0 pr-2">
          <h3
            className="text-base sm:text-lg font-semibold truncate"
            title={restaurant.name}
          >
            {restaurant.name}
          </h3>
          <p
            className="text-xs sm:text-sm text-muted-foreground truncate"
            title={cuisineNames}
          >
            {cuisineNames}
          </p>
          {restaurant.address && (
            <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center">
              <MapPin size={12} className="mr-1 shrink-0" />
              {restaurant.address}
            </p>
          )}
        </div>

        <div className="ml-auto flex-shrink-0 flex flex-col items-center text-center p-1 sm:p-2 h-auto">
          {isLoadingReviews && !isDialogOpen ? ( 
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <StarRating rating={averageRating} readOnly size={16} />
          )}
          <span className="text-xs text-muted-foreground mt-0.5">
            ({reviewCount} opinion{reviewCount === 1 ? "" : "es"})
          </span>
        </div>
      </Card>

      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">{restaurant.name}</DialogTitle>
           <DialogDescription className="text-base">
            {cuisineNames}
          </DialogDescription>
          {restaurant.address && (
            <div className="flex items-center text-sm text-muted-foreground mt-1">
              <MapPin size={14} className="inline-block mr-1.5 shrink-0 -mt-0.5" />
              <span>{restaurant.address}</span>
            </div>
          )}
          <div className="flex items-center pt-2">
            <StarRating rating={averageRating} readOnly />
            <span className="ml-2 text-sm text-muted-foreground">
              Basado en {reviewCount} opinion{reviewCount === 1 ? "" : "es"}
            </span>
          </div>
        </DialogHeader>

        {isDialogOpen && mapReadyDialog && restaurantLocation && L && isLeafletCoreConfigured && markerIconInstance && LeafletMapContainer && LeafletTileLayer && LeafletMarker && LeafletPopup ? (
          <div className="my-4">
            <LeafletMapContainer
              key={restaurant.id + (isDialogOpen ? "-dialog-map-open" : "-dialog-map-closed")}
              center={restaurantLocation}
              zoom={17} 
              scrollWheelZoom={false}
              style={{
                height: "200px",
                width: "100%",
                borderRadius: "var(--radius)",
              }}
              ref={mapRefDialog}
            >
              <LeafletTileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LeafletMarker
                position={restaurantLocation}
                icon={markerIconInstance}
              >
                <LeafletPopup>{restaurant.name}</LeafletPopup>
              </LeafletMarker>
            </LeafletMapContainer>
            <Button
              variant="outline"
              className="mt-3 w-full"
              onClick={() => {
                const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${restaurant.latitude},${restaurant.longitude}`;
                window.open(mapsUrl, '_blank', 'noopener,noreferrer');
              }}
            >
              <Navigation className="mr-2 h-4 w-4" />
              Obtener Direcciones
            </Button>
          </div>
        ) : isDialogOpen && !mapReadyDialog && restaurantLocation && (L || isLeafletCoreConfigured) ? (
          <div className="h-[200px] w-full flex items-center justify-center bg-muted rounded-md my-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="ml-2">Cargando mapa...</p>
          </div>
        ) : isDialogOpen && mapReadyDialog && !restaurantLocation ? (
          <p className="my-4 text-sm text-muted-foreground italic">
            La ubicación en el mapa no está disponible para este restaurante.
          </p>
        ) : null}


        <Separator className="my-4" />
        <div className="overflow-y-auto flex-grow pr-2 space-y-6">
          <ReviewSummary
            restaurantName={restaurant.name}
            reviews={reviews.map((r) => r.text)}
          />

          <div>
            <h3 className="text-lg font-semibold mb-3 text-foreground">
              Opiniones
            </h3>
            {isLoadingReviews && (
              <div className="flex items-center justify-center p-4 my-4 min-h-[100px]">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">
                  Cargando opiniones...
                </p>
              </div>
            )}
            {!isLoadingReviews && reviewsError && (
              <p className="text-destructive">Error al cargar opiniones.</p>
            )}
            {!isLoadingReviews && !reviewsError && (
              <ReviewList reviews={reviews} />
            )}
          </div>

          {loadingAuthState && (
            <div className="flex items-center justify-center p-4 my-4 min-h-[50px]">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground text-sm">
                Verificando estado de autenticación...
              </p>
            </div>
          )}

          {!loadingAuthState && !user && (
            <p className="text-left italic text-sm p-2 text-accent-foreground">
              Inicia sesión para dejar tu opinión.
            </p>
          )}

          {!loadingAuthState && user && isLoadingUserReviewedCheck && (
            <div className="flex items-center justify-center p-4 my-4 min-h-[50px]">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground text-sm">
                Comprobando si ya opinaste...
              </p>
            </div>
          )}

          {!loadingAuthState &&
            user &&
            !isLoadingUserReviewedCheck &&
            showReviewForm && (
              <div>
                <h3 className="text-lg font-semibold mb-3 text-foreground">
                  Deja tu Opinión
                </h3>
                <ReviewForm
                  restaurantId={restaurant.id}
                  onReviewAdded={handleReviewAdded}
                />
              </div>
            )}
          {!loadingAuthState &&
            user &&
            !isLoadingUserReviewedCheck &&
            !showReviewForm &&
            userHasAlreadyReviewed && (
              <p className="text-left italic text-sm p-2 text-accent-foreground">
                Ya has dejado tu opinión en este restaurante. ¡Gracias por tu
                ayuda!
              </p>
            )}
        </div>
        <DialogFooter className="mt-auto pt-4 border-t">
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
