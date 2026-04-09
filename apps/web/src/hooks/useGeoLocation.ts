import { useEffect, useState } from "react";

export type GeoState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "unsupported" }
  | { status: "error"; message: string }
  | { status: "ok"; lat: number; lng: number; accuracyMeters: number };

export function useGeoLocation(enabled: boolean) {
  const [state, setState] = useState<GeoState>({ status: "idle" });

  useEffect(() => {
    if (!enabled) return;
    if (!navigator.geolocation) {
      setState({ status: "unsupported" });
      return;
    }

    setState({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          status: "ok",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy
        });
      },
      (err) => {
        setState({ status: "error", message: err.message || "Location permission denied" });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [enabled]);

  return state;
}

