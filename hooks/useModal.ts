import { useState } from "react";

export type ModalType = 'none' | 'nueva-oferta' | 'solicitud-directa';

export const useModal = () => {
  const [modalType, setModalType] = useState<ModalType>('none');

  const openModal = (type: ModalType) => setModalType(type);
  const closeModal = () => setModalType('none');

  return {
    modalType,
    isModalOpen: modalType !== 'none',
    openModal,
    closeModal,
  };
};
