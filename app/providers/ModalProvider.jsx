"use client";

import React, { createContext, useState, useContext, useEffect } from 'react';
import { FaX } from "react-icons/fa6";

const ModalContext = createContext();

export const useModal = () => useContext(ModalContext);

export const ModalProvider = ({ children }) => {
    const [modalContent, setModalContent] = useState(null);
    const [isClosing, setIsClosing] = useState(false);

    // Escape closes any modal. Reading a news story is now a common enough
    // action that reaching for the corner button every time is friction.
    useEffect(() => {
        if (!modalContent) return undefined;
        const onKeyDown = (event) => {
            if (event.key === "Escape") closeModal();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [modalContent]);

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
                        <div className="absolute inset-0 bg-shadow" />
                    </div>

                    <div
                        className={`fixed scale-in inset-0 z-50 flex items-center justify-center transition-all duration-200 ease-in-out ${isClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                            }`}
                        onClick={handleBackdropClick}
                    >
                        <div
                            className="public-modal bg-foreground py-5 px-5 md:py-6 md:px-7 mx-4 max-w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto shadow-xl rounded-xl flex justify-center items-center relative transition-transform"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={closeModal}
                                className="absolute top-3 right-3 z-10 text-text-muted cursor-pointer font-sans text-xs hover:text-text transition-colors"
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
