'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface TrustCore3DProps {
  status?: 'idle' | 'verifying' | 'verified' | 'contradiction';
  trustScore?: number;
  className?: string;
}

export function TrustCore3D({
  status = 'idle',
  trustScore = 92,
  className = 'w-full h-full min-h-[420px]',
}: TrustCore3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webGLSupported, setWebGLSupported] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Check WebGL support
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

    // 2. Scene Setup
    const scene = new THREE.Scene();
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 420;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 7.5);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.replaceChildren(renderer.domElement);

    // 3. Central Trust Geometry (Icosahedron Core + Wireframe Cage)
    const coreGeo = new THREE.IcosahedronGeometry(1.6, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#38BDF8'),
      emissive: new THREE.Color('#0284C7'),
      emissiveIntensity: 0.35,
      metalness: 0.85,
      roughness: 0.2,
      wireframe: false,
      transparent: true,
      opacity: 0.85,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    // Outer Wireframe Cage
    const cageGeo = new THREE.IcosahedronGeometry(2.4, 2);
    const cageMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#0EA5E9'),
      wireframe: true,
      transparent: true,
      opacity: 0.22,
    });
    const cageMesh = new THREE.Mesh(cageGeo, cageMat);
    scene.add(cageMesh);

    // Orbiting Claim & Evidence Nodes
    const nodesGroup = new THREE.Group();
    const nodeCount = 18;
    const nodeGeo = new THREE.SphereGeometry(0.08, 12, 12);
    const nodeMatVerified = new THREE.MeshBasicMaterial({ color: new THREE.Color('#10B981') });
    const nodeMatActive = new THREE.MeshBasicMaterial({ color: new THREE.Color('#38BDF8') });
    const nodeMatContradiction = new THREE.MeshBasicMaterial({ color: new THREE.Color('#EF4444') });

    for (let i = 0; i < nodeCount; i++) {
      const mat = i % 4 === 0 ? nodeMatContradiction : i % 2 === 0 ? nodeMatVerified : nodeMatActive;
      const node = new THREE.Mesh(nodeGeo, mat);
      const theta = (i / nodeCount) * Math.PI * 2;
      const radius = 2.8 + (i % 3) * 0.4;
      node.position.set(
        Math.cos(theta) * radius,
        (Math.sin(theta * 2) * 0.8),
        Math.sin(theta) * radius
      );
      nodesGroup.add(node);
    }
    scene.add(nodesGroup);

    // Dynamic Connecting Beams
    const lineMat = new THREE.LineBasicMaterial({
      color: new THREE.Color('#38BDF8'),
      transparent: true,
      opacity: 0.15,
    });
    const lineGeo = new THREE.BufferGeometry();
    const positions: number[] = [];
    nodesGroup.children.forEach((child) => {
      positions.push(0, 0, 0);
      positions.push(child.position.x, child.position.y, child.position.z);
    });
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lines);

    // Background Volumetric Particle Field
    const particleCount = 120;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePos[i] = (Math.random() - 0.5) * 16;
      particlePos[i + 1] = (Math.random() - 0.5) * 16;
      particlePos[i + 2] = (Math.random() - 0.5) * 16;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.05,
      color: new THREE.Color('#64748B'),
      transparent: true,
      opacity: 0.4,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0x38bdf8, 2.5);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x10b981, 3, 10);
    pointLight.position.set(-4, -2, 2);
    scene.add(pointLight);

    // Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop with Performance Throttling
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

      // Smooth mouse follow
      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      coreMesh.rotation.x = elapsed * 0.2 + targetY * 0.4;
      coreMesh.rotation.y = elapsed * 0.25 + targetX * 0.4;

      cageMesh.rotation.x = -elapsed * 0.15 + targetY * 0.2;
      cageMesh.rotation.y = -elapsed * 0.18 + targetX * 0.2;

      nodesGroup.rotation.y = elapsed * 0.12;
      nodesGroup.rotation.x = Math.sin(elapsed * 0.2) * 0.1;

      particles.rotation.y = elapsed * 0.02;

      // Status color shift
      if (status === 'verified') {
        coreMat.color.set('#10B981');
        coreMat.emissive.set('#059669');
      } else if (status === 'contradiction') {
        coreMat.color.set('#EF4444');
        coreMat.emissive.set('#DC2626');
      } else if (status === 'verifying') {
        coreMat.color.set('#38BDF8');
        coreMat.emissive.set('#0284C7');
        coreMesh.scale.setScalar(1 + Math.sin(elapsed * 4) * 0.06);
      } else {
        coreMat.color.set('#38BDF8');
        coreMat.emissive.set('#0284C7');
        coreMesh.scale.setScalar(1);
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
    };
  }, [status]);

  if (!webGLSupported) {
    return (
      <div className={`flex items-center justify-center surface-beta rounded-2xl p-8 ${className}`}>
        <div className="text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 animate-pulse">
            <span className="font-mono-code font-bold text-lg">{trustScore}%</span>
          </div>
          <p className="text-xs text-slate-400 font-mono-code">Trust Boundary Active</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div ref={containerRef} className="w-full h-full" />
      {/* Subtle UI Overlay Badge */}
      <div className="absolute bottom-4 left-4 pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-full surface-beta text-[11px] font-mono-code text-slate-400">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        <span>CORE // {status.toUpperCase()}</span>
        <span className="text-slate-600">|</span>
        <span className="text-cyan-400">{trustScore}% TRUST</span>
      </div>
    </div>
  );
}
