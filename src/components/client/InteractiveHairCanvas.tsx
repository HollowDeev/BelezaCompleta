"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

interface HairStrandNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  restX: number;
  restY: number;
}

interface HairStrand {
  id: number;
  rootX: number;
  rootY: number;
  nodes: HairStrandNode[];
  length: number;
  baseWidth: number;
  colorStops: string[];
  curlPhase: number;
  curlFrequency: number;
  stiffness: number;
  damping: number;
}

interface InteractiveHairCanvasProps {
  className?: string;
  portraitSrc?: string;
  onHairTouched?: () => void;
}

export function InteractiveHairCanvas({
  className = "",
  portraitSrc = "/brand/hero_models.png",
  onHairTouched,
}: InteractiveHairCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Estados de Interação
  const [hasInteracted, setHasInteracted] = useState(false);
  const pointerPos = useRef({
    x: -1000,
    y: -1000,
    prevX: -1000,
    prevY: -1000,
    vx: 0,
    vy: 0,
    active: false,
  });
  const tiltMotion = useRef({ x: 0, y: 0 });

  // Geração das Mechas de Cabelo Físicas
  const strandsRef = useRef<HairStrand[]>([]);

  const initStrands = useCallback((width: number, height: number) => {
    const strands: HairStrand[] = [];
    const strandCount = 42; // Densidade harmônica para fluidez a 60fps
    const rootStartX = width * 0.38;
    const rootSpanX = width * 0.52;
    const rootStartY = height * 0.08;

    const luxuryTones = [
      ["#80611F", "#C7A03A", "#F5E09A", "#FFF9E6"], // Loiro Dourado Acetinado
      ["#2A1D13", "#5C4028", "#C7A03A", "#D9B85F"], // Morena Iluminada Avelã
      ["#1D3D3C", "#707956", "#C7A03A", "#F6ECCF"], // Mecha Assinatura Verde-Dourada
      ["#80611F", "#D9B85F", "#FCF5EB", "#FFFFFF"], // Ponto de Luz Glossy
      ["#8B3A2B", "#C05E46", "#E8A282", "#FFF0E6"], // Ruivo Cobre Iluminado
    ];

    for (let i = 0; i < strandCount; i++) {
      const t = i / (strandCount - 1);
      const rootX = rootStartX + t * rootSpanX + Math.sin(i * 3.1) * 18;
      const rootY = rootStartY + Math.cos(i * 1.7) * 22 + t * 24;
      const strandLength = height * (0.68 + Math.sin(i * 0.8) * 0.16);

      const nodeCount = 7;
      const nodes: HairStrandNode[] = [];
      const segmentLen = strandLength / (nodeCount - 1);

      // Curvatura natural que contorna o rosto e desce pelos ombros
      const curveBias = (t - 0.45) * (width * 0.26);

      for (let j = 0; j < nodeCount; j++) {
        const segT = j / (nodeCount - 1);
        const curveOffset = Math.sin(segT * Math.PI) * curveBias;
        const restX = rootX + curveOffset + Math.sin(j * 0.85 + i) * 14;
        const restY = rootY + j * segmentLen;

        nodes.push({
          x: restX,
          y: restY,
          vx: 0,
          vy: 0,
          restX,
          restY,
        });
      }

      strands.push({
        id: i,
        rootX,
        rootY,
        nodes,
        length: strandLength,
        baseWidth: 1.6 + Math.random() * 2.2,
        colorStops: luxuryTones[i % luxuryTones.length],
        curlPhase: Math.random() * Math.PI * 2,
        curlFrequency: 1.1 + Math.random() * 0.8,
        stiffness: 0.042 + Math.random() * 0.02,
        damping: 0.87 + Math.random() * 0.05,
      });
    }

    strandsRef.current = strands;
  }, []);

  // Loop de Física e Renderização Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = container.clientWidth;
    let height = container.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      if (!container || !canvas) return;
      width = container.clientWidth;
      height = container.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      initStrands(width, height);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    // Suporte ao Giroscópio do Celular (Tilt Motion)
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null) {
        tiltMotion.current.x = (e.gamma / 45) * 16;
      }
    };
    if (typeof window !== "undefined" && window.DeviceOrientationEvent) {
      window.addEventListener("deviceorientation", handleOrientation, { passive: true });
    }

    let time = 0;

    const render = () => {
      time += 0.022;
      ctx.clearRect(0, 0, width, height);

      // Calcular velocidade do cursor
      const ptr = pointerPos.current;
      ptr.vx = (ptr.x - ptr.prevX) * 0.35;
      ptr.vy = (ptr.y - ptr.prevY) * 0.35;
      ptr.prevX = ptr.x;
      ptr.prevY = ptr.y;

      const strands = strandsRef.current;

      for (let s = 0; s < strands.length; s++) {
        const strand = strands[s];
        const nodes = strand.nodes;

        // Brisa Orgânica natural de estúdio (vento sutil contínuo)
        const windBase = Math.sin(time * strand.curlFrequency + strand.curlPhase) * 1.4;
        const windGust = Math.cos(time * 0.55 + s * 0.22) * 2.0;
        const totalAmbientWind = windBase + windGust + tiltMotion.current.x;

        for (let i = 1; i < nodes.length; i++) {
          const node = nodes[i];
          const progress = i / (nodes.length - 1);

          // Força elástica de retorno
          const fx = (node.restX - node.x) * strand.stiffness;
          const fy = (node.restY - node.y) * strand.stiffness;

          node.vx = (node.vx + fx + totalAmbientWind * progress * 0.42) * strand.damping;
          node.vy = (node.vy + fy) * strand.damping;

          // Reação com o Cursor ou Toque (Aerodynamic Repulsion)
          if (ptr.active || (ptr.x > 0 && ptr.y > 0)) {
            const dx = node.x - ptr.x;
            const dy = node.y - ptr.y;
            const dist = Math.hypot(dx, dy);
            const radius = 140;

            if (dist < radius && dist > 0) {
              const force = (1 - dist / radius) * 6.5;
              const angle = Math.atan2(dy, dx);

              node.vx += Math.cos(angle) * force + ptr.vx * 0.35;
              node.vy += Math.sin(angle) * force + ptr.vy * 0.25;
            }
          }

          node.x += node.vx;
          node.y += node.vy;
        }

        // Desenhar a Mecha usando Curva Bézier Suave
        ctx.beginPath();
        ctx.moveTo(strand.rootX, strand.rootY);

        for (let i = 1; i < nodes.length - 1; i++) {
          const xc = (nodes[i].x + nodes[i + 1].x) / 2;
          const yc = (nodes[i].y + nodes[i + 1].y) / 2;
          ctx.quadraticCurveTo(nodes[i].x, nodes[i].y, xc, yc);
        }

        const lastNode = nodes[nodes.length - 1];
        ctx.lineTo(lastNode.x, lastNode.y);

        // Gradiente de Seda Brilhante
        const grad = ctx.createLinearGradient(strand.rootX, strand.rootY, lastNode.x, lastNode.y);
        grad.addColorStop(0, strand.colorStops[0]);
        grad.addColorStop(0.35, strand.colorStops[1]);
        grad.addColorStop(0.7, strand.colorStops[2]);
        grad.addColorStop(1, strand.colorStops[3]);

        ctx.strokeStyle = grad;
        ctx.lineWidth = strand.baseWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.globalAlpha = 0.88;
        ctx.stroke();

        // Ponto de Luz Especular (Reflexo de Hidratação)
        const highlightNode = nodes[Math.floor(nodes.length * 0.45)];
        ctx.beginPath();
        ctx.arc(highlightNode.x, highlightNode.y, strand.baseWidth * 1.25, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 248, 231, 0.45)";
        ctx.fill();
      }

      ctx.globalAlpha = 1.0;
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      ro.disconnect();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (typeof window !== "undefined") {
        window.removeEventListener("deviceorientation", handleOrientation);
      }
    };
  }, [initStrands]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    pointerPos.current.x = e.clientX - rect.left;
    pointerPos.current.y = e.clientY - rect.top;
    pointerPos.current.active = true;

    if (!hasInteracted) {
      setHasInteracted(true);
      if (onHairTouched) onHairTouched();
    }
  };

  const handlePointerLeave = () => {
    pointerPos.current.active = false;
    pointerPos.current.x = -1000;
    pointerPos.current.y = -1000;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const touch = e.touches[0];
      pointerPos.current.x = touch.clientX - rect.left;
      pointerPos.current.y = touch.clientY - rect.top;
      pointerPos.current.active = true;

      if (!hasInteracted) {
        setHasInteracted(true);
        if (onHairTouched) onHairTouched();
      }
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onTouchMove={handleTouchMove}
      onTouchEnd={handlePointerLeave}
      className={`relative select-none touch-none overflow-hidden ${className}`}
    >
      {/* 1. Halo Luminous de Fundo (Backlight de Estúdio) */}
      <div
        className="absolute -inset-6 -z-10 opacity-45 pointer-events-none rounded-[44px]"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(199, 160, 58, 0.35) 0%, rgba(217, 184, 95, 0.15) 45%, transparent 70%)",
          filter: "blur(36px)",
        }}
      />

      {/* 2. Moldura Editorial de Alta Costura */}
      <div className="relative w-full h-full overflow-hidden rounded-[32px] sm:rounded-[40px] border-2 border-[#D8D0BD]/75 shadow-[0_24px_60px_-15px_rgba(29,61,60,0.25)] bg-[#FCF5EB]">
        <img
          src={portraitSrc}
          alt="Alta Excelência Capilar — Espaço Gleicy Ronha"
          className="w-full h-full object-cover object-top filter brightness-[0.99] contrast-[1.02]"
        />

        {/* Gradiente sutil para harmonização */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1D3D3C]/65 via-transparent to-transparent pointer-events-none" />

        {/* 3. Camada do Canvas Interativo (Mechas Sedosas Flutuantes) */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full z-10 pointer-events-none"
        />

        {/* 4. Etiqueta Editorial Discreta (Rodapé Elegante) */}
        <div className="absolute bottom-5 inset-x-5 z-20 flex items-center justify-between pointer-events-none">
          <div className="px-3.5 py-1.5 rounded-full bg-white/92 backdrop-blur-md border border-[#C7A03A]/45 shadow-md flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#C7A03A] animate-pulse" />
            <span className="text-[11px] font-semibold tracking-wide text-[#1D3D3C]">
              Balanço &amp; Movimento Real
            </span>
          </div>

          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#1D3D3C]/85 backdrop-blur-md text-[#FCF5EB] text-[10px] tracking-wider uppercase border border-[#C7A03A]/30">
            <span>Interativo · Mova o cursor</span>
          </div>
        </div>
      </div>
    </div>
  );
}
