import type { NextConfig } from 'next';

// next-pwa no exporta tipos nativos en TS, se usa require
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require('next-pwa')({
  dest: 'public',          // genera sw.js y workbox en /public
  register: true,           // registra el SW automáticamente
  skipWaiting: true,        // activa el nuevo SW sin esperar
  disable: process.env.NODE_ENV === 'development', // desactiva en dev para no interferir con HMR
  buildExcludes: [/middleware-manifest\.json$/],   // evita conflictos con Next.js middleware
});

const nextConfig: NextConfig = {
  /* tus opciones actuales van aquí */
};

export default withPWA(nextConfig);