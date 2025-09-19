import React, { useEffect, useRef } from 'react';

interface SparklineChartProps {
  data: number[];
  color: string;
  height?: number;
  width?: number;
  lineWidth?: number;
  fillOpacity?: number;
  showDots?: boolean;
}

export function SparklineChart({
  data,
  color,
  height = 24,
  width = 48,
  lineWidth = 1.5,
  fillOpacity = 0.2,
  showDots = false
}: SparklineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Desenha o sparkline no canvas
  useEffect(() => {
    if (!canvasRef.current || data.length < 2) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ajusta a resolução do canvas para evitar desfoque
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    
    // Limpa o canvas
    ctx.clearRect(0, 0, width, height);
    
    // Encontra valores min e max para escalar
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1; // Evita divisão por zero
    
    // Calcula escala e deslocamento
    const xStep = width / (data.length - 1);
    const scaleY = (height - 4) / range; // Margem de 2px nas bordas
    
    // Começa o caminho da linha
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    
    // Move para o primeiro ponto
    const x0 = 0;
    const y0 = height - 2 - ((data[0] - min) * scaleY);
    ctx.moveTo(x0, y0);
    
    // Desenha a linha
    data.forEach((value, i) => {
      if (i === 0) return; // Já fizemos o moveTo para o primeiro ponto
      
      const x = i * xStep;
      const y = height - 2 - ((value - min) * scaleY);
      ctx.lineTo(x, y);
    });
    
    // Desenha a linha
    ctx.stroke();
    
    // Opcional: Preenche a área sob a linha
    if (fillOpacity > 0) {
      const lastX = (data.length - 1) * xStep;
      const lastY = height - 2 - ((data[data.length - 1] - min) * scaleY);
      
      ctx.lineTo(lastX, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      
      ctx.globalAlpha = fillOpacity;
      ctx.fillStyle = color;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    
    // Opcional: Desenha pontos nas extremidades
    if (showDots) {
      ctx.fillStyle = color;
      
      // Primeiro ponto
      ctx.beginPath();
      ctx.arc(x0, y0, 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Último ponto
      const lastX = (data.length - 1) * xStep;
      const lastY = height - 2 - ((data[data.length - 1] - min) * scaleY);
      ctx.beginPath();
      ctx.arc(lastX, lastY, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
  }, [data, color, height, width, lineWidth, fillOpacity, showDots]);

  return (
    <canvas 
      ref={canvasRef} 
      style={{ 
        width, 
        height,
        display: 'block' 
      }}
      className="sparkline"
    />
  );
} 
