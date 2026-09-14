"use client";

import React, { useState, useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import VectorLayer from "ol/layer/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { Cluster, Vector as VectorSource } from "ol/source";
import { Style, Stroke, Circle, Fill, Text } from "ol/style";
import OLGeoJSON from "ol/format/GeoJSON";
import { getLength } from "ol/sphere";
import { LineString } from "ol/geom";
import { Search, ShieldAlert, Crosshair, AlertTriangle, CheckCircle2, X, Activity, Layers, Navigation, Camera, Menu, MapPin, CheckCircle, Play, CornerUpLeft, CornerUpRight, ArrowUp, ArrowRight, ArrowLeft, Video } from "lucide-react";
import Overlay from "ol/Overlay";
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://rcflhgcfmqueyqhcqtii.supabase.co";
const SUPABASE_KEY = "sb_publishable_Qz4eTWnLQPTTS1Bc3nPXEA_6j5u12X0";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
import { fromLonLat, toLonLat } from "ol/proj";
import "ol/ol.css";

/* ─── 3-Color Condition Standard from Vertex ─── */
export const CONDITION_COLORS = {
  GOOD: "#22c55e",
  MODERATE: "#eab308",
  HIGH_RISK: "#ef4444",
  POOR: "#ef4444",
};

/* ─── Basemaps ─── */
const CARTO_KEY = process.env.NEXT_PUBLIC_CARTO_API_KEY;

export const MAP_STYLES: Record<"positron" | "darkMatter" | "voyager", string> = {
  positron: "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png?api_key=779fc3fd-58b7-435b-95bf-19caefb38ecd",
  darkMatter: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  voyager: "https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
};

/* ─── Types ─── */
type PotholeStatus = "Active" | "Reported" | "Verifying_Fix" | "Resolved";

interface Pothole {
  id: string;
  latitude: number;
  longitude: number;
  road_name: string;
  confidence: number;
  status: PotholeStatus;
  detected_at: string;
  ghost_passes?: number;
  last_ghost_pass_at?: string;
  image_url?: string;
}

interface RoadSegment {
  id: string;
  name: string;
  length_km: number;
  potholeCount: number;
  potholes_per_km: number;
  conditionLevel: "GOOD" | "MODERATE" | "HIGH_RISK";
  lane_advice: string;
}

/* ─── Mock Data ─── */
const MOCK_POTHOLES: Pothole[] = [
  { id: "1", latitude: 12.9565, longitude: 77.6102, road_name: "Austin Town Main Road", confidence: 0.94, status: "Active", detected_at: new Date().toISOString() },
  { id: "2", latitude: 12.9558, longitude: 77.6119, road_name: "Austin Town Main Road", confidence: 0.91, status: "Active", detected_at: new Date().toISOString() },
  { id: "3", latitude: 12.9550, longitude: 77.6136, road_name: "Austin Town Main Road", confidence: 0.87, status: "Reported", detected_at: new Date().toISOString() },
  { id: "4", latitude: 12.9543, longitude: 77.6148, road_name: "Austin Town Main Road", confidence: 0.89, status: "Active", detected_at: new Date().toISOString() },
  { id: "5", latitude: 12.9537, longitude: 77.6158, road_name: "Austin Town Cross Road", confidence: 0.83, status: "Active", detected_at: new Date().toISOString() },
  { id: "6", latitude: 12.9526, longitude: 77.6210, road_name: "Austin Town Cross Road", confidence: 0.78, status: "Reported", detected_at: new Date().toISOString() },
  { id: "7", latitude: 12.9520, longitude: 77.6225, road_name: "Austin Town Cross Road", confidence: 0.76, status: "Resolved", detected_at: new Date().toISOString() },
  { id: "8", latitude: 12.9561, longitude: 77.6093, road_name: "Koramangala 1st Block Road", confidence: 0.92, status: "Active", detected_at: new Date().toISOString() },
  { id: "9", latitude: 12.9540, longitude: 77.6091, road_name: "Koramangala 1st Block Road", confidence: 0.88, status: "Active", detected_at: new Date().toISOString() },
  { id: "10", latitude: 12.9515, longitude: 77.6089, road_name: "Koramangala 1st Block Road", confidence: 0.85, status: "Active", detected_at: new Date().toISOString() },
  { id: "11", latitude: 12.9490, longitude: 77.6082, road_name: "Koramangala 4th Block Road", confidence: 0.79, status: "Active", detected_at: new Date().toISOString() },
  { id: "12", latitude: 12.9460, longitude: 77.6078, road_name: "Koramangala 4th Block Road", confidence: 0.72, status: "Verifying_Fix", detected_at: new Date().toISOString() },
  { id: "13", latitude: 12.9476, longitude: 77.6310, road_name: "Hosur Road Service Lane", confidence: 0.89, status: "Active", detected_at: new Date().toISOString() },
  { id: "14", latitude: 12.9462, longitude: 77.6332, road_name: "Hosur Road Service Lane", confidence: 0.84, status: "Active", detected_at: new Date().toISOString() },
];

const MOCK_ROAD_SEGMENTS: GeoJSON.FeatureCollection<GeoJSON.LineString, RoadSegment> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "LineString", coordinates: [[77.6099,12.9568],[77.6131,12.9553],[77.6162,12.9541]] },
      properties: { id: "seg1", name: "Austin Town Main Road", length_km: 0.7, potholeCount: 6, potholes_per_km: 8.6, conditionLevel: "HIGH_RISK", lane_advice: "Avoid centre lane – 6 hazards detected" }
    },
    {
      type: "Feature",
      geometry: { type: "LineString", coordinates: [[77.6162,12.9541],[77.6200,12.9528],[77.6235,12.9518]] },
      properties: { id: "seg2", name: "Austin Town Cross Road", length_km: 0.6, potholeCount: 3, potholes_per_km: 5.0, conditionLevel: "MODERATE", lane_advice: "Minor surface damage – use right lane" }
    },
    {
      type: "Feature",
      geometry: { type: "LineString", coordinates: [[77.6235,12.9518],[77.6260,12.9505],[77.6285,12.9492]] },
      properties: { id: "seg3", name: "Viveka Nagar Road", length_km: 0.6, potholeCount: 1, potholes_per_km: 1.7, conditionLevel: "GOOD", lane_advice: "Road in good condition – all lanes clear" }
    },
    {
      type: "Feature",
      geometry: { type: "LineString", coordinates: [[77.6099,12.9568],[77.6095,12.9530],[77.6090,12.9498]] },
      properties: { id: "seg4", name: "Koramangala 1st Block Road", length_km: 0.8, potholeCount: 5, potholes_per_km: 6.25, conditionLevel: "HIGH_RISK", lane_advice: "Multiple deep potholes – slow down and use left lane" }
    },
    {
      type: "Feature",
      geometry: { type: "LineString", coordinates: [[77.6090,12.9498],[77.6080,12.9460],[77.6072,12.9430]] },
      properties: { id: "seg5", name: "Koramangala 4th Block Road", length_km: 0.8, potholeCount: 2, potholes_per_km: 2.5, conditionLevel: "MODERATE", lane_advice: "Some patched areas – moderate caution" }
    },
    {
      type: "Feature",
      geometry: { type: "LineString", coordinates: [[77.6162,12.9541],[77.6155,12.9505],[77.6148,12.9468]] },
      properties: { id: "seg6", name: "BDA Layout Road", length_km: 0.9, potholeCount: 0, potholes_per_km: 0.0, conditionLevel: "GOOD", lane_advice: "Smooth asphalt – all lanes clear" }
    },
    {
      type: "Feature",
      geometry: { type: "LineString", coordinates: [[77.6285,12.9492],[77.6310,12.9475],[77.6340,12.9458]] },
      properties: { id: "seg7", name: "Hosur Road Service Lane", length_km: 0.7, potholeCount: 4, potholes_per_km: 5.7, conditionLevel: "HIGH_RISK", lane_advice: "Heavy pothole damage on service road" }
    }
  ]
};

/* ─── Status Badge ─── */
function StatusBadge({ status, isReportedByUser }: { status: PotholeStatus | string, isReportedByUser?: boolean }) {
  const effectiveStatus = status === 'Resolved' ? 'Resolved' : (isReportedByUser ? 'Reported' : status);
  const mapColor = {
    Active: CONDITION_COLORS.HIGH_RISK,
    Reported: CONDITION_COLORS.MODERATE,
    Verifying_Fix: "#ffd43b",
    Resolved: CONDITION_COLORS.GOOD,
  }[effectiveStatus as string] || CONDITION_COLORS.HIGH_RISK;

  return (
    <span
      style={{
        color: mapColor,
        background: "#f0f0f3",
        boxShadow: "inset 2px 2px 4px rgba(180,180,190,0.45), inset -1px -1px 3px rgba(255,255,255,0.7)",
        border: "none",
      }}
      className="text-[10px] font-mono font-bold px-3 py-1 rounded-full whitespace-nowrap"
    >
      {effectiveStatus === "Active" ? "Critical" : effectiveStatus.replace("_", " ")}
    </span>
  );
}

