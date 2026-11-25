"use client";
import {createContext,useContext,type ReactNode} from "react";
/** Explicit route intent for the Fênix wrapper; never changes identity or clinical state. */
const FenixForcedRouteB=createContext(false);
export function FenixRouteProviderB({children}:{children:ReactNode}) {
  return <FenixForcedRouteB.Provider value={true}>{children}</FenixForcedRouteB.Provider>;
}
export function useForcedFenixRouteB(){return useContext(FenixForcedRouteB);}
