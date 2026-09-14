"use client";

import { useId } from "react";
import { Slider as BaseSlider } from "@base-ui/react/slider";
import { Button } from "./Button";
import { Tooltip } from "./overlays";
import styles from "./slider.module.css";

/** Discrete presentation control. Values and explanations belong to its caller. */
export function Slider({ label, value, onValueChange, options, description, disabled = false }) {
  const descriptionId = useId();
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const selectedDescription = description || options[selectedIndex]?.description;

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
          aria-label={label}
          aria-describedby={selectedDescription ? descriptionId : undefined}
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
            disabled={disabled}
            onClick={() => onValueChange(option.value)}
          >
            {option.label}
          </Button>;
          return option.description
            ? <Tooltip key={option.value} trigger={button} touchable>{option.description}</Tooltip>
            : button;
        })}
      </div>
      {selectedDescription && <p id={descriptionId} className={description ? styles.description : styles.srOnly}>{selectedDescription}</p>}
    </BaseSlider.Root>
  );
}

export default Slider;
