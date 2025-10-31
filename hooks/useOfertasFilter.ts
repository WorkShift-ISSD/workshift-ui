import { useEffect, useState } from "react";
import { GrupoTurno, Oferta, Prioridad, TipoOferta } from "./useOfertas";

export const useOfertasFilter = (ofertas: Oferta[]) => {
  const [filteredOfertas, setFilteredOfertas] = useState<Oferta[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTipo, setSelectedTipo] = useState<TipoOferta | 'TODOS'>('TODOS');
  const [selectedTurno, setSelectedTurno] = useState<GrupoTurno | 'TODOS'>('TODOS');
  const [selectedPrioridad, setSelectedPrioridad] = useState<Prioridad | 'TODOS'>('TODOS');
  const [minCalificacion, setMinCalificacion] = useState(0);

  useEffect(() => {
    let filtered = [...ofertas];

    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(oferta => 
        oferta.ofertante.nombre.toLowerCase().includes(term) ||
        oferta.ofertante.apellido.toLowerCase().includes(term) ||
        `${oferta.ofertante.nombre} ${oferta.ofertante.apellido}`.toLowerCase().includes(term)
      );
    }

    if (selectedTipo !== 'TODOS') {
      filtered = filtered.filter(oferta => oferta.tipo === selectedTipo);
    }

    if (selectedTurno !== 'TODOS') {
      filtered = filtered.filter(oferta => 
        oferta.turnoOfrece?.grupoTurno === selectedTurno
      );
    }

    if (selectedPrioridad !== 'TODOS') {
      filtered = filtered.filter(oferta => oferta.prioridad === selectedPrioridad);
    }

    if (minCalificacion > 0) {
      filtered = filtered.filter(oferta => oferta.ofertante.calificacion >= minCalificacion);
    }

    setFilteredOfertas(filtered);
  }, [searchTerm, selectedTipo, selectedTurno, selectedPrioridad, minCalificacion, ofertas]);

  return {
    filteredOfertas,
    searchTerm,
    setSearchTerm,
    selectedTipo,
    setSelectedTipo,
    selectedTurno,
    setSelectedTurno,
    selectedPrioridad,
    setSelectedPrioridad,
    minCalificacion,
    setMinCalificacion,
  };
};