/* ═══════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════ */
export default function PotholeMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance  = useRef<Map | null>(null);
  const markers      = useRef<Overlay[]>([]);
  const userMarker   = useRef<Overlay | null>(null);
  const listenersAttached = useRef(false);
  const vectorLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const potholeClusterLayerRef = useRef<VectorLayer<Cluster> | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const routeLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const baseLayerRef = useRef<TileLayer | null>(null);

    const [potholes, setPotholes]           = useState<Pothole[]>([]);
  
  // Fetch from Supabase on mount
  useEffect(() => {
    // Generate or retrieve persistent user ID
    let did = localStorage.getItem("device_user_id");
    if (!did) {
        did = crypto.randomUUID();
        localStorage.setItem("device_user_id", did);
    }
    setDeviceUserId(did);

    const fetchPotholes = async () => {
      // 1. Fetch potholes
      const { data, error } = await supabase.from('potholes').select('*');
      if (!error && data) {
        setPotholes(data);
      }
      
      // 2. Fetch user's reports
      const { data: userReps } = await supabase.from('user_reports').select('*').eq('user_id', did);
      if (userReps) {
          setUserReportedIds(new Set(userReps.map(r => r.pothole_id)));
      }
    };
    fetchPotholes();
  }, []);
  const [selected, setSelected]           = useState<Pothole | null>(null);
  const [selectedClusterCount, setSelectedClusterCount] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [routeFeature, setRouteFeature] = useState<Feature | null>(null);
  const [routeDensityColor, setRouteDensityColor] = useState(CONDITION_COLORS.GOOD);
  const [userCoords, setUserCoords] = useState<number[]>([77.5946, 12.9716]);
  const [selectedSegment, setSelectedSegment] = useState<RoadSegment | null>(null);
  const [mapLoaded, setMapLoaded]         = useState(false);
  const [mapStyleKey, setMapStyleKey]     = useState<"positron" | "darkMatter" | "voyager">("positron");
  const [activeTab, setActiveTab]         = useState<"hazards" | "routes">("hazards");
  const [isTracking, setIsTracking]       = useState(false);
  const [isCameraOpen, setIsCameraOpen]   = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [routesData, setRoutesData] = useState<any[]>([]);
  const [activeRouteIndex, setActiveRouteIndex] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [sessionDrafts, setSessionDrafts] = useState<any[]>([]);
  const [showTripSummary, setShowTripSummary] = useState(false);
  const [escalateToX, setEscalateToX] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);
  const [videoDevices, setVideoDevices] = useState<any[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [showDashcamModal, setShowDashcamModal] = useState(false);
  const [escalationTargets, setEscalationTargets] = useState<any[] | null>(null);
  const [escalationStep, setEscalationStep] = useState<"initial" | "x_pending">("initial");
  const [deviceUserId, setDeviceUserId] = useState<string>("");
  const [userReportedIds, setUserReportedIds] = useState<Set<string>>(new Set());

  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const realNavRafRef = useRef<number | null>(null);
  const smoothCoordsRef = useRef<number[] | null>(null);
  const simIndexRef = useRef(0);
  const isNavigatingRef = useRef(false);
  useEffect(() => { isNavigatingRef.current = isNavigating; }, [isNavigating]);
  
  const navStepIndexRef = useRef(0);
  const deviceHeadingRef = useRef(0);

  useEffect(() => {
      const smoothedHeadingRef = { current: 0 };
        const handleOrientation = (e: any) => {
          let raw = 0;
          if (e.webkitCompassHeading) {
              raw = e.webkitCompassHeading;
          } else if (e.alpha !== null) {
              raw = 360 - e.alpha;
          }

          // Smooth shortcut - handle wrap-around 0/360
          let prev = smoothedHeadingRef.current;
          let delta = raw - prev;
          if (delta > 180) delta -= 360;
          if (delta < -180) delta += 360;
          
          // Use an extremely heavy weight (0.015) so it does not move randomly or jitter
          const smooth = prev + delta * 0.015; 
          smoothedHeadingRef.current = smooth;
          deviceHeadingRef.current = smooth;

          if (userMarker.current) {
              const el = userMarker.current.getElement();
              if (el) {
                  if (isNavigatingRef.current) {
                      // In navigation: rotate the entire SVG chevron
                      const chevron = el.querySelector('.nav-chevron') as HTMLElement;
                      if (chevron) {
                          chevron.style.transform = `translate(-50%, -50%) rotate(${smooth}deg)`;
                      }
                  } else {
                      // On map: rotate the direction cone
                      const cone = el.querySelector('.direction-cone') as HTMLElement;
                      if (cone) {
                          cone.style.transform = `translate(-50%, -50%) rotate(${smooth}deg)`;
                      }
                  }
              }
          }
          
          // WE NO LONGER CALL mapInstance.current.getView().setRotation() HERE.
          // Calling setRotation 60x a second aborts any center animations from GPS updates!
      };
      
      if (typeof window !== "undefined" && window.addEventListener) {
          window.addEventListener('deviceorientationabsolute', handleOrientation);
          window.addEventListener('deviceorientation', handleOrientation);
          return () => {
              window.removeEventListener('deviceorientationabsolute', handleOrientation);
              window.removeEventListener('deviceorientation', handleOrientation);
          };
      }
  }, []);
  const [navInstruction, setNavInstruction] = useState({ modifier: "", type: "", distance: 0, name: "" });
  
  const getTurnIcon = (modifier: string) => {
      if (modifier.includes('left')) return <CornerUpLeft size={36} color="#3b82f6" />;
      if (modifier.includes('right')) return <CornerUpRight size={36} color="#3b82f6" />;
      return <ArrowUp size={36} color="#3b82f6" />;
  };

  const isSimulatingRef = useRef(false);
  useEffect(() => { isSimulatingRef.current = isSimulating; }, [isSimulating]);
  const [destinationCoords, setDestinationCoords] = useState<number[] | null>(null);
  const [detectionBoxes, setDetectionBoxes] = useState<Array<{x: number, y: number, w: number, h: number, conf: number}>>([]);
  const watchIdRef                        = useRef<number | null>(null);
  const userCoordsRef                     = useRef<number[]>([77.5946, 12.9716]);
  const videoRef                          = useRef<HTMLVideoElement | null>(null);

  // ── Request location silently on startup (Vertex-style) ──
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
          setUserCoords(coords);
          userCoordsRef.current = coords;
          // Place blue dot immediately without zooming
          if (mapInstance.current) {
            placeUserMarker(coords[0], coords[1]);
          }
        },
        (err) => console.info("Location permission not granted:", err.message),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded]);

  useEffect(() => {
    let scanInterval: NodeJS.Timeout | null = null;
    let consecutiveDetections = 0;
    if (isCameraOpen) {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const videoConstraints: any = { width: { ideal: 1920 }, height: { ideal: 1080 } };
        if (selectedDeviceId) {
            videoConstraints.deviceId = { exact: selectedDeviceId };
        } else {
            videoConstraints.facingMode = "environment";
        }
        navigator.mediaDevices.getUserMedia({ video: videoConstraints })
          .then((stream) => {
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              
              // Send frames to backend YOLO model every 1 second
              scanInterval = setInterval(async () => {
                if (isCameraOpen && videoRef.current) {
                  const video = videoRef.current;
                  if (video.readyState === video.HAVE_ENOUGH_DATA) {
                    const canvas = document.createElement("canvas");
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext("2d");
                    if (ctx) {
                      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                      const base64Img = canvas.toDataURL("image/jpeg", 0.7);
                      
                      try {
                        const backendUrl = process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/detect/` : `http://${window.location.hostname}:8000/api/v1/detect/`;
                        const res = await fetch(backendUrl, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ image_base64: base64Img })
                        });
                        
                        if (res.ok) {
                          const data = await res.json();
                          if (data.boxes && data.boxes.length > 0) {
                            // Scale boxes to screen size
                            const scaleX = window.innerWidth / canvas.width;
                            const scaleY = window.innerHeight / canvas.height;
                            
                            const scaledBoxes = data.boxes.map((b: any) => ({
                              x: b.x * scaleX,
                              y: b.y * scaleY,
                              w: b.w * scaleX,
                              h: b.h * scaleY,
                              conf: b.conf
                            }));
                            
                            setDetectionBoxes(scaledBoxes);
                            
                            consecutiveDetections += 1;
                            
                            // Wait for 3 seconds of continuous detection (3 consecutive hits)
                            if (consecutiveDetections >= 3) {
                                const lat = userCoordsRef.current[1];
                                const lon = userCoordsRef.current[0];
                                
                                // Send full image to backend to draw bounding boxes and return?
                                // We can just upload the raw frame directly from the frontend to Supabase
                                setPotholes(prev => {
                                    const R = 6371000;
                                    let foundNearby = false;
                                    let nearbyImageUrl = null;
                                    
                                    for (let p of prev) {
                                        const dLat = (lat - p.latitude) * Math.PI / 180;
                                        const dLon = (lon - p.longitude) * Math.PI / 180;
                                        const a = Math.sin(dLat/2)**2 + Math.cos(p.latitude*Math.PI/180)*Math.cos(lat*Math.PI/180)*Math.sin(dLon/2)**2;
                                        const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                                        
                                        if (p.status !== "Resolved" && d < 15) {
                                            foundNearby = true;
                                        }
                                        if (p.image_url && d < 15) {
                                            nearbyImageUrl = p.image_url;
                                        }
                                    }
                                    
                                    if (!foundNearby) {
                                        const newPotholes = scaledBoxes.map((box: any) => ({
                                          latitude: lat,
                                          longitude: lon,
                                          road_name: "Detecting location...",
                                          confidence: box.conf,
                                          status: "Active" as const,
                                          detected_at: new Date().toISOString(),
                                          ghost_passes: 0
                                        }));
                                        
                                        // Background task to geocode, upload image, insert to Supabase, and update state
                                        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`)
                                        .then(res => res.json())
                                        .then(async (geoData) => {
                                            const roadName = geoData.address?.road || geoData.address?.pedestrian || geoData.address?.suburb || "Newly Detected Hazard";
                                            
                                            let finalImageUrl = nearbyImageUrl;
                                            if (!finalImageUrl) {
                                                try {
                                                    const byteString = atob(base64Img.split(',')[1]);
                                                    const mimeString = base64Img.split(',')[0].split(':')[1].split(';')[0];
                                                    const ab = new ArrayBuffer(byteString.length);
                                                    const ia = new Uint8Array(ab);
                                                    for (let i = 0; i < byteString.length; i++) {
                                                        ia[i] = byteString.charCodeAt(i);
                                                    }
                                                    const blob = new Blob([ab], { type: mimeString });
                                                    
                                                    const filename = `grid_${lat.toFixed(5)}_${lon.toFixed(5)}_${Date.now()}.jpg`;
                                                    const { error: uploadError } = await supabase.storage.from('pothole_images').upload(filename, blob, { upsert: true });
                                                    if (!uploadError) {
                                                        const { data } = supabase.storage.from('pothole_images').getPublicUrl(filename);
                                                        finalImageUrl = data.publicUrl;
                                                    } else {
                                                        console.error("Supabase upload error:", uploadError);
                                                    }
                                                } catch (err) {
                                                    console.error("Image upload failed:", err);
                                                }
                                            }
                                            
                                            // Insert into Supabase as Draft
                                            const toInsert = newPotholes.map((np: any) => ({ 
                                                ...np, 
                                                road_name: roadName, 
                                                image_url: finalImageUrl,
                                                status: 'Draft'
                                            }));
                                            const { data: insertedData, error } = await supabase.from('potholes').insert(toInsert).select();
                                            
                                            if (!error && insertedData) {
                                                setPotholes(current => {
                                                    // Remove temporary optimistic placeholders and add real DB objects
                                                    const clean = current.filter(p => !newPotholes.some((np: any) => np.latitude === p.latitude && np.longitude === p.longitude));
                                                    return [...insertedData, ...clean];
                                                });
                                                setSessionDrafts((prev: any[]) => [...prev, ...insertedData]);
                                            }
                                        }).catch(e => console.error("Geocoding/Supabase failed", e));
                                        
                                        return [...newPotholes.map((np: any, i: number) => ({ ...np, id: "temp_" + i })), ...prev];
                                    }
                                    return prev;
                                });
                                
                                consecutiveDetections = 0; // Reset after logging
                            }
                          } else {
                            consecutiveDetections = 0; // Reset on miss
                            setDetectionBoxes([]);
                            
                            // GHOST PASS LOGIC
                            // If no pothole detected, check if we are within 15m of an active pothole
                            const lat = userCoordsRef.current[1];
                            const lon = userCoordsRef.current[0];
                            
                            setPotholes(prev => {
                                const R = 6371000;
                                let updated = false;
                                const now = new Date().getTime();
                                const newPotholes = prev.map(p => {
                                    if (p.status === "Active" || p.status === "Reported") {
                                        const dLat = (lat - p.latitude) * Math.PI / 180;
                                        const dLon = (lon - p.longitude) * Math.PI / 180;
                                        const a = Math.sin(dLat/2)**2 + Math.cos(p.latitude*Math.PI/180)*Math.cos(lat*Math.PI/180)*Math.sin(dLon/2)**2;
                                        const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                                        
                                        if (d < 15) {
                                            const lastPass = p.last_ghost_pass_at ? new Date(p.last_ghost_pass_at).getTime() : 0;
                                            // Only count a pass if it's been at least 5 seconds since the last one
                                            if (now - lastPass > 5000) {
                                                updated = true;
                                                const passes = (p.ghost_passes || 0) + 1;
                                                if (passes >= 15) {
                                                    console.log(`Pothole ${p.id} resolved via Ghost Passes!`);
                                                    const resolvedTime = new Date(now).toISOString();
                                                    // Async update to Supabase
                                                    supabase.from('potholes').update({ ghost_passes: passes, status: "Resolved", last_ghost_pass_at: resolvedTime }).eq('id', p.id).then();
                                                    return { ...p, ghost_passes: passes, status: "Resolved" as const, last_ghost_pass_at: resolvedTime };
                                                }
                                                const passTime = new Date(now).toISOString();
                                                supabase.from('potholes').update({ ghost_passes: passes, last_ghost_pass_at: passTime }).eq('id', p.id).then();
                                                return { ...p, ghost_passes: passes, last_ghost_pass_at: passTime };
                                            }
                                        }
                                    }
                                    return p;
                                });
                                return updated ? newPotholes : prev;
                            });
                          }
                        }
                      } catch (err) {
                        console.error("YOLO Backend Error:", err);
                      }
                    }
                  }
                }
              }, 1000);
              
              // cleanup interval if needed via side effect, but for now it's okay attached to stream resolution
            }
          })
          .catch((err) => {
            console.error("Camera error:", err);
            alert("Camera access denied or failed. Please check permissions.");
            setIsCameraOpen(false);
          });
      } else {
        alert("Camera access is not supported in this browser or requires a secure HTTPS connection.");
        setIsCameraOpen(false);
      }
    } else {
      if (scanInterval) clearInterval(scanInterval);
      setDetectionBoxes([]);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    }
  }, [isCameraOpen, selectedDeviceId]);


  /* ─── Add / update road layers ─── */
  const addVertexRoadLayers = (map: Map, isDark: boolean) => {
    if (!vectorLayerRef.current) {
      const source = new VectorSource({
        features: new OLGeoJSON().readFeatures(MOCK_ROAD_SEGMENTS, {
          featureProjection: "EPSG:3857",
        }),
      });

      const vectorLayer = new VectorLayer({
        source: source,
        style: (feature) => {
          const props = feature.getProperties();
          const color = CONDITION_COLORS[props.conditionLevel as "GOOD" | "MODERATE" | "HIGH_RISK" | "POOR"] || CONDITION_COLORS.GOOD;
          return [
            new Style({
              stroke: new Stroke({
                color: isDark ? "#000000" : "rgba(255,255,255,0.7)",
                width: 13,
              }),
            }),
            new Style({
              stroke: new Stroke({
                color: color,
                width: 8.5,
              }),
            }),
            new Style({
              stroke: new Stroke({
                color: "rgba(255,255,255,0.7)",
                width: 2,
                lineDash: [2, 3],
              }),
            })
          ];
        },
        zIndex: 5,
      });

      map.addLayer(vectorLayer);
      vectorLayerRef.current = vectorLayer;
    } else {
      vectorLayerRef.current.changed();
    }
  };

  /* ─── 1. Init OpenLayers ─── */
  useEffect(() => {
    if (mapInstance.current || !mapContainer.current) return;

    const STADIA_KEY = "779fc3fd-58b7-435b-95bf-19caefb38ecd";
    const baseLayer = new TileLayer({
      source: new XYZ({
        url: mapStyleKey === "positron"
          ? `https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png?api_key=${STADIA_KEY}`
          : MAP_STYLES[mapStyleKey],
        urls: mapStyleKey === "positron" ? [
          `https://tiles-eu.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png?api_key=${STADIA_KEY}`,
          `https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png?api_key=${STADIA_KEY}`,
        ] : undefined,
        crossOrigin: 'anonymous',
        attributions: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; OpenStreetMap',
        maxZoom: 20,
      }),
      zIndex: 0,
    });
    baseLayerRef.current = baseLayer;

    const map = new Map({
      target: mapContainer.current,
      layers: [baseLayer],
      view: new View({
        center: fromLonLat([77.6180, 12.9530]),
        zoom: 14.5,
      }),
    });

    mapInstance.current = map;

    addVertexRoadLayers(map, mapStyleKey === "darkMatter");
    
    // Route layer (per-feature styled)
    const rSource = new VectorSource();
    const rLayer = new VectorLayer({ source: rSource, zIndex: 5 });
    map.addLayer(rLayer);
    routeLayerRef.current = rLayer as any;

    setMapLoaded(true);

    if (!listenersAttached.current) {
      listenersAttached.current = true;

      map.on("click", (e) => {
        let clickedSegment = false;
        map.forEachFeatureAtPixel(e.pixel, (feature, layer) => {
          if (layer === vectorLayerRef.current && !clickedSegment) {
            clickedSegment = true;
            const props = feature.getProperties();
            setSelectedSegment({
              id: props.id,
              name: props.name,
              length_km: Number(props.length_km),
              potholeCount: Number(props.potholeCount),
              potholes_per_km: Number(props.potholes_per_km),
              conditionLevel: props.conditionLevel,
              lane_advice: props.lane_advice,
            });
            setSelected(null);
          }
        });

        if (!clickedSegment) {
          setSelectedSegment(null);
        }
      });

      map.on("pointermove", (e) => {
        const hit = map.hasFeatureAtPixel(e.pixel, {
          layerFilter: (layer) => layer === vectorLayerRef.current,
        });
        map.getTargetElement().style.cursor = hit ? "pointer" : "";
      });
    }

// User marker is placed only when tracking starts

    return () => {
      map.setTarget(undefined);
      mapInstance.current = null;
      listenersAttached.current = false;
      setMapLoaded(false);
    };
  }, []);

  /* ─── Handle Map Style Change ─── */
  const toggleMapStyle = () => {
    const nextKey = mapStyleKey === "positron" ? "darkMatter" : mapStyleKey === "darkMatter" ? "voyager" : "positron";
    setMapStyleKey(nextKey);
    if (baseLayerRef.current) {
      baseLayerRef.current.setSource(new XYZ({ url: MAP_STYLES[nextKey] }));
    }
    if (vectorLayerRef.current) {
       vectorLayerRef.current.changed();
    }
  };

  /* ─── 2. Sync markers whenever potholes or mapLoaded changes ─── */
  useEffect(() => {
    if (!mapLoaded || !mapInstance.current) return;

    markers.current.forEach((m) => mapInstance.current?.removeOverlay(m));
    markers.current = [];

    // If route is active, hide individual dot markers (features already in layer)
    if (routeFeature) {
      return; // Skip drawing HTML markers
    } else {
      routeLayerRef.current?.getSource()?.clear();
    }

    potholes.forEach((p) => {
        const effectiveStatus = p.status === 'Resolved' ? 'Resolved' : (userReportedIds.has(p.id) ? 'Reported' : p.status);
        const color = {
          Active: CONDITION_COLORS.HIGH_RISK,
          Reported: CONDITION_COLORS.MODERATE,
          Verifying_Fix: "#ffd43b",
          Resolved: CONDITION_COLORS.GOOD,
        }[effectiveStatus] || CONDITION_COLORS.HIGH_RISK;

      const wrapper = document.createElement("div");
      const inner = document.createElement("div");
      inner.style.cssText = `
        width: ${p.status === "Active" ? 18 : 14}px;
        height: ${p.status === "Active" ? 18 : 14}px;
        background: ${color};
        border: 2px solid rgba(255,255,255,0.7);
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 14px ${color}, 0 2px 6px rgba(0,0,0,0.6);
        transition: transform 0.15s ease;
        ${p.status === "Resolved" ? "opacity:0.8;" : ""}
      `;
      if (p.status === "Active") {
          const pulse = document.createElement("div");
          pulse.style.cssText = `
            width: 32px;
            height: 32px;
            background: rgba(239, 68, 68, 0.4);
            border-radius: 50%;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            animation: pulse-ring 2s infinite cubic-bezier(0.215, 0.61, 0.355, 1);
            z-index: -1;
          `;
          wrapper.appendChild(pulse);
      }

      inner.onmouseenter = () => { inner.style.transform = "scale(1.4)"; };
      inner.onmouseleave = () => { inner.style.transform = "scale(1)"; };
      wrapper.onclick = (e) => {
        e.stopPropagation();
        const clusterSize = potholes.filter(other => other.latitude === p.latitude && other.longitude === p.longitude).length;
        setSelected(p);
        setSelectedClusterCount(clusterSize);
        setSelectedSegment(null);
        mapInstance.current?.getView().animate({
          center: fromLonLat([p.longitude, p.latitude]),
          zoom: 16,
          duration: 900,
        });
      };

      wrapper.appendChild(inner);

      const overlay = new Overlay({
        element: wrapper,
        position: fromLonLat([p.longitude, p.latitude]),
        positioning: 'center-center',
        stopEvent: true,
      });

      mapInstance.current?.addOverlay(overlay);
      markers.current.push(overlay);
    });

    return () => {
      markers.current.forEach((m) => mapInstance.current?.removeOverlay(m));
      markers.current = [];
    };
  }, [mapLoaded, potholes, routeFeature, routeDensityColor]);

  /* ─── Actions ─── */


  const handleVerify = () => {
    if (!selected) return;
    setPotholes((prev) =>
      prev.map((p) =>
        p.id === selected.id ? { ...p, status: "Verifying_Fix" as PotholeStatus } : p
      )
    );
    setSelected((s) => (s ? { ...s, status: "Verifying_Fix" as PotholeStatus } : null));
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query) { setSearchResults([]); return; }
    
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=77.4,13.1,77.7,12.8&bounded=1`);
        const data = await res.json();
        setSearchResults(data);
      } catch(e) { console.error(e); }
    }, 600);
  };

  // Haversine distance in meters between two [lng, lat] pairs
  const haversineMeters = (a: number[], b: number[]) => {
    const R = 6371000;
    const dLat = (b[1] - a[1]) * Math.PI / 180;
    const dLon = (b[0] - a[0]) * Math.PI / 180;
    const x = Math.sin(dLat/2)**2 + Math.cos(a[1]*Math.PI/180)*Math.cos(b[1]*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
  };

  const drawRoutes = (routes: any[], activeIdx: number, navigating: boolean) => {
    if (!routeLayerRef.current) return;
    routeLayerRef.current.getSource()?.clear();
    
    // Draw inactive routes first (so active is on top)
    if (!navigating) {
        routes.forEach((r, idx) => {
          if (idx !== activeIdx) {
            const f = new Feature({ geometry: new LineString(r.coords.map((c: any) => fromLonLat(c))) });
            f.setStyle(new Style({ stroke: new Stroke({ color: '#6b7280', width: 5, lineDash: [10, 10] }) }));
            routeLayerRef.current?.getSource()?.addFeature(f);
          }
        });
    }
    
    // Draw active route segments
    if (routes[activeIdx]) {
      routeLayerRef.current.getSource()?.addFeatures(routes[activeIdx].segFeatures);
      setRouteFeature(routes[activeIdx].segFeatures[0]); // Hide pothole dots
    }
  };

  useEffect(() => {
    if (routesData.length > 0) {
      drawRoutes(routesData, activeRouteIndex, isNavigating);
    }
  }, [routesData, activeRouteIndex, isNavigating]);

  const selectDestination = async (place: any) => {
    setSelected(null);
    setSelectedSegment(null);
    setSearchResults([]);
    setSearchQuery(place.display_name.split(',')[0]);
    
    const startLon = userCoords[0];
    const startLat = userCoords[1];
    const destLon = parseFloat(place.lon);
    const destLat = parseFloat(place.lat);
    setDestinationCoords([destLon, destLat]);
    
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${destLon},${destLat}?overview=full&geometries=geojson&alternatives=true&steps=true`;
      const res = await fetch(osrmUrl);
      const routeData = await res.json();
      
      if (routeData.routes && routeData.routes.length > 0) {
        const parsedRoutes = [];
        
        for (let rIdx = 0; rIdx < Math.min(3, routeData.routes.length); rIdx++) {
          const coords: number[][] = routeData.routes[rIdx].geometry.coordinates; // [lng, lat][]
          
          // Slice route into 1km segments
          const SEGMENT_KM = 1.0;
          const segments: number[][][] = [];
          let currentSeg: number[][] = [coords[0]];
          let segLen = 0;
          
          for (let i = 1; i < coords.length; i++) {
            const d = haversineMeters(coords[i-1], coords[i]);
            segLen += d;
            currentSeg.push(coords[i]);
            if (segLen >= SEGMENT_KM * 1000) {
              segments.push(currentSeg);
              currentSeg = [coords[i]];
              segLen = 0;
            }
          }
          if (currentSeg.length > 1) segments.push(currentSeg);
          
          const segFeatures: Feature[] = [];
          let totalHazards = 0;
          
          segments.forEach(segCoords => {
            let count = 0;
            potholes.forEach(p => {
              if (p.status !== "Resolved") {
                  const closest = segCoords.find(c => haversineMeters(c, [p.longitude, p.latitude]) < 150);
                  if (closest) count++;
              }
            });
            totalHazards += count;
            const density = count; 
            let conditionLevel = 'GOOD';
            if (density >= 5) conditionLevel = 'HIGH_RISK';
            else if (density >= 2) conditionLevel = 'MODERATE';
            
            const color = CONDITION_COLORS[conditionLevel as keyof typeof CONDITION_COLORS];
            const f = new Feature({ geometry: new LineString(segCoords.map(c => fromLonLat(c))) });
            f.setStyle(new Style({ stroke: new Stroke({ color, width: 7 }) }));
            f.set('conditionLevel', conditionLevel);
            segFeatures.push(f);
          });
          
          const distance = routeData.routes[rIdx].distance; // in meters
          const duration = routeData.routes[rIdx].duration; // in seconds
          
          parsedRoutes.push({
            coords,
            segFeatures,
            totalHazards,
            distance,
            duration,
            label: rIdx === 0 ? "Fastest" : (totalHazards === 0 ? "Comfortable" : "Alternative"),
            steps: routeData.routes[rIdx].legs[0].steps
          });
        }
        
        setRoutesData(parsedRoutes);
        setActiveRouteIndex(0);
        
        // Add destination pin as SVG marker
        const destEl = document.createElement('div');
        destEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="38" viewBox="0 0 24 30" fill="#ef4444" stroke="#fff" stroke-width="1.5"><path d="M12 0C7.6 0 4 3.6 4 8c0 6 8 18 8 18s8-12 8-18c0-4.4-3.6-8-8-8z"/><circle cx="12" cy="8" r="3" fill="#fff"/></svg>`;
        destEl.style.cssText = 'cursor:pointer;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));';
        const destOverlay = new Overlay({
          element: destEl,
          position: fromLonLat([destLon, destLat]),
          positioning: 'bottom-center',
          stopEvent: false,
        });
        
        if ((routeLayerRef.current as any)?._destOverlay) {
          mapInstance.current?.removeOverlay((routeLayerRef.current as any)._destOverlay);
        }
        mapInstance.current?.addOverlay(destOverlay);
        (routeLayerRef.current as any)._destOverlay = destOverlay;
        
        // Fit view
        const allMercator = parsedRoutes[0].coords.map((c: any) => fromLonLat(c));
        const xs = allMercator.map((c: any) => c[0]);
        const ys = allMercator.map((c: any) => c[1]);
        const extent = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
        mapInstance.current?.getView().fit(extent, { padding: [60, 60, 300, 60], duration: 1000 });
      }
    } catch(e) { console.error(e); }
  };
  
  const clearRoute = () => {
    if ((routeLayerRef.current as any)?._destOverlay) {
      mapInstance.current?.removeOverlay((routeLayerRef.current as any)._destOverlay);
      delete (routeLayerRef.current as any)._destOverlay;
    }
    routeLayerRef.current?.getSource()?.clear();
    setRouteFeature(null);
    setSearchQuery("");
    setSearchResults([]);
    setRoutesData([]);
    setDestinationCoords(null);
    setIsNavigating(false);
    if (simulationIntervalRef.current) {
      cancelAnimationFrame(simulationIntervalRef.current as unknown as number);
      simulationIntervalRef.current = null;
    }
    if (realNavRafRef.current) {
      cancelAnimationFrame(realNavRafRef.current);
      realNavRafRef.current = null;
    }
    setIsSimulating(false);
  };
  
  const startRide = () => {
      // Pre-paint the chevron immediately before React flips isNavigating
      isNavigatingRef.current = true;
      navStepIndexRef.current = 1;
      
      if (userMarker.current) {
          const el = userMarker.current.getElement();
          if (el) {
              el.innerHTML = `<svg class="nav-chevron" width="64" height="64" viewBox="0 0 64 64" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(${deviceHeadingRef.current}deg); will-change: transform; transition: transform 0.2s linear; filter: drop-shadow(0px 4px 8px rgba(0,0,0,0.4));">
                  <circle cx="32" cy="32" r="28" fill="white" stroke="#e5e7eb" stroke-width="2"/>
                  <path d="M32 10 L20 48 L32 40 L44 48 Z" fill="#3b82f6" />
              </svg>`;
          }
      }
      
      setIsNavigating(true); // Now flip state
      
      if (mapInstance.current) {
          const userPos = fromLonLat(userCoordsRef.current);
          mapInstance.current.getView().animate({ 
              center: userPos,
              zoom: 19.5,
              duration: 600
          });
      }

      // Initialize the smooth coords
      smoothCoordsRef.current = [...userCoordsRef.current];

      const realNavLoop = () => {
          if (!isNavigatingRef.current || isSimulatingRef.current) return;

          // 1. Smoothly interpolate smoothCoordsRef towards userCoordsRef
          if (smoothCoordsRef.current && userCoordsRef.current) {
              const [tx, ty] = userCoordsRef.current;
              let [sx, sy] = smoothCoordsRef.current;
              
              // Lerp factor of 0.02 gives an extremely heavy and smooth follow
              sx += (tx - sx) * 0.02;
              sy += (ty - sy) * 0.02;
              smoothCoordsRef.current = [sx, sy];

              if (mapInstance.current) {
                  // Direct setCenter & setRotation - NO .animate() so it never aborts!
                  mapInstance.current.getView().setCenter(fromLonLat([sx, sy]));
                  mapInstance.current.getView().setRotation(-deviceHeadingRef.current * Math.PI / 180);
              }
              
              // Move the user marker overlay to match the interpolated coordinates
              if (userMarker.current) {
                  userMarker.current.setPosition(fromLonLat([sx, sy]));
              }
          }

          realNavRafRef.current = requestAnimationFrame(realNavLoop);
      };

      if (!isSimulatingRef.current) {
          if (realNavRafRef.current) cancelAnimationFrame(realNavRafRef.current);
          realNavRafRef.current = requestAnimationFrame(realNavLoop);
      }
  };
  
  const endRide = () => {
      setIsNavigating(false);
      isNavigatingRef.current = false;
      
      if (realNavRafRef.current) {
          cancelAnimationFrame(realNavRafRef.current);
          realNavRafRef.current = null;
      }

      // Immediately reset the marker to the standard blue dot
      if (userCoordsRef.current) {
          placeUserMarker(userCoordsRef.current[0], userCoordsRef.current[1]);
      }
      
      // Reset map rotation to 0 when ride ends
      if (mapInstance.current) {
          mapInstance.current.getView().animate({ rotation: 0, duration: 500 });
      }

      if (simulationIntervalRef.current) {
          cancelAnimationFrame(simulationIntervalRef.current as unknown as number);
          simulationIntervalRef.current = null;
      }
      
      if (isSimulatingRef.current && sessionDrafts.length === 0) {
          setSessionDrafts([
              { id: "sim_1", road_name: "Simulated Test Route - Pothole 1", confidence: 0.95, status: "Draft", latitude: 12.9716, longitude: 77.5946 },
              { id: "sim_2", road_name: "Simulated Test Route - Pothole 2", confidence: 0.88, status: "Draft", latitude: 12.9716, longitude: 77.5946 }
          ]);
      }
      
      setIsSimulating(false);
      setShowTripSummary(true); // Always show summary so user knows they arrived
      
      clearRoute();
  };
  
  const toggleSimulation = () => {
      if (isSimulating) {
          if (simulationIntervalRef.current) cancelAnimationFrame(simulationIntervalRef.current as unknown as number);
          setIsSimulating(false);
      } else {
          setIsSimulating(true);
          startRide();
          simIndexRef.current = 0;
          if (routesData.length > 0) {
              const coords = routesData[activeRouteIndex].coords;
              let lastTimestamp = 0;
              const STEP_INTERVAL_MS = 250; // advance one waypoint every 250ms

              const tick = (timestamp: number) => {
                  if (!isSimulatingRef.current) return; // killed externally

                  if (simIndexRef.current >= coords.length) {
                      endRide();
                      return;
                  }

                  // Throttle: only advance the step every STEP_INTERVAL_MS
                  if (timestamp - lastTimestamp >= STEP_INTERVAL_MS) {
                      lastTimestamp = timestamp;
                      simIndexRef.current += 3;
                  }

                  const idx = Math.min(simIndexRef.current, coords.length - 1);
                  const [lng, lat] = coords[idx];

                  // Compute heading toward next waypoint
                  let heading = 0;
                  if (idx < coords.length - 1) {
                      const [nLng, nLat] = coords[idx + 1];
                      heading = Math.atan2(nLng - lng, nLat - lat);
                  }

                  // Move the marker overlay directly (no innerHTML rebuild)
                  userCoordsRef.current = [lng, lat];
                  if (userMarker.current) {
                      userMarker.current.setPosition(fromLonLat([lng, lat]));
                      const chevron = userMarker.current.getElement()?.querySelector('.nav-chevron') as HTMLElement;
                      if (chevron) {
                          chevron.style.transform = `translate(-50%, -50%) rotate(${heading * 180 / Math.PI}deg)`;
                      }
                  }

                  // Smooth map follow — single animate call with short duration
                  if (mapInstance.current) {
                      mapInstance.current.getView().animate({
                          center: fromLonLat([lng, lat]),
                          rotation: -heading,
                          duration: STEP_INTERVAL_MS,
                      });
                  }

                  updateNavHUD(lng, lat);

                  // Check arrival
                  if (destinationCoords && haversineMeters([lng, lat], destinationCoords) < 20) {
                      endRide();
                      return;
                  }

                  simulationIntervalRef.current = requestAnimationFrame(tick) as unknown as NodeJS.Timeout;
              };

              simulationIntervalRef.current = requestAnimationFrame(tick) as unknown as NodeJS.Timeout;
          }
      }
  };


  const placeUserMarker = (lng: number, lat: number) => {
    const pos = fromLonLat([lng, lat]);
    if (!userMarker.current && mapInstance.current) {
      const userEl = document.createElement("div");
      userEl.className = "user-location-marker";
      userEl.style.position = "absolute";
      userEl.style.width = "60px";
      userEl.style.height = "60px";
      userEl.style.transform = "translate(-50%, -50%)"; // Center it
      const overlay = new Overlay({
        element: userEl,
        position: pos,
        positioning: 'center-center',
        stopEvent: false,
      });
      mapInstance.current.addOverlay(overlay);
      userMarker.current = overlay;
    }
    
    if (userMarker.current) {
      userMarker.current.setPosition(pos);
      const el = userMarker.current.getElement();
      if (el) {
          if (isNavigatingRef.current) {
              // Only paint once; orientation handler rotates via style.transform
              if (!el.querySelector('.nav-chevron')) {
                  const heading = deviceHeadingRef.current;
                  el.innerHTML = `<svg class="nav-chevron" width="64" height="64" viewBox="0 0 64 64" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(${heading}deg); will-change: transform; transition: transform 0.2s linear; filter: drop-shadow(0px 4px 8px rgba(0,0,0,0.4));">
                      <circle cx="32" cy="32" r="28" fill="white" stroke="#e5e7eb" stroke-width="2"/>
                      <path d="M32 10 L20 48 L32 40 L44 48 Z" fill="#3b82f6" />
                  </svg>`;
              }
          } else {
              const h = deviceHeadingRef.current;
              el.innerHTML = `
                  <svg class="direction-cone" width="60" height="60" viewBox="0 0 60 60" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(${h}deg); transition: transform 0.1s; transform-origin: center;">
                      <defs>
                          <linearGradient id="cone-grad" x1="0%" y1="100%" x2="0%" y2="0%">
                              <stop offset="0%" stop-color="#3b82f6" stop-opacity="1" />
                              <stop offset="100%" stop-color="#3b82f6" stop-opacity="0" />
                          </linearGradient>
                      </defs>
                      <path d="M30 30 L15 0 A30 30 0 0 1 45 0 Z" fill="url(#cone-grad)" opacity="0.4" />
                  </svg>
                  <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 18px; height: 18px; background: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.4); z-index: 2;"></div>
              `;
          }
      }
    }
  };
  
  const updateNavHUD = (lng: number, lat: number) => {
      if (!isNavigatingRef.current || routesData.length === 0) return;
      const steps = routesData[activeRouteIndex]?.steps;
      if (!steps) return;
      
      let stepIdx = navStepIndexRef.current;
      if (stepIdx < steps.length) {
          let nextStep = steps[stepIdx];
          if (!nextStep.maneuver.location) return;
          let d = haversineMeters([lng, lat], nextStep.maneuver.location);
          
          if (d < 30 && stepIdx < steps.length - 1) {
              stepIdx++;
              navStepIndexRef.current = stepIdx;
              nextStep = steps[stepIdx];
              d = haversineMeters([lng, lat], nextStep.maneuver.location);
          }
          
          setNavInstruction({
             modifier: nextStep.maneuver.modifier || 'straight',
             type: nextStep.maneuver.type,
             name: nextStep.name,
             distance: Math.round(d)
          });
      }
  };


  const flyToPothole = (p: Pothole) => {
    setSelected(p); setSelectedClusterCount(potholes.filter(other => other.latitude === p.latitude && other.longitude === p.longitude).length);
    setSelectedSegment(null);
    mapInstance.current?.getView().animate({
      center: fromLonLat([p.longitude, p.latitude]),
      zoom: 16,
      duration: 900,
    });
  };

  const flyToSegment = (seg: RoadSegment) => {
    setSelectedSegment(seg);
    setSelected(null);
    const feature = MOCK_ROAD_SEGMENTS.features.find((f: any) => f.properties.id === seg.id);
    if (feature && feature.geometry.coordinates.length > 0) {
      const mid = feature.geometry.coordinates[Math.floor(feature.geometry.coordinates.length / 2)];
      mapInstance.current?.getView().animate({
        center: fromLonLat([mid[0], mid[1]]),
        zoom: 16,
        duration: 900,
      });
    }
  };

  // Recenter map to current location (Google Maps style crosshair button)
  const recenterToLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        setUserCoords(coords);
          userCoordsRef.current = coords;
        placeUserMarker(coords[0], coords[1]);
        mapInstance.current?.getView().animate({ center: fromLonLat(coords), zoom: 16, duration: 900 });
      },
      (err) => {
        console.warn("Recenter error:", err);
        alert("Could not get live location. Please check permissions.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Keep blue dot updated as user walks (called once on startup after permission)
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        if (isSimulatingRef.current) return;
        const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        setUserCoords(coords);
          userCoordsRef.current = coords;
        placeUserMarker(coords[0], coords[1]); // move dot silently, no auto-zoom
      },
      (err) => console.warn("Watch position error:", err.message),
      { enableHighAccuracy: true, maximumAge: 3000 }
    );
    watchIdRef.current = id;
    return () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded]);

  /* ─── Stats ─── */
  const counts = {
    active: potholes.filter((p) => p.status === "Active").length,
    reported: potholes.filter((p) => p.status === "Reported").length,
    resolved: potholes.filter((p) => p.status === "Resolved").length,
  };


    const handleConnectDashcam = async () => {
        try {
            // Need permission to enumerate devices properly
            await navigator.mediaDevices.getUserMedia({ video: true });
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoInputs = devices.filter(d => d.kind === 'videoinput');
            setVideoDevices(videoInputs);
            if (videoInputs.length > 0) setSelectedDeviceId(videoInputs[0].deviceId);
            setShowDashcamModal(true);
        } catch (err) {
            console.error("Camera access error:", err);
            alert("Camera access is required to connect to a dashcam feed.");
        }
    };
  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-[#f0f0f3] relative">
      {/* ════════════ SIDEBAR ════════════ */}
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 md:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      <aside
        className={`absolute md:relative z-40 h-full w-[330px] flex-shrink-0 flex flex-col bg-[#f0f0f3] backdrop-blur-xl border-r border-transparent transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Header */}
        <div style={{ padding: "20px 20px 14px" }}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <ShieldAlert size={22} color="#2ec4b6" />
              <span style={{ fontSize: 22, fontWeight: 700, color: "#1e2124", letterSpacing: "-0.02em" }}>
                DRIS
              </span>
            </div>
            
            {/* Mobile close button */}
            <button className="md:hidden text-gray-500" onClick={() => setIsMobileMenuOpen(false)}>
              <X size={20} />
            </button>
            <button
              onClick={toggleMapStyle}
              className="text-[11px] font-mono px-2.5 py-1 rounded border border-transparent text-gray-500 hover:text-gray-900 hover:border-[#2ec4b6] transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Toggle Dark Map vs Google Color map"
            >
              <Layers size={12} />
              {mapStyleKey === "darkMatter" ? "Dark Map" : "Google Color"}
            </button>
          </div>
          <p style={{ fontSize: 11, color: "#5a6462", fontFamily: "var(--font-mono)" }}>
            Distributed Road Intelligence · Bengaluru
          </p>
        </div>

        {/* Legend */}
        <div style={{ padding: "0 20px 12px" }}>
          <div
            style={{
              background: "#f0f0f3", boxShadow: "inset 4px 4px 8px #d6d6db, inset -4px -4px 8px rgba(255,255,255,0.7)",
              border: "none",
              borderRadius: 8,
              padding: "8px 10px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
            }}
          >
            <div className="flex items-center gap-1.5 text-gray-900">
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: CONDITION_COLORS.GOOD }} />
              <span>Good (&lt;2/km)</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-900">
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: CONDITION_COLORS.MODERATE }} />
              <span>Moderate</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-900">
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: CONDITION_COLORS.HIGH_RISK }} />
              <span>High Risk</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ padding: "0 20px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {([
              { label: "Active", count: counts.active, color: CONDITION_COLORS.HIGH_RISK },
              { label: "Resolved", count: counts.resolved, color: CONDITION_COLORS.GOOD },
            ] as const).map((s) => (
            <div
              key={s.label}
              style={{
                background: `${s.color}14`,
                border: `1px solid ${s.color}33`,
                borderRadius: 8,
                padding: "8px 0",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.count}</div>
              <div style={{ fontSize: 9, color: "#6b7280", fontFamily: "var(--font-mono)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

                {/* Sidebar Search & Tabs */}
        <div style={{ padding: "0 20px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", background: "#f0f0f3", boxShadow: "inset 4px 4px 8px #d6d6db, inset -4px -4px 8px rgba(255,255,255,0.7)", borderRadius: 8, overflow: "hidden", marginBottom: "8px" }}>
            <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", color: "#6b7280" }}>
              <Search size={14} />
            </div>
            <input 
              type="text" 
              placeholder="Filter by road name..." 
              value={sidebarSearchQuery}
              onChange={(e) => setSidebarSearchQuery(e.target.value)}
              style={{ flex: 1, background: "transparent", border: "none", color: "#1e2124", outline: "none", fontSize: 13, padding: "8px 0" }}
            />
            {sidebarSearchQuery && (
              <button onClick={() => setSidebarSearchQuery("")} style={{ padding: "8px 12px", background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 13 }}>
                <X size={14} />
              </button>
            )}
          </div>
          
          <button
            onClick={() => setActiveTab("hazards")}
            style={{
              width: "100%",
              padding: "6px 0",
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "var(--font-mono)",
              borderRadius: 6,
              background: activeTab === "hazards" ? "#f0f0f3" : "transparent", boxShadow: activeTab === "hazards" ? "inset 4px 4px 8px #d6d6db, inset -4px -4px 8px rgba(255,255,255,0.7)" : "none",
              color: activeTab === "hazards" ? "#2ec4b6" : "#6b7280",
              border: `1px solid ${activeTab === "hazards" ? "#2ec4b655" : "transparent"}`,
              cursor: "pointer",
            }}
          >
            Spot Hazards
          </button>
        </div>

        {/* List */}
        <div className="custom-scroll" style={{ flex: 1, overflowY: "auto", padding: "8px 20px", WebkitOverflowScrolling: "touch", paddingBottom: "24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {potholes.filter(p => p.road_name.toLowerCase().includes(sidebarSearchQuery.toLowerCase())).map((p) => {
                const isSelected = selected?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => flyToPothole(p)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: "none",
                      boxShadow: isSelected
                        ? "inset 2px 2px 5px #d4d4d9, inset -2px -2px 5px rgba(255,255,255,0.5)"
                        : "3px 3px 8px #d4d4d9, -2px -2px 6px rgba(255,255,255,0.4)",
                      background: isSelected ? "rgba(46,196,182,0.08)" : "#f0f0f3",
                      cursor: "pointer",
                      textAlign: "left" as const,
                      width: "100%",
                      transition: "box-shadow 0.2s ease, background 0.2s ease",
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.boxShadow = "inset 2px 2px 5px #d4d4d9, inset -2px -2px 5px rgba(255,255,255,0.5)"; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.boxShadow = "3px 3px 8px #d4d4d9, -2px -2px 6px rgba(255,255,255,0.4)"; }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#1e2124" }}>{p.road_name}</div>
                      <div style={{ fontSize: 10, color: "#6b7280", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                        <Crosshair size={10} style={{ display: "inline", verticalAlign: "-1px", marginRight: 4 }} />
                        {(p.confidence * 100).toFixed(0)}% confidence
                      </div>
                    </div>
                    <StatusBadge status={p.status} isReportedByUser={userReportedIds.has(p.id)} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 20px", borderTop: "none", display: "flex", flexDirection: "column", gap: "12px" }}>
          <button
            onClick={handleConnectDashcam}
            style={{
              width: "100%",
              padding: "12px 0",
              borderRadius: 8,
              background: "#2ec4b6",
              color: "#003732",
              fontWeight: 600,
              fontSize: 14,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 0 16px rgba(46,196,182,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Video size={16} />
            Connect Dashcam
          </button>
          <button
            onClick={() => setIsCameraOpen(true)}
            style={{
              width: "100%",
              padding: "12px 0",
              borderRadius: 8,
              background: "#f0f0f3", boxShadow: "6px 6px 14px #d4d4d9, -6px -6px 14px rgba(255,255,255,0.7)",
              color: "#3b82f6",
              border: "none",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Camera size={16} />
            Use your device as scanner
          </button>
        </div>
      </aside>

      {/* ════════════ MAP ════════════ */}
      <div style={{ position: "relative", overflow: "hidden", background: "#f0f0f3" }} className="flex-1">
        {/* Mobile Hamburger Button */}
        <button
          className="md:hidden absolute top-4 left-4 z-20 w-10 h-10 neu-flat-lg text-[#2ec4b6] border border-transparent rounded-full flex items-center justify-center shadow-lg"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <Menu size={20} />
        </button>
        <div ref={mapContainer} style={{ width: "100%", height: "100%", touchAction: "none" }} />

        {/* Search & Routing Bar */}
        <div className={`absolute top-5 left-[64px] right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 w-auto md:w-[400px] z-40 flex-col gap-2 ${isMobileMenuOpen || isNavigating ? 'hidden' : 'flex'}`}>
          <div style={{ display: "flex", background: "#f0f0f3", boxShadow: "inset 4px 4px 8px #d6d6db, inset -4px -4px 8px rgba(255,255,255,0.7)", borderRadius: 8, overflow: "hidden", marginBottom: "8px" }}>
            <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", color: "#6b7280" }}>
              <Search size={18} />
            </div>
            <input 
              type="text" 
              placeholder="Search destination..." 
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", color: "#1e2124", outline: "none", fontSize: 14, textOverflow: "ellipsis" }}
            />
            {routeFeature && (
              <button onClick={clearRoute} style={{ padding: "10px 14px", flexShrink: 0, background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: "bold", fontSize: 14 }}>
                Clear
              </button>
            )}
          </div>
          {searchResults.length > 0 && (
            <div style={{ background: "#f0f0f3", boxShadow: "inset 4px 4px 8px #d6d6db, inset -4px -4px 8px rgba(255,255,255,0.7)", borderRadius: 8, overflow: "hidden", maxHeight: 200, overflowY: "auto" }}>
              {searchResults.map((place, idx) => (
                <div 
                  key={idx} 
                  onClick={() => selectDestination(place)}
                  style={{ padding: "10px 14px", borderBottom: idx < searchResults.length - 1 ? "1px solid #e5e5ea" : "none", cursor: "pointer", color: "#1e2124", fontSize: 13 }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(46,196,182,0.08)"}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = "none"}
                >
                  {place.display_name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recenter Button – Google Maps crosshair style */}
        <button
          onClick={recenterToLocation}
          title="My Location"
          style={{
            position: "absolute",
            bottom: 24,
            right: 24,
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "#f0f0f3", boxShadow: "6px 6px 14px #d4d4d9, -6px -6px 14px rgba(255,255,255,0.7)",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 10,
            color: "#4285F4",
          }}
        >
          <Crosshair size={20} />
        </button>

        {/* Pothole Detail Card */}
        {selected && (
          <div
            className="absolute bottom-24 right-4 left-4 md:left-auto md:right-24 md:w-[330px] bg-[#f0f0f3] backdrop-blur-xl rounded-2xl p-[18px] z-30 neu-flat-lg border border-white/60"
          >
            <button
              onClick={() => setSelected(null)}
              style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.5)", border: "none", cursor: "pointer", color: "#6b7280", borderRadius: "50%", padding: 4, zIndex: 10 }}
            >
              <X size={16} />
            </button>

            {/* Pothole Image - only show when available */}
            {selected.image_url && (
              <div style={{ height: 140, marginBottom: 14, borderRadius: 8, overflow: "hidden", position: "relative", marginTop: -18, marginLeft: -18, width: "calc(100% + 36px)" }}>
                <img
                  src={selected.image_url}
                  alt="Pothole"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div style={{ position: "absolute", bottom: 6, left: 8, background: "rgba(0,0,0,0.65)", padding: "2px 7px", borderRadius: 4, fontSize: 10, color: "#3b82f6", fontWeight: 600 }}>
                  AI Verified Image
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 mb-1">
              <div style={{ 
                  width: 8, height: 8, borderRadius: "50%", 
                  background: {
                    Active: CONDITION_COLORS.HIGH_RISK,
                    Reported: CONDITION_COLORS.MODERATE,
                    Verifying_Fix: "#ffd43b",
                    Resolved: CONDITION_COLORS.GOOD
                  }[selected.status === 'Resolved' ? 'Resolved' : (userReportedIds.has(selected.id) ? 'Reported' : selected.status) as string] || CONDITION_COLORS.HIGH_RISK
                }} />
              <span style={{ fontSize: 15, fontWeight: 600, color: "#1e2124" }}>{selected.road_name}</span>
            </div>
            <p style={{ fontSize: 10, color: "#6b7280", fontFamily: "var(--font-mono)", marginBottom: 14 }}>
              Pothole Hazard Intelligence
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 8px", background: "#f0f0f3", boxShadow: "inset 4px 4px 8px #d6d6db, inset -4px -4px 8px rgba(255,255,255,0.7)", borderRadius: 6, fontSize: 11, fontFamily: "var(--font-mono)" }}>
                <span style={{ color: "#6b7280" }}>Coordinates</span>
                <span style={{ color: "#1e2124" }}>{selected.latitude.toFixed(4)}°, {selected.longitude.toFixed(4)}°</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 8px", background: "#f0f0f3", boxShadow: "inset 4px 4px 8px #d6d6db, inset -4px -4px 8px rgba(255,255,255,0.7)", borderRadius: 6, fontSize: 11, fontFamily: "var(--font-mono)" }}>
                <span style={{ color: "#6b7280" }}>AI Confidence</span>
                <span style={{ color: "#3b82f6", fontWeight: 600 }}>{(selected.confidence * 100).toFixed(1)}%</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 8px", background: "#f0f0f3", boxShadow: "inset 4px 4px 8px #d6d6db, inset -4px -4px 8px rgba(255,255,255,0.7)", borderRadius: 6, fontSize: 11, fontFamily: "var(--font-mono)" }}>
                <span style={{ color: "#6b7280" }}>Status</span>
                <StatusBadge status={selected.status} isReportedByUser={userReportedIds.has(selected.id)} />
              </div>
              {selectedClusterCount > 1 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 8px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: 6, fontSize: 11, fontFamily: "var(--font-mono)" }}>
                  <span style={{ color: "#ef4444", fontWeight: 600 }}>Cluster Potholes Count</span>
                  <span style={{ color: "#ef4444", fontWeight: 700 }}>{selectedClusterCount} Detected</span>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              {selected.status !== "Resolved" && !userReportedIds.has(selected.id) && (
                <button
                  onClick={() => {
                    const cluster = potholes.filter(p => p.latitude === selected.latitude && p.longitude === selected.longitude);
                    setEscalationTargets(cluster);
                    setEscalationStep("initial");
                  }}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    borderRadius: 6,
                    background: CONDITION_COLORS.HIGH_RISK,
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 12,
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <AlertTriangle size={13} /> Escalate
                </button>
              )}
              {selected.status !== "Resolved" && userReportedIds.has(selected.id) && (
                <button
                  disabled
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    borderRadius: 6,
                    background: "#f0f0f3", boxShadow: "6px 6px 14px #d4d4d9, -6px -6px 14px rgba(255,255,255,0.7)",
                    color: "#6b7280",
                    fontWeight: 600,
                    fontSize: 12,
                    border: "none",
                    cursor: "not-allowed",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  Reported by You
                </button>
              )}
              
            </div>
          </div>
        )}

        {/* Road Segment Detail Card */}
        {selectedSegment && (
          <div
            className="absolute bottom-24 right-4 left-4 md:left-auto md:right-24 md:w-[330px] bg-[#f0f0f3] backdrop-blur-xl rounded-2xl p-[18px] z-30 neu-flat-lg"
            style={{ border: `1px solid ${CONDITION_COLORS[selectedSegment.conditionLevel]}55` }}
          >
            <button
              onClick={() => setSelectedSegment(null)}
              style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: CONDITION_COLORS[selectedSegment.conditionLevel],
                  boxShadow: `0 0 8px ${CONDITION_COLORS[selectedSegment.conditionLevel]}`,
                }}
              />
              <span style={{ fontSize: 15, fontWeight: 600, color: "#1e2124" }}>
                {selectedSegment.name}
              </span>
            </div>
            <p style={{ fontSize: 10, color: "#6b7280", fontFamily: "var(--font-mono)", marginBottom: 14 }}>
              Vertex Google-Style Road Condition Segment
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 8px", background: "#f0f0f3", boxShadow: "inset 4px 4px 8px #d6d6db, inset -4px -4px 8px rgba(255,255,255,0.7)", borderRadius: 6, fontSize: 11, fontFamily: "var(--font-mono)" }}>
                <span style={{ color: "#6b7280" }}>Condition Level</span>
                <span style={{ color: CONDITION_COLORS[selectedSegment.conditionLevel], fontWeight: 600 }}>
                  {selectedSegment.conditionLevel === "HIGH_RISK" ? "High Risk (>5/km)" : selectedSegment.conditionLevel === "MODERATE" ? "Moderate (2-5/km)" : "Good (<2/km)"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 8px", background: "#f0f0f3", boxShadow: "inset 4px 4px 8px #d6d6db, inset -4px -4px 8px rgba(255,255,255,0.7)", borderRadius: 6, fontSize: 11, fontFamily: "var(--font-mono)" }}>
                <span style={{ color: "#6b7280" }}>Pothole Density</span>
                <span style={{ color: "#1e2124" }}>{selectedSegment.potholes_per_km} / km ({selectedSegment.potholeCount} total)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 8px", background: "#f0f0f3", boxShadow: "inset 4px 4px 8px #d6d6db, inset -4px -4px 8px rgba(255,255,255,0.7)", borderRadius: 6, fontSize: 11, fontFamily: "var(--font-mono)" }}>
                <span style={{ color: "#6b7280" }}>Segment Length</span>
                <span style={{ color: "#1e2124" }}>{selectedSegment.length_km} km</span>
              </div>
              <div style={{ padding: "8px", background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.25)", borderRadius: 6, fontSize: 11, color: "#ffd43b" }}>
                <span className="font-semibold block mb-0.5">Lane Safety Advice:</span>
                {selectedSegment.lane_advice}
              </div>
            </div>

            <button
              onClick={() => setSelectedSegment(null)}
              style={{
                width: "100%",
                padding: "8px 0",
                borderRadius: 6,
                background: "#f0f0f3", boxShadow: "6px 6px 14px #d4d4d9, -6px -6px 14px rgba(255,255,255,0.7)",
                color: "#1e2124",
                fontWeight: 500,
                fontSize: 12,
                border: "none",
                cursor: "pointer",
              }}
            >
              Done
            </button>
          </div>
        )}
      </div>

      
        {/* Dashcam Connection Modal */}
        {showDashcamModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-sm backdrop-blur-sm p-4">
            <div className="bg-[#f0f0f3] neu-flat-lg border border-transparent p-6 rounded-2xl w-full max-w-sm shadow-2xl">
              <div className="text-blue-600 mb-4 flex justify-center"><Video size={48} /></div>
              <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Connect Dashcam</h2>
              <p className="text-gray-600 mb-6 text-center text-sm">
                  Select your USB or OTG dashcam from the list below to run real-time AI hazard detection.
              </p>
              
              <div className="mb-6">
                 <label className="block text-xs font-mono text-gray-500 mb-2 uppercase">Video Source</label>
                 <select 
                   value={selectedDeviceId}
                   onChange={(e) => setSelectedDeviceId(e.target.value)}
                   className="w-full neu-inset border border-transparent text-gray-900 text-sm rounded-lg p-3 outline-none focus:border-[#2ec4b6]"
                 >
                   {videoDevices.map((device, idx) => (
                     <option key={device.deviceId} value={device.deviceId}>
                       {device.label || `Camera ${idx + 1}`}
                     </option>
                   ))}
                 </select>
              </div>

              <div className="flex gap-3">
                  <button 
                      onClick={() => {
                          setShowDashcamModal(false);
                          setIsCameraOpen(true);
                      }}
                      className="flex-1 py-3 bg-[#2ec4b6] hover:bg-[#25a89b] text-[#003732] font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                      <Play size={16} /> Start Scan
                  </button>
                  <button 
                      onClick={() => setShowDashcamModal(false)}
                      className="flex-1 py-3 neu-button text-gray-900 font-bold rounded-lg transition-colors"
                  >
                      Cancel
                  </button>
              </div>
            </div>
          </div>
        )}
{/* Camera Modal */}
      {isCameraOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "#000",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          
          {/* AI Bounding Boxes */}
          {detectionBoxes.map((box, idx) => (
            <div
              key={idx}
              style={{
                position: "absolute",
                left: box.x,
                top: box.y,
                width: box.w,
                height: box.h,
                border: "3px solid #ef4444",
                boxShadow: "0 0 10px rgba(239, 68, 68, 0.5)",
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                zIndex: 10000,
                transition: "all 0.2s ease"
              }}
            >
              <div style={{
                position: "absolute",
                top: -24,
                left: -3,
                background: "#ef4444",
                color: "#fff",
                fontSize: 12,
                fontWeight: "bold",
                padding: "2px 6px",
                fontFamily: "var(--font-mono)"
              }}>
                POTHOLE {box.conf.toFixed(2)}
              </div>
            </div>
          ))}
          
          <button
            onClick={() => setIsCameraOpen(false)}
            style={{
              position: "absolute",
              top: 24,
              right: 24,
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.6)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={24} />
          </button>
          
          <div
            style={{
              position: "absolute",
              bottom: 40,
              background: "rgba(0,0,0,0.6)",
              padding: "12px 24px",
              borderRadius: 30,
              color: "#3b82f6",
              border: "1px solid #2ec4b6",
              fontFamily: "var(--font-mono)",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span className="radar-ping" style={{ width: 10, height: 10, borderRadius: "50%", background: "#2ec4b6", display: "inline-block" }}></span>
            AI Model Active · Scanning...
          </div>
        </div>
      )}

    
        {/* UI Overlays */}
        
        {/* Welcome Modal */}
        {showWelcome && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#f0f0f3] neu-flat-lg border border-transparent p-6 rounded-2xl max-w-sm text-center shadow-2xl">
              <div className="text-green-500 mb-4 flex justify-center"><CheckCircle size={48} /></div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome!</h2>
              <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                For your smooth rides and better experience, report hazards and contribute to improving the riding experience for everyone.
              </p>
              <button 
                onClick={() => setShowWelcome(false)}
                className="w-full py-3 bg-green-600 hover:bg-green-500 text-gray-900 font-bold rounded-lg transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        )}

        {/* Route Selection Card */}
        {routesData.length > 0 && !isNavigating && (
          <div className="absolute bottom-5 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[500px] z-40 flex flex-col gap-3">
            <div className="flex gap-3 overflow-visible pb-2 w-full">
              {routesData.map((route, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setActiveRouteIndex(idx)}
                  className={`min-w-0 flex-1 p-3 rounded-xl border cursor-pointer transition-all ${activeRouteIndex === idx ? 'neu-button border-green-500 shadow-lg scale-[1.02]' : 'neu-inset border-transparent opacity-70'}`}
                >
                  <div className="font-bold text-gray-900 mb-1">{route.label}</div>
                  <div className="text-xs text-gray-600 mb-2">
                    {Math.round(route.distance/1000)} km • {Math.round(route.duration/60)} min
                  </div>
                  <div className="text-sm font-semibold flex items-center gap-1" style={{ color: route.totalHazards > 0 ? '#ef4444' : '#22c55e'}}>
                    <AlertTriangle size={14} /> {route.totalHazards} Hazards
                  </div>
                </div>
              ))}
            </div>
            <button 
              onClick={startRide}
              className="w-full py-3 bg-green-600 hover:bg-green-500 text-gray-900 font-bold rounded-lg shadow-xl shadow-green-900/20"
            >
              Start Ride
            </button>
            
            {/* Hidden Testing Button */}
            <button 
              onClick={toggleSimulation}
              className="w-full py-2 neu-button text-gray-600 font-bold rounded-lg text-xs"
            >
              Test Route Simulation
            </button>
          </div>
        )}
        
        {/* Navigation HUD */}
        {isNavigating && (
           <div className="absolute top-5 left-5 right-5 flex justify-between items-start pointer-events-none z-40">
              <div className="bg-[#f0f0f3] neu-flat-lg border border-transparent px-4 py-3 rounded-2xl pointer-events-auto flex items-center gap-4 shadow-xl">
                 <div className="bg-blue-500/20 p-2 rounded-lg">
                    {getTurnIcon(navInstruction.modifier)}
                 </div>
                 <div>
                     <div className="text-gray-900 font-bold text-3xl">{navInstruction.distance} <span className="text-lg text-gray-600">m</span></div>
                     <div className="text-gray-600 text-sm font-semibold capitalize flex flex-col">
                        <span>{navInstruction.modifier.replace(/-/g, ' ')} {navInstruction.type === 'arrive' ? 'Destination' : ''}</span>
                        <span className="text-gray-900 text-base truncate max-w-[150px]">{navInstruction.name || "Unknown Road"}</span>
                     </div>
                 </div>
              </div>
              <button 
                onClick={endRide}
                className="bg-red-600 hover:bg-red-500 text-gray-900 px-5 py-3 rounded-2xl font-bold shadow-lg pointer-events-auto"
              >
                End Ride
              </button>
           </div>
        )}

        {/* End of Trip Summary */}
        {showTripSummary && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-sm backdrop-blur-sm p-4">
            <div className="bg-[#f0f0f3] neu-flat-lg border border-transparent p-6 rounded-2xl w-full max-w-sm shadow-2xl">
              <div className="text-green-500 mb-4 flex justify-center"><MapPin size={48} /></div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1 text-center">Trip Complete!</h2>
              <p className="text-gray-600 mb-6 text-center text-sm">
                We detected <strong className="text-gray-900">{sessionDrafts.length} hazards</strong> on your route. Review and report them to help others!
              </p>
              
              <div className="max-h-[40vh] overflow-y-auto mb-6 flex flex-col gap-3">
                 {sessionDrafts.map((d: any, i: number) => (
                    <div key={i} className="bg-[#f0f0f3] neu-inset p-3 rounded border border-transparent flex items-center justify-between">
                       <div>
                          <div className="text-sm text-gray-900 font-bold">{d.road_name}</div>
                          <div className="text-xs text-gray-500">Conf: {Math.round(d.confidence * 100)}%</div>
                       </div>
                         {d.image_url && <img src={d.image_url} className="w-12 h-12 rounded object-cover border border-transparent" />}
                    </div>
                 ))}
                 {sessionDrafts.length === 0 && (
                    <div className="text-center text-gray-500 py-4">No hazards detected. Safe driving!</div>
                 )}
              </div>
              
              <div className="flex gap-3">
                  <button 
                    onClick={async () => {
                        const ids = sessionDrafts.map((d: any) => d.id);
                        if (ids.length > 0) {
                            await supabase.from('potholes').update({ status: 'Active' }).in('id', ids);
                            setEscalationTargets(sessionDrafts);
                              setEscalationStep("initial");
                        }
                        setShowTripSummary(false);
                        setSessionDrafts([]);
                    }}
                    disabled={sessionDrafts.length === 0}
                    className="flex-1 py-3 bg-green-600 disabled:bg-gray-700 hover:bg-green-500 text-gray-900 font-bold rounded-lg transition-colors"
                  >
                    Report Hazards
                  </button>
                  <button 
                    onClick={async () => {
                        const ids = sessionDrafts.map((d: any) => d.id);
                        if (ids.length > 0) {
                            await supabase.from('potholes').delete().in('id', ids);
                        }
                        setShowTripSummary(false);
                        setSessionDrafts([]);
                    }}
                    className="flex-1 py-3 neu-button text-red-600 font-bold rounded-lg transition-colors border border-transparent hover:border-red-900"
                  >
                    Discard
                  </button>
              </div>
            </div>
          </div>
        )}

        {/* Escalation Modal */}
        {escalationTargets !== null && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-white/40 backdrop-blur-sm backdrop-blur-sm p-4">
            <div className="bg-[#f0f0f3] neu-flat-lg border border-transparent p-6 rounded-2xl w-full max-w-sm shadow-2xl">
              
              {escalationStep === "initial" && (
                  <>
                    <div className="text-blue-600 mb-4 flex justify-center"><AlertTriangle size={48} /></div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Escalate to Authorities</h2>
                    <p className="text-gray-600 mb-6 text-center text-sm">
                        You are about to escalate <strong className="text-gray-900">{escalationTargets.length} hazard{escalationTargets.length > 1 ? 's' : ''}</strong>. 
                        This will open your email app with a pre-filled complaint.
                    </p>

                    <div className="mb-6 p-4 neu-inset border border-transparent rounded-lg">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input 
                            type="checkbox" 
                            checked={escalateToX} 
                            onChange={(e) => setEscalateToX(e.target.checked)} 
                            className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500 neu-inset"
                            />
                            <span className="text-sm text-gray-900 flex items-center gap-2">
                                Post publicly to <strong className="text-blue-400">X</strong> (Twitter) afterwards
                            </span>
                        </label>
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={async () => {
                                const ids = escalationTargets.map((d: any) => d.id);
                                setIsEscalating(true);
                                try {
                                    // 1. Log the escalation directly to Supabase
                                    for (const pid of ids) {
                                        if (!pid.startsWith("sim_") && !pid.startsWith("temp_")) {
                                            const { data: existing } = await supabase.from("user_reports").select("*").eq("user_id", deviceUserId).eq("pothole_id", pid);
                                            if (!existing || existing.length === 0) {
                                                await supabase.from("user_reports").insert({ user_id: deviceUserId, pothole_id: pid });
                                            }
                                        }
                                    }
                                    setUserReportedIds(prev => new Set([...prev, ...ids]));
                                    
                                    // 2. Draft the email natively
                                    let emailBody = `Dear Authorities,%0D%0A%0D%0AI am a resident writing to urgently report ${escalationTargets.length} severe pothole hazard(s) on ${escalationTargets[0]?.road_name || 'this route'}.%0D%0A%0D%0AThese potholes pose a significant risk to public safety and vehicles. Please find the exact GPS coordinates below:%0D%0A`;
                                    escalationTargets.forEach((p, i) => {
                                        emailBody += `%0D%0A${i+1}. Coordinates: ${p.latitude}, ${p.longitude} %0D%0A`;
                                        emailBody += `Google Maps (Direct Pin): https://maps.google.com/maps?q=loc:${p.latitude},${p.longitude}%0D%0A`;
                                        if (p.image_url) {
                                            emailBody += `Verified Image: ${p.image_url}%0D%0A`;
                                        }
                                    });
                                    emailBody += `%0D%0APlease prioritize repairs for these locations.%0D%0A%0D%0ASincerely,%0D%0AA Concerned Citizen`;
                                    
                                    const mailtoLink = `mailto:syedkxifuddin@gmail.com?subject=URGENT:%20Pothole%20Hazard%20Report%20-%20${escalationTargets[0]?.road_name || 'Unknown Road'}&body=${emailBody}`;
                                    
                                    window.location.href = mailtoLink;

                                    // 3. Move to next step or close
                                    if (escalateToX) {
                                        setEscalationStep("x_pending");
                                    } else {
                                        setEscalationTargets(null);
                                        setEscalateToX(false);
                                    }
                                } catch(e) {
                                    console.error("Escalation failed", e);
                                    alert("Escalation failed. Please try again.");
                                }
                                setIsEscalating(false);
                            }}
                            disabled={isEscalating}
                            className="flex-1 py-3 neu-button-primary text-white font-bold rounded-2xl flex items-center justify-center gap-2"
                        >
                            {isEscalating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "Draft Email"}
                        </button>
                        <button 
                            onClick={() => {
                                setEscalationTargets(null);
                                setEscalateToX(false);
                            }}
                            disabled={isEscalating}
                            className="flex-1 py-3 neu-button text-red-600 font-bold rounded-lg transition-colors border border-transparent hover:border-red-900"
                        >
                            Cancel
                        </button>
                    </div>
                  </>
              )}

              {escalationStep === "x_pending" && (
                  <>
                    <div className="text-green-500 mb-4 flex justify-center"><CheckCircle size={48} /></div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Email Drafted!</h2>
                    <p className="text-gray-600 mb-6 text-center text-sm">
                        Please make sure you hit send in your email app. Now, complete your escalation by posting it publicly to X.
                    </p>

                    <button 
                        onClick={() => {
                            const road = escalationTargets[0]?.road_name || 'the road';
                            const lat = escalationTargets[0]?.latitude;
                            const lon = escalationTargets[0]?.longitude;
                            const img = escalationTargets[0]?.image_url;
                            
                            let tweetText = `🚨 @GBA_office 🚨\n${escalationTargets.length} severe pothole hazard(s) verified on ${road}!\n\n📍 Location: https://maps.google.com/maps?q=loc:${lat},${lon}`;
                            if (img) tweetText += `\n📸 Evidence: ${img}`;
                            tweetText += `\n\nUrgent public safety risk. Please fix immediately! #FixBengaluruRoads #DRIS`;
                            
                            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, "_blank");
                            setEscalationTargets(null);
                            setEscalateToX(false);
                            setEscalationStep("initial");
                        }}
                        className="w-full py-3 mb-3 neu-button-primary text-white font-bold rounded-2xl flex items-center justify-center gap-2"
                    >
                        Post to X (Twitter)
                    </button>
                    <button 
                        onClick={() => {
                            setEscalationTargets(null);
                            setEscalateToX(false);
                            setEscalationStep("initial");
                        }}
                        className="w-full py-3 neu-button text-gray-900 font-bold rounded-lg transition-colors"
                    >
                        Skip
                    </button>
                  </>
              )}
            </div>
          </div>
        )}
</div>
  );
}
