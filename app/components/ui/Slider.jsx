"use client";

import { useId, useState } from "react";
import { Slider as BaseSlider } from "@base-ui/react/slider";
import { Button } from "./Button";
import { Tooltip } from "./overlays";
import styles from "./slider.module.css";

/** Discrete presentation control. Values and explanations belong to its caller. */
export function Slider({ label, value, onValueChange, options, description, disabled = false, helpPlacement = "tooltip" }) {
  const descriptionId = useId();
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [focusedIndex, setFocusedIndex] = useState(null);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const selectedDescription = description || options[selectedIndex]?.description;
  const inlineHelp = helpPlacement === "inline";
  const requestedPreview = disabled ? selectedIndex : hoveredIndex ?? focusedIndex ?? selectedIndex;
  const previewIndex = options[requestedPreview] ? requestedPreview : selectedIndex;
  const optionDescriptionId = index => `${descriptionId}-${index}`;

  return (
    <BaseSlider.Root
      className={styles.root}
      style={{ "--slider-stops": options.length }}
      value={selectedIndex}
      min={0}
      max={options.length - 1}
      step={1}
      largeStep={1}
      disabled={disabled}
      onValueChange={(index) => onValueChange(options[index].value)}
      onPointerLeave={() => setHoveredIndex(null)}
      onKeyDown={(event) => {
        if (inlineHelp && event.key === "Escape" && (hoveredIndex !== null || focusedIndex !== null)) {
          // Dismiss the preview first, without closing the enclosing editor.
          setHoveredIndex(null);
          setFocusedIndex(null);
          event.stopPropagation();
        }
      }}
    >
      <BaseSlider.Label className={styles.label}>{label}</BaseSlider.Label>
      <BaseSlider.Control className={styles.control}>
        <BaseSlider.Track className={styles.track}>
          <BaseSlider.Indicator className={styles.indicator} />
          {options.map((option, index) => (
            <span
              key={option.value}
              className={styles.stop}
              data-filled={index <= selectedIndex || undefined}
              style={{ insetInlineStart: `${index / (options.length - 1) * 100}%` }}
              aria-hidden="true"
            />
          ))}
        </BaseSlider.Track>
        <BaseSlider.Thumb
          className={styles.thumb}
          aria-label={label}
          aria-describedby={inlineHelp
            ? options[selectedIndex]?.description ? optionDescriptionId(selectedIndex) : undefined
            : selectedDescription ? descriptionId : undefined}
          getAriaValueText={(_, index) => options[index].label}
        />
      </BaseSlider.Control>
      <div className={styles.options}>
        {options.map((option, index) => {
          const button = <Button
            key={option.value}
            variant="ghost"
            className={styles.option}
            aria-pressed={index === selectedIndex}
            aria-describedby={inlineHelp && option.description ? optionDescriptionId(index) : undefined}
            disabled={disabled}
            onClick={() => onValueChange(option.value)}
            onPointerEnter={(event) => {
              if (inlineHelp && !disabled && event.pointerType === "mouse") setHoveredIndex(index);
            }}
            onFocus={() => { if (inlineHelp) setFocusedIndex(index); }}
            onBlur={() => setFocusedIndex(null)}
          >
            {option.label}
          </Button>;
          return !inlineHelp && option.description
            ? <Tooltip key={option.value} trigger={button} touchable>{option.description}</Tooltip>
            : button;
        })}
      </div>
      {inlineHelp && options.some(option => option.description) && <>
        <div className={styles.help}>
          {options.map((option, index) => <div key={option.value} className={styles.helpContent}
            data-active={index === previewIndex || undefined}
            aria-hidden={index !== previewIndex || undefined}
            role={index === previewIndex ? "note" : undefined}
            aria-label={index === previewIndex ? `Förklaring: ${option.label}` : undefined}>
            <p className={styles.helpDescription}>{option.description}</p>
            {option.example && <p className={styles.helpExample}>{option.example}</p>}
          </div>)}
        </div>
        {options.map((option, index) => option.description && <p key={option.value} id={optionDescriptionId(index)} className={styles.srOnly}>
          {option.description} {option.example}
        </p>)}
      </>}
      {description && inlineHelp && <p className={styles.description}>{description}</p>}
      {!inlineHelp && selectedDescription && <p id={descriptionId} className={description ? styles.description : styles.srOnly}>{selectedDescription}</p>}
    </BaseSlider.Root>
  );
}

export default Slider;
