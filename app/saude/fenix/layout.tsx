import type {ReactNode} from "react";
import {FenixRouteProviderB} from "@/components/saude/FenixRouteContextB";
/** Dedicated route boundary; preserves the original delegating page and clinical authority. */
export default function FenixLayout({children}:{children:ReactNode}) {
  return <FenixRouteProviderB>{children}</FenixRouteProviderB>;
}
