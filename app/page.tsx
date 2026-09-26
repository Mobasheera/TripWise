
"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleDollarSign,
  Compass,
  MapPin,
  Navigation,
  Plane,
  Receipt,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
});

/* =========================================================
   PEOPLE
========================================================= */

const people = [
  { name: "A", color: "bg-[#d8c9a7]" },
  { name: "R", color: "bg-[#b9c7b1]" },
  { name: "M", color: "bg-[#c9b8ad]" },
  { name: "S", color: "bg-[#aebfc7]" },
];

/* =========================================================
   FLIGHT ROUTES + GLOBE MOTION
========================================================= */

type FlightRoute = {
  id: string;
  from: string;
  to: string;
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
  color: string;
  trackColor: string;
  cruiseAltitude: number;
  duration: number;
  offset: number;
};

const flightRoutes: FlightRoute[] = [
  {
    id: "mumbai-goa",
    from: "Mumbai",
    to: "Goa",
    start: { lat: 19.076, lng: 72.8777 },
    end: { lat: 15.2993, lng: 74.124 },
    color: "#d28b4d",
    trackColor: "#e4a86e",
    cruiseAltitude: 0.105,
    duration: 20,
    offset: 0,
  },
  {
    id: "delhi-dubai",
    from: "Delhi",
    to: "Dubai",
    start: { lat: 28.6139, lng: 77.209 },
    end: { lat: 25.2048, lng: 55.2708 },
    color: "#6f8fa3",
    trackColor: "#8fb0c2",
    cruiseAltitude: 0.115,
    duration: 20,
    offset: 0.27,
  },
  {
    id: "london-paris",
    from: "London",
    to: "Paris",
    start: { lat: 51.5072, lng: -0.1276 },
    end: { lat: 48.8566, lng: 2.3522 },
    color: "#b47b8d",
    trackColor: "#d09aac",
    cruiseAltitude: 0.095,
    duration: 20,
    offset: 0.52,
  },
  {
    id: "singapore-tokyo",
    from: "Singapore",
    to: "Tokyo",
    start: { lat: 1.3521, lng: 103.8198 },
    end: { lat: 35.6762, lng: 139.6503 },
    color: "#6d8c69",
    trackColor: "#8faf89",
    cruiseAltitude: 0.125,
    duration: 20,
    offset: 0.72,
  },
  {
    id: "newyork-miami",
    from: "New York",
    to: "Miami",
    start: { lat: 40.7128, lng: -74.006 },
    end: { lat: 25.7617, lng: -80.1918 },
    color: "#8b7a51",
    trackColor: "#b29d69",
    cruiseAltitude: 0.105,
    duration: 20,
    offset: 0.88,
  },
];

function greatCirclePoint(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  t: number
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const toDeg = (value: number) => (value * 180) / Math.PI;

  const lat1 = toRad(start.lat);
  const lon1 = toRad(start.lng);
  const lat2 = toRad(end.lat);
  const lon2 = toRad(end.lng);

  const deltaLat = lat2 - lat1;
  const deltaLon = lon2 - lon1;

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  const distance = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  if (distance === 0) {
    return { lat: start.lat, lng: start.lng };
  }

  const aFactor = Math.sin((1 - t) * distance) / Math.sin(distance);
  const bFactor = Math.sin(t * distance) / Math.sin(distance);

  const x =
    aFactor * Math.cos(lat1) * Math.cos(lon1) +
    bFactor * Math.cos(lat2) * Math.cos(lon2);

  const y =
    aFactor * Math.cos(lat1) * Math.sin(lon1) +
    bFactor * Math.cos(lat2) * Math.sin(lon2);

  const z =
    aFactor * Math.sin(lat1) +
    bFactor * Math.sin(lat2);

  return {
    lat: toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))),
    lng: toDeg(Math.atan2(y, x)),
  };
}

function flightAltitude(route: FlightRoute, t: number) {
  // Visualized altitude in globe-radius units.
  // Real 50,000 ft is only a tiny fraction of Earth's radius, so the
  // value is intentionally exaggerated to make the climb visible on a globe.
  const climb = Math.sin(Math.PI * t);
  const smoothClimb = Math.pow(Math.max(0, climb), 0.78);
  return 0.012 + smoothClimb * route.cruiseAltitude;
}

function buildFlightPath(route: FlightRoute, points = 90) {
  return Array.from({ length: points }, (_, index) => {
    const t = index / (points - 1);
    const point = greatCirclePoint(route.start, route.end, t);

    return {
      ...point,
      altitude: flightAltitude(route, t),
    };
  });
}

const flightPaths = flightRoutes.map((route) => ({
  ...route,
  points: buildFlightPath(route),
}));

/* =========================================================
   REALISTIC A380 3D MODEL

   Model source:
   amvlab/aircraft-models — A380_nologo.glb
   License: CC BY 4.0
   https://github.com/amvlab/aircraft-models
========================================================= */

