'use client';

import {useMemo, useState} from 'react';
import {BellRing, Hand, RotateCcw} from 'lucide-react';
import {Label} from '@/components/ui/label';
import {Slider} from '@/components/ui/slider';
import {Button} from '@/components/ui/button';
import {
  getStoredHapticLevel,
  HAPTIC_DEFAULT_INTERACTION_LEVEL,
  HAPTIC_DEFAULT_TOAST_LEVEL,
  HAPTIC_INTERACTION_LEVEL_KEY,
  HAPTIC_MAX_LEVEL,
  HAPTIC_MIN_LEVEL,
  HAPTIC_TOAST_LEVEL_KEY,
  levelToDuration,
  saveHapticLevel,
  triggerHaptic,
} from '@/lib/haptics';

const MAX_TOAST_DURATION_MS = 120;
const MAX_INTERACTION_DURATION_MS = 80;

export function HapticForm() {
  const [toastLevel, setToastLevel] = useState(() =>
    getStoredHapticLevel(HAPTIC_TOAST_LEVEL_KEY, HAPTIC_DEFAULT_TOAST_LEVEL)
  );
  const [interactionLevel, setInteractionLevel] = useState(() =>
    getStoredHapticLevel(HAPTIC_INTERACTION_LEVEL_KEY, HAPTIC_DEFAULT_INTERACTION_LEVEL)
  );

  const toastDuration = useMemo(
    () => levelToDuration(toastLevel, MAX_TOAST_DURATION_MS),
    [toastLevel]
  );
  const interactionDuration = useMemo(
    () => levelToDuration(interactionLevel, MAX_INTERACTION_DURATION_MS),
    [interactionLevel]
  );

  const updateToastLevel = (next: number) => {
    setToastLevel(next);
    saveHapticLevel(HAPTIC_TOAST_LEVEL_KEY, next);
  };

  const updateInteractionLevel = (next: number) => {
    setInteractionLevel(next);
    saveHapticLevel(HAPTIC_INTERACTION_LEVEL_KEY, next);
  };

  const resetDefaults = () => {
    updateToastLevel(HAPTIC_DEFAULT_TOAST_LEVEL);
    updateInteractionLevel(HAPTIC_DEFAULT_INTERACTION_LEVEL);
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-2xl border bg-muted/30 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Label className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-muted-foreground" />
              Toast & Foreground Messages
            </Label>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Intensity used when app toasts and foreground alerts appear.
            </p>
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">{toastLevel}%</span>
        </div>

        <Slider
          value={[toastLevel]}
          onValueChange={([value]) => updateToastLevel(value)}
          min={HAPTIC_MIN_LEVEL}
          max={HAPTIC_MAX_LEVEL}
          step={1}
          className="py-1"
          aria-label="Toast haptic intensity"
        />

        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">Requested vibration: {toastDuration}ms</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-[10px]"
            onClick={() => triggerHaptic(toastDuration)}
          >
            Preview
          </Button>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border bg-muted/30 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Label className="flex items-center gap-2">
              <Hand className="w-4 h-4 text-muted-foreground" />
              Small Interactions
            </Label>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Prepared for taps and tiny feedback moments (currently minimal use).
            </p>
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">{interactionLevel}%</span>
        </div>

        <Slider
          value={[interactionLevel]}
          onValueChange={([value]) => updateInteractionLevel(value)}
          min={HAPTIC_MIN_LEVEL}
          max={HAPTIC_MAX_LEVEL}
          step={1}
          className="py-1"
          aria-label="Small interaction haptic intensity"
        />

        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">Requested vibration: {interactionDuration}ms</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-[10px]"
            onClick={() => triggerHaptic(interactionDuration)}
          >
            Preview
          </Button>
        </div>
      </div>

      <Button type="button" variant="outline" className="w-full rounded-xl" onClick={resetDefaults}>
        <RotateCcw className="w-4 h-4 mr-2" />
        Reset to defaults
      </Button>
    </div>
  );
}