'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface EvidenceGraph3DProps {
  claimsCount?: number;
  sourcesCount?: number;
  className?: string;
}

export function EvidenceGraph3D({
  claimsCount = 4,
  sourcesCount = 12,
  className = 'w-full h-full min-h-[380px]',
}: EvidenceGraph3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webGLSupported, setWebGLSupported] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebGLSupported(false);
        return;
      }
    } catch {
      setWebGLSupported(false);
      return;
    }

    const scene = new THREE.Scene();
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 380;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 1.5, 8.5);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.replaceChildren(renderer.domElement);

    // Root Claim Group
    const graphGroup = new THREE.Group();
    scene.add(graphGroup);

    // Create Claim Nodes
    const claimGeo = new THREE.SphereGeometry(0.22, 16, 16);
    const claimMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#38BDF8'),
      emissive: new THREE.Color('#0284C7'),
      emissiveIntensity: 0.4,
      metalness: 0.5,
      roughness: 0.2,
    });

    const sourceGeo = new THREE.SphereGeometry(0.12, 12, 12);
    const sourceMatVerified = new THREE.MeshBasicMaterial({ color: new THREE.Color('#10B981') });
    const sourceMatContradict = new THREE.MeshBasicMaterial({ color: new THREE.Color('#EF4444') });
    const sourceMatNeutral = new THREE.MeshBasicMaterial({ color: new THREE.Color('#F59E0B') });

    const claims: THREE.Mesh[] = [];
    const curvePoints: THREE.Vector3[] = [];

    for (let c = 0; c < claimsCount; c++) {
      const claimMesh = new THREE.Mesh(claimGeo, claimMat);
      const angle = (c / claimsCount) * Math.PI * 2;
      const x = Math.cos(angle) * 1.8;
      const y = Math.sin(angle) * 0.9;
      const z = (c % 2 === 0 ? 0.3 : -0.3);
      claimMesh.position.set(x, y, z);
      graphGroup.add(claimMesh);
      claims.push(claimMesh);

      // Add sources per claim
      const sourcesPerClaim = Math.ceil(sourcesCount / claimsCount);
      for (let s = 0; s < sourcesPerClaim; s++) {
        const mat = (s + c) % 5 === 0 ? sourceMatContradict : (s + c) % 3 === 0 ? sourceMatNeutral : sourceMatVerified;
        const sourceMesh = new THREE.Mesh(sourceGeo, mat);
        const subAngle = angle + ((s - sourcesPerClaim / 2) * 0.45);
        const sx = Math.cos(subAngle) * 3.6 + (Math.random() - 0.5) * 0.4;
        const sy = Math.sin(subAngle) * 2.2 + (Math.random() - 0.5) * 0.4;
        const sz = (Math.random() - 0.5) * 1.5;
        sourceMesh.position.set(sx, sy, sz);
        graphGroup.add(sourceMesh);

        // Build Connecting Curve
        const midPoint = new THREE.Vector3(
          (x + sx) / 2,
          (y + sy) / 2 + 0.3,
          (z + sz) / 2
        );
        const curve = new THREE.QuadraticBezierCurve3(claimMesh.position, midPoint, sourceMesh.position);
        const points = curve.getPoints(20);
        const curveGeo = new THREE.BufferGeometry().setFromPoints(points);
        const curveColor = mat === sourceMatContradict ? '#EF4444' : mat === sourceMatNeutral ? '#F59E0B' : '#10B981';
        const curveMat = new THREE.LineBasicMaterial({
          color: new THREE.Color(curveColor),
          transparent: true,
          opacity: 0.35,
        });
        const line = new THREE.Line(curveGeo, curveMat);
        graphGroup.add(line);
      }
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 2);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    // Animation Loop
    let isVisible = true;
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    });
    observer.observe(container);

    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (!isVisible) return;
      const elapsed = clock.getElapsedTime();
      graphGroup.rotation.y = elapsed * 0.15;
      graphGroup.rotation.x = Math.sin(elapsed * 0.1) * 0.08;
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
    };
  }, [claimsCount, sourcesCount]);

  if (!webGLSupported) {
    return null;
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute top-3 right-3 flex items-center gap-3 px-3 py-1.5 rounded-full surface-beta text-[11px] font-mono-code text-slate-400">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> ENTAILMENT</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> NEUTRAL</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-400" /> CONTRADICTION</span>
      </div>
    </div>
  );
}
