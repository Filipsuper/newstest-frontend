"use client";

import { useId } from "react";
import { Slider as BaseSlider } from "@base-ui/react/slider";
import { Button } from "./Button";
import styles from "./slider.module.css";

/** Discrete presentation control. Values and explanations belong to its caller. */
export function Slider({ label, value, onValueChange, options, description, disabled = false }) {
  const descriptionId = useId();
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));

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
    >
      <BaseSlider.Label className={styles.label}>{label}</BaseSlider.Label>
      <BaseSlider.Control className={styles.control}>
        <BaseSlider.Track className={styles.track}>
          {options.map((option, index) => (
            <span
              key={option.value}
              className={styles.stop}
              style={{ insetInlineStart: `${index / (options.length - 1) * 100}%` }}
              aria-hidden="true"
            />
          ))}
        </BaseSlider.Track>
        <BaseSlider.Thumb
          className={styles.thumb}
          aria-describedby={description ? descriptionId : undefined}
          getAriaValueText={(_, index) => options[index].label}
        />
      </BaseSlider.Control>
      <div className={styles.options}>
        {options.map((option, index) => (
          <Button
            key={option.value}
            variant="ghost"
            className={styles.option}
            aria-pressed={index === selectedIndex}
            disabled={disabled}
            onClick={() => onValueChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
      {description && <p id={descriptionId} className={styles.description}>{description}</p>}
    </BaseSlider.Root>
  );
}

export default Slider;