const A380_MODEL_URL = "/models/A380_nologo.glb";
const A380_MODEL_SCALE = 60.0;
const A380_BASE_SIZE = 1.8;;
const A380_MODEL_YAW_OFFSET = Math.PI / 2;

let a380Promise: Promise<THREE.Group> | null = null;

function loadA380Model() {
  if (a380Promise) return a380Promise;

  const loader = new GLTFLoader();

  a380Promise = new Promise<THREE.Group>((resolve, reject) => {
    loader.load(
      A380_MODEL_URL,
      (gltf) => {
        const source = gltf.scene as THREE.Group;

        source.traverse((child) => {
          const mesh = child as THREE.Mesh;

          if (mesh.isMesh) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        });

        resolve(source);
      },
      undefined,
      (error) => reject(error)
    );
  });

  return a380Promise;
}

function createA380Fallback(data: FlightRoute) {
  const group = new THREE.Group();

  const white = new THREE.MeshPhongMaterial({
    color: 0xf3f1eb,
    shininess: 90,
    specular: 0xffffff,
  });

  const dark = new THREE.MeshPhongMaterial({
    color: 0x30312d,
    shininess: 60,
  });

  const glass = new THREE.MeshPhongMaterial({
    color: 0x9fb5bd,
    transparent: true,
    opacity: 0.88,
    shininess: 120,
  });

  // Long double-deck-style fuselage.
  const lowerDeck = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.105, 0.82, 6, 14),
    white
  );
  lowerDeck.rotation.x = Math.PI / 2;
  lowerDeck.scale.set(1, 1, 1.2);
  group.add(lowerDeck);

  const upperDeck = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.07, 0.62, 6, 12),
    white
  );
  upperDeck.rotation.x = Math.PI / 2;
  upperDeck.position.y = 0.07;
  upperDeck.scale.set(1, 1, 1.15);
  group.add(upperDeck);

  const wings = new THREE.Mesh(
    new THREE.BoxGeometry(1.18, 0.035, 0.26),
    white
  );
  wings.position.z = 0.02;
  wings.rotation.y = -0.08;
  group.add(wings);

  const tailWings = new THREE.Mesh(
    new THREE.BoxGeometry(0.43, 0.03, 0.15),
    white
  );
  tailWings.position.z = -0.47;
  group.add(tailWings);

  const fin = new THREE.Mesh(
    new THREE.BoxGeometry(0.045, 0.27, 0.18),
    white
  );
  fin.position.set(0, 0.15, -0.44);
  group.add(fin);

  // Four engines = the visual signature of an A380.
  [-0.43, -0.145, 0.145, 0.43].forEach((x) => {
    const engine = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.06, 0.18, 12),
      dark
    );
    engine.rotation.x = Math.PI / 2;
    engine.position.set(x, -0.055, 0.015);
    group.add(engine);
  });

  const cockpit = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 12, 8),
    glass
  );
  cockpit.scale.set(0.7, 0.55, 1.35);
  cockpit.position.set(0, 0.07, 0.39);
  group.add(cockpit);

  group.scale.setScalar(2.0);
  group.userData.routeId = data.id;

  return group;
}

function create3DPlane(data: FlightRoute) {
  const group = createA380Fallback(data);

  group.userData.modelLoaded = false;

  loadA380Model()
    .then((source) => {
      if (group.userData.modelLoaded) return;

      const model = source.clone(true);

      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const longestSide = Math.max(size.x, size.y, size.z) || 1;

      model.position.sub(center);
     model.scale.setScalar(
  (A380_BASE_SIZE / longestSide) * A380_MODEL_SCALE
);
      model.rotation.y = A380_MODEL_YAW_OFFSET;

      model.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });

      group.clear();
      group.add(model);
      group.userData.modelLoaded = true;
    })
    .catch(() => {
      // Keep the detailed procedural A380-style fallback if the remote
      // model cannot be downloaded. The flight animation still works.
      group.userData.modelLoaded = false;
    });

  return group;
}

