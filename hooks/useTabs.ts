import { useState } from "react";

export type TabType = 'buscar' | 'ofrecer' | 'mis-ofertas' | 'historial';
export type SolicitudesTabType = 'estado' | 'historico';

export const useTabs = <T extends string>(initialTab: T) => {
  const [activeTab, setActiveTab] = useState<T>(initialTab);

  return {
    activeTab,
    setActiveTab,
  };
};