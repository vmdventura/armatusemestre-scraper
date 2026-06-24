#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "╔══════════════════════════════════════╗"
echo "║   Claude Usage Widget — Instalador   ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Verificar Node.js
if ! command -v node &>/dev/null; then
  echo "Error: Node.js no está instalado."
  echo "Descárgalo desde: https://nodejs.org"
  exit 1
fi

echo "Node.js: $(node --version)"
echo ""
echo "Instalando dependencias (Electron)..."
npm install
echo ""
echo "✓ Listo. Para iniciar el widget:"
echo "  cd mac-widget && npm start"
echo ""
echo "O desde la raíz del proyecto:"
echo "  npm start --prefix mac-widget"
