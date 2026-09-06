import {
  FiFileText,
  FiBriefcase,
  FiGlobe,
  FiUser,
  FiInfo,
} from "react-icons/fi";
import { Label } from "./ui/Label";
import { tagLabel } from "../utils/newsTags";

export default function NewsTypeLabel({ type = "NEWS" }) {
  const Icon = ["EARNINGS", "GUIDANCE", "PROFIT_WARNING"].includes(type)
    ? FiFileText
    : ["MACRO", "RATES", "MONETARY_POLICY"].includes(type)
      ? FiGlobe
      : type === "INSIDER"
        ? FiUser
        : [
              "ORDER",
              "AGREEMENT",
              "M&A",
              "M_AND_A",
              "MANAGEMENT",
              "PRODUCT",
              "PARTNERSHIP",
            ].includes(type)
          ? FiBriefcase
          : FiInfo;
  return <Label icon={<Icon />}>{tagLabel(type)}</Label>;
}
