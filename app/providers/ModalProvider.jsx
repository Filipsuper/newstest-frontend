import React, { createContext, useState, useContext } from 'react';
import { FaX } from "react-icons/fa6";

const ModalContext = createContext();

export const useModal = () => useContext(ModalContext);

export const ModalProvider = ({ children }) => {
    const [modalContent, setModalContent] = useState(null);

    const openModal = (content) => {
        setModalContent(content);
    };

    const closeModal = () => {
        setModalContent(null);
    };

    return (
        <ModalContext.Provider value={{ modalContent, openModal, closeModal }}>
            {children}
            {modalContent && (
                <div className="absolute top-0 left-0 right-0 flex h-full w-full items-center justify-center bg-[#0000005d] z-50">
                    <div className="bg-background py-12 px-20 shadow-xl  flex justify-center items-center relative border border-border">
                        <button onClick={closeModal} className="absolute  top-2 right-2 text-text-muted font-sans text-xs "><FaX /></button>
                        {modalContent}
                    </div>
                </div>
            )}
        </ModalContext.Provider>
    );
};