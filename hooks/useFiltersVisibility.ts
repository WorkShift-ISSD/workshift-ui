import { useState } from "react";

export const useFiltersVisibility = () => {
  const [showFilters, setShowFilters] = useState(false);

  const toggleFilters = () => setShowFilters(prev => !prev);
  const openFilters = () => setShowFilters(true);
  const closeFilters = () => setShowFilters(false);

  return {
    showFilters,
    toggleFilters,
    openFilters,
    closeFilters,
  };
};