function update3DPlane(
  object: THREE.Object3D,
  data: FlightRoute & {
    lat: number;
    lng: number;
    altitude: number;
    nextLat: number;
    nextLng: number;
    nextAltitude: number;
  },
  globeRef: { current: any }
) {
  const globe = globeRef.current;
  if (!globe) return;

  const position = globe.getCoords(
    data.lat,
    data.lng,
    data.altitude
  );

  const next = globe.getCoords(
    data.nextLat,
    data.nextLng,
    data.nextAltitude
  );

  const currentVector = new THREE.Vector3(
    position.x,
    position.y,
    position.z
  );

  const nextVector = new THREE.Vector3(
    next.x,
    next.y,
    next.z
  );

  const up = currentVector.clone().normalize();

  const forward = nextVector
    .sub(currentVector)
    .normalize();

  // Keep the aircraft tangent to the local Earth surface while still
  // allowing the climb/descent component to create visible pitch.
  const radialComponent = forward.dot(up);
  const tangent = forward
    .clone()
    .sub(up.clone().multiplyScalar(radialComponent));

  if (tangent.lengthSq() < 0.000001) return;

  tangent.normalize();

  const right = up
    .clone()
    .cross(tangent)
    .normalize();

  const correctedUp = tangent
    .clone()
    .cross(right)
    .normalize();

  const rotationMatrix = new THREE.Matrix4().makeBasis(
    right,
    correctedUp,
    tangent
  );

  object.position.set(position.x, position.y, position.z);
  object.quaternion.setFromRotationMatrix(rotationMatrix);
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function HomePage() {
  /* ---------------------------------------------------------
     GLOBE REFERENCE
  --------------------------------------------------------- */

  const globeRef = useRef<any>(null);

  /* ---------------------------------------------------------
     SCROLL STATE
  --------------------------------------------------------- */

  const [scrollY, setScrollY] = useState(0);
  const [flightClock, setFlightClock] = useState(0);

  /* =========================================================
     SCROLL
  ========================================================= */

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });

        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  /* =========================================================
     MOVING FLIGHTS
  ========================================================= */

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduceMotion) return;

    const startedAt = Date.now();

    const timer = window.setInterval(() => {
      setFlightClock((Date.now() - startedAt) / 1000);
    }, 80);

    return () => window.clearInterval(timer);
  }, []);

  /* =========================================================
     EARTH AUTO ROTATION
     
     This directly rotates the actual Earth mesh.
     It does NOT rotate the complete container.
  ========================================================= */

