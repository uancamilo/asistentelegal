#!/bin/bash

# Script para detener todos los procesos de desarrollo del monorepo
# Uso: ./scripts/kill-dev.sh

echo "🔍 Buscando procesos de desarrollo activos..."

# Buscar procesos de NestJS
NEST_PIDS=$(pgrep -f "nest start" 2>/dev/null)
# Buscar procesos de Next.js
NEXT_PIDS=$(pgrep -f "next dev" 2>/dev/null)
# Buscar procesos de Turbo
TURBO_PIDS=$(pgrep -f "turbo run dev" 2>/dev/null)

FOUND=false

if [ ! -z "$NEST_PIDS" ]; then
  echo "📦 Deteniendo procesos NestJS (backend)..."
  echo "$NEST_PIDS" | xargs kill -9 2>/dev/null
  FOUND=true
fi

if [ ! -z "$NEXT_PIDS" ]; then
  echo "⚡ Deteniendo procesos Next.js (frontend)..."
  echo "$NEXT_PIDS" | xargs kill -9 2>/dev/null
  FOUND=true
fi

if [ ! -z "$TURBO_PIDS" ]; then
  echo "🔄 Deteniendo procesos Turborepo..."
  echo "$TURBO_PIDS" | xargs kill -9 2>/dev/null
  FOUND=true
fi

if [ "$FOUND" = false ]; then
  echo "✅ No hay procesos de desarrollo activos"
else
  sleep 1
  echo ""
  echo "✅ Todos los procesos detenidos"
  echo ""

  # Verificar puertos
  echo "🔍 Verificando puertos..."
  PORT_3000=$(lsof -ti:3000 2>/dev/null)
  PORT_3001=$(lsof -ti:3001 2>/dev/null)

  if [ -z "$PORT_3000" ]; then
    echo "✅ Puerto 3000 (backend): LIBRE"
  else
    echo "⚠️  Puerto 3000 (backend): OCUPADO (PID: $PORT_3000)"
  fi

  if [ -z "$PORT_3001" ]; then
    echo "✅ Puerto 3001 (frontend): LIBRE"
  else
    echo "⚠️  Puerto 3001 (frontend): OCUPADO (PID: $PORT_3001)"
  fi
fi

echo ""
echo "📝 Ahora puedes ejecutar:"
echo "   npm run dev               # Backend + Frontend"
echo "   npm run dev --filter=backend   # Solo backend"
echo "   npm run dev --filter=frontend  # Solo frontend"
