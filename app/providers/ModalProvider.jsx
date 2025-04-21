import React, { createContext, useState, useContext } from 'react';
import { FaX } from "react-icons/fa6";

const ModalContext = createContext();

export const useModal = () => useContext(ModalContext);

export const ModalProvider = ({ children }) => {
    const [modalContent, setModalContent] = useState(null);
    const [isClosing, setIsClosing] = useState(false);

    const openModal = (content) => {
        setIsClosing(false);
        setModalContent(content);
    };

    const closeModal = () => {
        setIsClosing(true);
        setTimeout(() => {
            setModalContent(null);
            setIsClosing(false);
        }, 200);
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            closeModal();
        }
    };

    return (
        <ModalContext.Provider value={{ modalContent, openModal, closeModal }}>
            {children}
            {modalContent && (
                <>
                    <div
                        className={`fixed fade-in inset-0 z-50 transition-opacity duration-200 ease-in-out ${isClosing ? 'opacity-0' : 'opacity-100'
                            }`}
                        onClick={handleBackdropClick}
                    >
                        <div className="absolute inset-0 dark:bg-[#dfdfdfb3] bg-[#000000df]" />
                    </div>

                    <div
                        className={`fixed scale-in inset-0 z-50 flex items-center justify-center transition-all duration-200 ease-in-out ${isClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                            }`}
                        onClick={handleBackdropClick}
                    >
                        <div
                            className="bg-background py-12 px-20 shadow-xl flex justify-center items-center relative border border-border transition-transform"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={closeModal}
                                className="absolute top-2 right-2 text-text-muted cursor-pointer font-sans text-xs hover:text-text transition-colors"
                            >
                                <FaX />
                            </button>
                            {modalContent}
                        </div>
                    </div>
                </>
            )}
        </ModalContext.Provider>
    );
};
