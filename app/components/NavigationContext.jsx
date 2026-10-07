"use client";

import { createContext, useContext } from "react";
import { usePathname } from "next/navigation";

export const NavigationPathnameContext = createContext(null);

export function useNavigationPathname() {
    const navigationPathname = useContext(NavigationPathnameContext);
    const pathname = usePathname();
    return navigationPathname ?? pathname;
}