useEffect(() => {
  let timer: ReturnType<typeof setInterval> | undefined;

  const startRotation = () => {
    if (!globeRef.current) {
      timer = setTimeout(startRotation, 100);
      return;
    }

    const controls = globeRef.current.controls();

    if (!controls) {
      timer = setTimeout(startRotation, 100);
      return;
    }

    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.0;

    controls.enableZoom = false;
    controls.enablePan = false;

    // IMPORTANT:
    // Do NOT set enableRotate = false.
    controls.enableRotate = true;
  };

  startRotation();

  return () => {
    if (timer) clearTimeout(timer);
  };
}, []);

  /* =========================================================
     REAL CLOUD LAYER
  ========================================================= */

  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    let clouds: THREE.Mesh | null = null;

    const addCloudLayer = () => {
      if (cancelled || !globeRef.current) {
        if (!cancelled) window.setTimeout(addCloudLayer, 100);
        return;
      }

      const globe = globeRef.current;
      const cloudTextureUrl =
        "https://cdn.jsdelivr.net/npm/three-globe/example/clouds/clouds.png";

      new THREE.TextureLoader().load(cloudTextureUrl, (texture) => {
        if (cancelled || !globeRef.current) return;

        clouds = new THREE.Mesh(
          new THREE.SphereGeometry(
            globe.getGlobeRadius() * 1.006,
            75,
            75
          ),
          new THREE.MeshPhongMaterial({
            map: texture,
            transparent: true,
            opacity: 0.78,
            depthWrite: false,
          })
        );

        globe.scene().add(clouds);

        const rotateClouds = () => {
          if (cancelled || !clouds) return;

          clouds.rotation.y -= 0.0007;
          frame = window.requestAnimationFrame(rotateClouds);
        };

        rotateClouds();
      });
    };

    addCloudLayer();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);

      if (clouds && globeRef.current) {
        globeRef.current.scene().remove(clouds);
        clouds.geometry.dispose();

        const material = clouds.material;
        if (material instanceof THREE.MeshPhongMaterial) {
          material.map?.dispose();
          material.dispose();
        }
      }
    };
  }, []);

  /* =========================================================
     SCROLL ANIMATION VALUES
  ========================================================= */

  const globeY = Math.min(scrollY * 0.055, 65);

  const globeScale = Math.max(
    0.86,
    1 - Math.min(scrollY / 7000, 0.1)
  );

  const orbitRotation = scrollY * 0.075;

  const movingPlanes = flightRoutes.map((route) => {
    const cycle =
      ((flightClock / route.duration) + route.offset) % 1;

    // One complete cycle is A -> B -> A.
    const progress =
      cycle <= 0.5
        ? cycle * 2
        : (1 - cycle) * 2;

    const movingForward = cycle <= 0.5;

    const position = greatCirclePoint(
      route.start,
      route.end,
      progress
    );

    const directionStep = movingForward ? 0.003 : -0.003;
    const nextProgress = Math.max(
      0,
      Math.min(1, progress + directionStep)
    );

    const nextPosition = greatCirclePoint(
      route.start,
      route.end,
      nextProgress
    );

    const altitude = flightAltitude(route, progress);
    const nextAltitude = flightAltitude(route, nextProgress);

    return {
      ...route,
      lat: position.lat,
      lng: position.lng,
      altitude,
      nextLat: nextPosition.lat,
      nextLng: nextPosition.lng,
      nextAltitude,
    };
  });

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5f1e7] text-[#181916]">

      {/* =====================================================
          GLOBAL GRID
      ====================================================== */}

      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.32]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(24,25,22,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(24,25,22,.055) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
          }}
        />
      </div>

      {/* =====================================================
          SOFT SKY GLOW
      ====================================================== */}

      <div className="pointer-events-none absolute left-1/2 top-[180px] z-0 h-[900px] w-[900px] -translate-x-1/2 rounded-full bg-[#d8ceb4]/20 blur-[120px]" />

      {/* =====================================================
          DECORATIVE STARS
      ====================================================== */}

      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">

        <span className="absolute left-[8%] top-[18%] h-1 w-1 rounded-full bg-[#806a37]/35" />
        <span className="absolute left-[18%] top-[31%] h-1.5 w-1.5 rounded-full bg-[#806a37]/20" />
        <span className="absolute left-[30%] top-[14%] h-1 w-1 rounded-full bg-[#806a37]/30" />
        <span className="absolute right-[12%] top-[20%] h-1.5 w-1.5 rounded-full bg-[#806a37]/25" />
        <span className="absolute right-[22%] top-[36%] h-1 w-1 rounded-full bg-[#806a37]/30" />
        <span className="absolute right-[7%] top-[47%] h-1 w-1 rounded-full bg-[#806a37]/20" />
        <span className="absolute left-[13%] top-[51%] h-1 w-1 rounded-full bg-[#806a37]/25" />
        <span className="absolute left-[25%] top-[64%] h-1.5 w-1.5 rounded-full bg-[#806a37]/20" />
        <span className="absolute right-[16%] top-[67%] h-1 w-1 rounded-full bg-[#806a37]/30" />

      </div>

      {/* =====================================================
          NAVBAR
      ====================================================== */}

      <header className="relative z-50 border-b border-[#292a25]/10 bg-[#f5f1e7]/85 backdrop-blur-xl">

        <div className="mx-auto flex h-[78px] max-w-[1280px] items-center justify-between px-5 sm:px-8 lg:px-10">

          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#191a18] text-sm font-bold text-white">
              T
            </span>

            <span className="font-serif text-[25px] font-bold tracking-[-0.04em]">
              TripWise
            </span>
          </Link>

          <nav className="hidden items-center gap-9 text-sm font-medium text-[#535149] md:flex">

            <a
              href="#how-it-works"
              className="transition hover:text-[#191a18]"
            >
              How it works
            </a>

            <a
              href="#features"
              className="transition hover:text-[#191a18]"
            >
              Features
            </a>

            <a
              href="#faq"
              className="transition hover:text-[#191a18]"
            >
              FAQ
            </a>

          </nav>

          <Link
            href="/login"
            className="group flex items-center gap-2 rounded-full bg-[#191a18] px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#292a26]"
          >
            Get started

            <ArrowUpRight
              size={15}
              className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>

        </div>

      </header>

      {/* =====================================================
          HERO
      ====================================================== */}

      <section className="relative z-10">

        <div className="mx-auto flex min-h-[calc(100vh-78px)] max-w-[1500px] flex-col items-center px-5 pt-10 sm:px-8 lg:px-10">

          {/* =================================================
              TOP LABEL
          ================================================== */}

          <div className="relative z-30 inline-flex items-center gap-2 rounded-full border border-[#75643e]/20 bg-[#eee5d2] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#806a37]">

            <Sparkles size={13} />

            Group travel · reimagined

          </div>

          {/* =================================================
              HERO GLOBE AREA
          ================================================== */}

          <div className="relative mt-1 flex h-[590px] w-full items-center justify-center overflow-visible sm:h-[700px] lg:h-[900px]">

            {/* =================================================
                ORBIT 1
            ================================================== */}

            <div
              className="absolute left-1/2 top-1/2 h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#806a37]/10 sm:h-[600px] sm:w-[600px] lg:h-[900px] lg:w-[900px]"
              style={{
                transform: `translate(-50%, -50%) rotate(${orbitRotation}deg)`,
              }}
            />

            {/* =================================================
                ORBIT 2
            ================================================== */}

            <div
              className="absolute left-1/2 top-1/2 h-[510px] w-[510px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[#806a37]/10 sm:h-[680px] sm:w-[680px] lg:h-[1020px] lg:w-[1020px]"
              style={{
                transform: `translate(-50%, -50%) rotate(${-orbitRotation * 0.7}deg)`,
              }}
            />

            {/* =================================================
                ORBIT 3
            ================================================== */}

            <div className="absolute left-1/2 top-1/2 hidden h-[1120px] w-[1120px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#806a37]/[0.06] xl:block" />

            {/* =================================================
                ATMOSPHERIC GLOW
            ================================================== */}

            <div className="absolute left-1/2 top-1/2 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#a99668]/10 blur-[100px] sm:h-[620px] sm:w-[620px] lg:h-[850px] lg:w-[850px]" />

            {/* =================================================
                CLOUD DECORATION
            ================================================== */}

            <div
              className="absolute left-[7%] top-[20%] z-[5] hidden h-[80px] w-[180px] rounded-full bg-white/35 blur-xl lg:block"
              style={{
                transform: `translateX(${scrollY * 0.025}px)`,
              }}
            />

            <div
              className="absolute right-[7%] top-[18%] z-[5] hidden h-[65px] w-[150px] rounded-full bg-white/30 blur-xl lg:block"
              style={{
                transform: `translateX(${-scrollY * 0.02}px)`,
              }}
            />

            <div className="absolute bottom-[17%] left-[15%] z-[5] hidden h-[55px] w-[120px] rounded-full bg-white/25 blur-xl lg:block" />

            {/* =================================================
                AIRPLANE — LEFT
            ================================================== */}

            <div className="absolute left-[7%] top-[32%] z-30 hidden lg:block">

              <div
                className="plane-one"
                style={{
                  transform: `translateY(${scrollY * -0.035}px)`,
                }}
              >

                <div className="flex items-center gap-2 text-[#6f674f]/70">

                  <Plane
                    size={28}
                    strokeWidth={1.5}
                    className="rotate-[-20deg]"
                  />

                  <span className="rounded-full border border-[#292a25]/10 bg-[#faf7ef]/80 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.15em] backdrop-blur-md">
                    Mumbai → Goa
                  </span>

                </div>

                <div className="ml-8 mt-1 h-px w-[120px] border-t border-dashed border-[#806a37]/25" />

              </div>

            </div>

            {/* =================================================
                AIRPLANE — RIGHT
            ================================================== */}

            <div className="absolute right-[7%] top-[43%] z-30 hidden lg:block">

              <div
                className="plane-two"
                style={{
                  transform: `translateY(${scrollY * 0.03}px)`,
                }}
              >

                <div className="flex items-center gap-2">

                  <span className="rounded-full border border-[#292a25]/10 bg-white/75 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.15em] text-[#777269] backdrop-blur-md">
                    Delhi → Dubai
                  </span>

                  <Plane
                    size={25}
                    strokeWidth={1.5}
                    className="rotate-[160deg] text-[#6f674f]/70"
                  />

                </div>

                <div className="mr-8 mt-1 ml-auto h-px w-[110px] border-t border-dashed border-[#806a37]/25" />

              </div>

            </div>

            {/* =================================================
                SATELLITE
            ================================================== */}

            <div
              className="absolute right-[15%] top-[12%] z-20 hidden lg:block"
              style={{
                transform: `translateY(${scrollY * -0.04}px) rotate(${scrollY * 0.08}deg)`,
              }}
            >

              <div className="relative h-10 w-10">

                <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#806a37]" />

                <div className="absolute left-0 top-1/2 h-3 w-7 -translate-y-1/2 border border-[#806a37]/30 bg-[#e9e1cf]" />

                <div className="absolute right-0 top-1/2 h-3 w-7 -translate-y-1/2 border border-[#806a37]/30 bg-[#e9e1cf]" />

                <div className="absolute left-1/2 top-0 h-10 w-px -translate-x-1/2 bg-[#806a37]/20" />

              </div>

            </div>

            {/* =================================================
                COMPASS
            ================================================== */}

            <div
              className="absolute left-[13%] top-[16%] z-20 hidden lg:block"
              style={{
                transform: `rotate(${-scrollY * 0.04}deg)`,
              }}
            >

              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#806a37]/15 bg-[#faf7ef]/50 backdrop-blur-md">

                <Compass
                  size={29}
                  strokeWidth={1.2}
                  className="text-[#806a37]/55"
                />

              </div>

            </div>

            {/* =================================================
                DESTINATION MARKER
            ================================================== */}

            <div className="absolute bottom-[23%] right-[14%] z-30 hidden lg:block">

              <div className="flex items-center gap-2 rounded-full border border-[#292a25]/10 bg-white/80 px-3 py-2 shadow-[0_10px_30px_rgba(44,40,29,.07)] backdrop-blur-md">

                <MapPin
                  size={13}
                  className="text-[#806a37]"
                />

                <span className="text-[10px] font-bold">
                  Goa
                </span>

              </div>

            </div>

            {/* =================================================
                CENTRAL EARTH
                820 x 820
            ================================================== */}

            <div
              className="relative z-10"
              style={{
                transform: `
                  translateY(${globeY}px)
                  scale(${globeScale})
                `,
                transition: "transform 0.12s linear",
              }}
            >

              {/* Outer atmosphere */}

              <div className="pointer-events-none absolute -inset-[65px] rounded-full bg-[#94815a]/10 blur-[55px]" />

              {/* Earth container */}

              <div className="relative h-[1000px] w-[1000px] max-w-[95vw] max-h-[95vw]">

                <Globe
                  ref={globeRef}
                  width={1000}
                  height={1000}
                  backgroundColor="rgba(0,0,0,0)"
                  globeImageUrl="https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg"
                  bumpImageUrl="https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png"
                  showAtmosphere={true}
                  atmosphereColor="#8b7a51"
                  atmosphereAltitude={0.075}
                  enablePointerInteraction={false}
                  pathsData={flightPaths}
                  pathPoints="points"
                  pathPointLat="lat"
                  pathPointLng="lng"
                  pathPointAlt="altitude"
                  // Bright dotted/dashed tracks. The aircraft and track use
                  // separate colors so the route stays visible behind the plane.
                  pathColor={(route: object) => (route as FlightRoute).trackColor}
                  pathStroke={0.8}
                  pathDashLength={0.035}
                  pathDashGap={0.045}
                  pathDashAnimateTime={(route: object) => (route as FlightRoute).duration * 850}
                  pathTransitionDuration={0}

                  // Real Three.js aircraft. customThreeObjectUpdate keeps the
                  // existing 3D meshes and only updates their position/rotation,
                  // avoiding a new geometry allocation every 80 ms.
                  customLayerData={movingPlanes}
                  customLayerLabel={(data: any) =>
                    `${data.from} → ${data.to}`
                  }
                  customThreeObject={(data: any) =>
                    create3DPlane(data)
                  }
                  customThreeObjectUpdate={(object: THREE.Object3D, data: any) =>
                    update3DPlane(object, data, globeRef)
                  }

                  animateIn={true}
                />

                {/* Earth outline */}

                <div className="pointer-events-none absolute inset-0 rounded-full border border-[#806a37]/15" />

                {/* Inner outline */}

                <div className="pointer-events-none absolute inset-[9px] rounded-full border border-white/10" />

              </div>

            </div>

            {/* =================================================
                FLOATING TRIP CARD
            ================================================== */}

            <div
              className="absolute left-[3%] top-[55%] z-30 hidden w-[185px] -rotate-3 rounded-[22px] border border-[#292a25]/10 bg-[#faf7ef]/90 p-4 shadow-[0_18px_45px_rgba(44,40,29,.09)] backdrop-blur-xl lg:block"
              style={{
                transform: `translateY(${scrollY * 0.03}px) rotate(-3deg)`,
              }}
            >

              <div className="flex items-center gap-2">

                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8e1d3]">
                  <Navigation size={14} />
                </span>

                <span className="text-xs font-bold">
                  Next stop
                </span>

              </div>

              <div className="mt-3 font-serif text-xl">
                Goa
              </div>

              <p className="mt-1 text-[10px] text-[#777269]">
                586 km · 4 travellers
              </p>

              <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#e4ded1]">

                <div className="h-full w-[72%] rounded-full bg-[#8b7a51]" />

              </div>

            </div>

            {/* =================================================
                BALANCE CARD
            ================================================== */}

            <div
              className="absolute right-[3%] top-[61%] z-30 hidden w-[180px] rotate-3 rounded-[22px] border border-[#292a25]/10 bg-white/85 p-4 shadow-[0_18px_45px_rgba(44,40,29,.09)] backdrop-blur-xl lg:block"
              style={{
                transform: `translateY(${scrollY * -0.025}px) rotate(3deg)`,
              }}
            >

              <div className="flex items-center gap-2">

                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#dce8d4]">
                  <Wallet size={14} />
                </span>

                <span className="text-xs font-bold">
                  Trip balance
                </span>

              </div>

              <div className="mt-3 font-serif text-2xl">
                ₹6,840
              </div>

              <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-[#50644a]">

                <Check size={11} />

                Everything synced

              </div>

            </div>

          </div>

          {/* =================================================
              HERO COPY
          ================================================== */}

          <div className="relative z-30 -mt-10 max-w-[850px] text-center sm:-mt-8">

            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#806a37]">
              One trip · One shared space
            </p>

            <h1 className="mt-4 font-serif text-[clamp(3rem,6vw,5.8rem)] leading-[0.9] tracking-[-0.065em]">

              Travel together,

              <br />

              <span className="text-[#7c786f]">
                Settle smarter.
              </span>

            </h1>

            <p className="mx-auto mt-6 max-w-[620px] text-[16px] leading-7 text-[#625f57] sm:text-[18px]">
              Plan the journey, track every shared expense, split bills
              fairly, and know exactly who owes whom.
            </p>

            {/* BUTTONS */}

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">

              <Link
                href="/login"
                className="group inline-flex items-center justify-center gap-3 rounded-full bg-[#191a18] px-7 py-4 text-sm font-bold text-white shadow-[0_14px_35px_rgba(25,26,24,.14)] transition hover:-translate-y-1"
              >
                Start a trip

                <ArrowRight
                  size={17}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>

              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#292a25]/15 bg-[#faf7ef] px-7 py-4 text-sm font-bold text-[#292a25] transition hover:bg-white"
              >
                See how it works
              </a>

            </div>

            {/* TRUST */}

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-[#777269]">

              <div className="flex items-center gap-2">

                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#dfe8d9] text-[#496044]">
                  <Check size={13} />
                </span>

                Shared expenses

              </div>

              <div className="flex items-center gap-2">

                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e8dfd0] text-[#715f3e]">
                  <Check size={13} />
                </span>

                Fair splitting

              </div>

              <div className="flex items-center gap-2">

                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#dce6e9] text-[#4d6871]">
                  <Check size={13} />
                </span>

                Simple settlement

              </div>

            </div>

          </div>

          {/* =================================================
              SCROLL
          ================================================== */}

          <div className="mt-10 flex flex-col items-center gap-2 pb-14 text-[#8a857c]">

            <span className="text-[9px] font-bold uppercase tracking-[0.25em]">
              Explore TripWise
            </span>

            <div className="flex h-9 w-6 items-start justify-center rounded-full border border-[#292a25]/20 p-1.5">

              <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#806a37]" />

            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          HOW IT WORKS
      ====================================================== */}

      <section
        id="how-it-works"
        className="relative z-20 border-t border-[#292a25]/10 bg-[#ece7da]"
      >

        <div className="mx-auto max-w-[1280px] px-5 py-24 sm:px-8 lg:px-10">

          <div className="mx-auto max-w-[700px] text-center">

            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#806a37]">
              How TripWise works
            </p>

            <h2 className="mt-4 font-serif text-4xl leading-tight tracking-[-0.045em] sm:text-5xl">
              From “who paid?”
              <br />
              to “all settled.”
            </h2>

            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[#69655c]">
              TripWise keeps your group trip organized without turning
              one person into the unofficial accountant.
            </p>

          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-3">

            <FeatureStep
              number="01"
              icon={<Users size={19} />}
              title="Create the trip"
              text="Add your friends, dates, destination, bookings and shared plans."
            />

            <FeatureStep
              number="02"
              icon={<Receipt size={19} />}
              title="Track everything"
              text="Record expenses and split them equally, by item, percentage or exact amount."
            />

            <FeatureStep
              number="03"
              icon={<Wallet size={19} />}
              title="Settle up"
              text="TripWise calculates who owes whom and keeps every payment in one place."
            />

          </div>

        </div>

      </section>

      {/* =====================================================
          FEATURES
      ====================================================== */}

      <section
        id="features"
        className="relative z-20 bg-[#f5f1e7]"
      >

        <div className="mx-auto max-w-[1280px] px-5 py-24 sm:px-8 lg:px-10">

          <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end">

            <div>

              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#806a37]">
                Built for group trips
              </p>

              <h2 className="mt-4 font-serif text-4xl tracking-[-0.045em] sm:text-5xl">
                Less chasing.
                <br />
                More travelling.
              </h2>

            </div>

            <p className="max-w-xl text-[16px] leading-7 text-[#69655c]">
              Everything your group needs to keep the trip organized without
              spreadsheets, awkward calculations, or endless payment messages.
            </p>

          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <MiniFeature
              icon={<Receipt size={18} />}
              title="Smart expenses"
              text="Keep every shared cost attached to the trip."
            />

            <MiniFeature
              icon={<CircleDollarSign size={18} />}
              title="Fair splits"
              text="Split by person, item, percentage or exact amount."
            />

            <MiniFeature
              icon={<Sparkles size={18} />}
              title="AI assistance"
              text="Turn receipts into structured expenses faster."
            />

            <MiniFeature
              icon={<Wallet size={18} />}
              title="Simple settlement"
              text="See exactly who needs to pay whom."
            />

          </div>

        </div>

      </section>

      {/* =====================================================
          TRAVEL STATEMENT
      ====================================================== */}

      <section className="relative z-20 overflow-hidden border-y border-[#292a25]/10 bg-[#e9e3d5]">

        <div className="pointer-events-none absolute left-0 top-1/2 h-px w-full border-t border-dashed border-[#806a37]/15" />

        <div className="mx-auto max-w-[1100px] px-5 py-28 text-center sm:px-8">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#191a18] text-white">
            <Plane size={21} className="rotate-[-15deg]" />
          </div>

          <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.22em] text-[#806a37]">
            Wherever the trip takes you
          </p>

          <h2 className="mx-auto mt-4 max-w-3xl font-serif text-4xl leading-[0.95] tracking-[-0.055em] sm:text-6xl">
            Your group sees the journey.

            <br />

            <span className="text-[#7c786f]">
              TripWise handles the math.
            </span>
          </h2>

        </div>

      </section>

      {/* =====================================================
          CTA
      ====================================================== */}

      <section className="relative z-20 bg-[#191a18] text-white">

        <div className="mx-auto max-w-[1280px] px-5 py-24 text-center sm:px-8 lg:px-10">

          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#c6b98e]">
            Your next trip starts here
          </p>

          <h2 className="mx-auto mt-5 max-w-3xl font-serif text-5xl leading-[0.95] tracking-[-0.055em] sm:text-7xl">
            Make memories.

            <br />

            <span className="text-[#aaa397]">
              Leave the math to TripWise.
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-white/55">
            One shared space for planning, expenses, receipts, balances
            and settlement.
          </p>

          <Link
            href="/login"
            className="mt-9 inline-flex items-center gap-3 rounded-full bg-[#f4eee0] px-7 py-4 text-sm font-bold text-[#191a18] transition hover:-translate-y-1"
          >
            Start your trip

            <ArrowRight size={17} />
          </Link>

        </div>

      </section>

      {/* =====================================================
          FAQ
      ====================================================== */}

      <section
        id="faq"
        className="relative z-20 bg-[#f5f1e7]"
      >

        <div className="mx-auto max-w-[900px] px-5 py-24 sm:px-8">

          <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-[#806a37]">
            FAQ
          </p>

          <h2 className="mt-4 text-center font-serif text-4xl tracking-[-0.04em]">
            Questions, answered.
          </h2>

          <div className="mt-10 divide-y divide-[#292a25]/10 border-y border-[#292a25]/10">

            <Faq
              question="Can everyone in the trip add expenses?"
              answer="Yes. TripWise is designed around shared trip activity, so group members can contribute expenses and keep the ledger together."
            />

            <Faq
              question="Can different expenses have different splits?"
              answer="Yes. Expenses can be split using different methods depending on what the group decides."
            />

            <Faq
              question="Does TripWise calculate who owes whom?"
              answer="Yes. The settlement view uses the trip expenses and completed payments to calculate the current balances."
            />

          </div>

        </div>

      </section>

      {/* =====================================================
          FOOTER
      ====================================================== */}

      <footer className="relative z-20 border-t border-[#292a25]/10 bg-[#f5f1e7]">

        <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-5 py-7 text-xs text-[#777269] sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">

          <div className="flex items-center gap-2">

            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#191a18] text-[10px] font-bold text-white">
              T
            </span>

            <span className="font-bold text-[#292a25]">
              TripWise
            </span>

          </div>

          <div className="text-right">
            <p>
              Group travel, without the awkward math.
            </p>
            <p className="mt-1 text-[9px] text-[#918b80]">
              A380 3D model: amvlab aircraft-models · CC BY 4.0
            </p>
          </div>

        </div>

      </footer>

      {/* =====================================================
          MOBILE BUTTON
      ====================================================== */}

      <Link
        href="/login"
        className="fixed bottom-5 right-5 z-[100] flex h-12 w-12 items-center justify-center rounded-full bg-[#191a18] text-white shadow-xl md:hidden"
      >
        <ArrowUpRight size={19} />
      </Link>

      {/* =====================================================
          CUSTOM ANIMATIONS
      ====================================================== */}

      <style jsx>{`

        /* -----------------------------------------------
           EXISTING DECORATIVE AIRPLANES
           Kept exactly as part of the original design.
        ------------------------------------------------ */

        .plane-one {
          animation: planeOne 7s ease-in-out infinite;
        }

        @keyframes planeOne {
          0% {
            transform: translateX(0px) translateY(0px);
          }

          50% {
            transform: translateX(35px) translateY(-18px);
          }

          100% {
            transform: translateX(0px) translateY(0px);
          }
        }

        .plane-two {
          animation: planeTwo 8s ease-in-out infinite;
        }

        @keyframes planeTwo {
          0% {
            transform: translateX(0px) translateY(0px);
          }

          50% {
            transform: translateX(-40px) translateY(16px);
          }

          100% {
            transform: translateX(0px) translateY(0px);
          }
        }

        /* -----------------------------------------------
           GLOBE FLIGHT MICRO-MOTION
        ------------------------------------------------ */

        .globe-flight-plane {
          will-change: transform;
        }

        /* -----------------------------------------------
           ACCESSIBILITY
        ------------------------------------------------ */

        @media (prefers-reduced-motion: reduce) {
          .plane-one,
          .plane-two {
            animation: none;
          }
        }

      `}</style>

    </main>
  );
}

/* =========================================================
   FEATURE STEP
========================================================= */

function FeatureStep({
  number,
  icon,
  title,
  text,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="group rounded-[28px] border border-[#292a25]/10 bg-[#f8f5ec] p-7 transition duration-300 hover:-translate-y-2 hover:bg-white hover:shadow-[0_25px_60px_rgba(44,40,29,.08)]">

      <div className="flex items-center justify-between">

        <span className="font-serif text-3xl text-[#aaa397]">
          {number}
        </span>

        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e6dfd0] transition group-hover:bg-[#191a18] group-hover:text-white">
          {icon}
        </span>

      </div>

      <h3 className="mt-10 font-serif text-2xl tracking-[-0.03em]">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-[#777269]">
        {text}
      </p>

    </div>
  );
}

/* =========================================================
   MINI FEATURE
========================================================= */

function MiniFeature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="group rounded-[24px] border border-[#292a25]/10 bg-[#faf7ef] p-5 transition duration-300 hover:-translate-y-1 hover:bg-white">

      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e8e1d3] transition group-hover:bg-[#191a18] group-hover:text-white">
        {icon}
      </span>

      <h3 className="mt-6 font-serif text-xl">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-[#777269]">
        {text}
      </p>

    </div>
  );
}

/* =========================================================
   FAQ
========================================================= */

function Faq({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <details className="group py-5">

      <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-left font-medium">

        <span>
          {question}
        </span>

        <ChevronDown
          size={18}
          className="shrink-0 transition-transform group-open:rotate-180"
        />

      </summary>

      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#777269]">
        {answer}
      </p>

    </details>
  );
}