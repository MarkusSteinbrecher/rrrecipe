# Cooking Mode

## Goal

Cooking mode should make a recipe usable while the user's hands are busy. The
app should support clear step navigation, repeat/readback, timers, video markers,
and eventually hands-free commands.

## Core Behavior

- Show one focused step at a time.
- Keep ingredients for the current step visible or one tap away.
- Support next/previous step navigation.
- Support "repeat this step" readback.
- Start timers from detected step timers.
- Jump to linked video markers when a step has one.
- Keep the screen awake while cooking mode is active.

## Command Inputs

The command model should be independent of the input method. A command can come
from a button, keyboard shortcut, voice phrase, gesture, or future visual input.

Core commands:

- `next_step`
- `previous_step`
- `repeat_step`
- `start_timer`
- `pause_timer`
- `show_ingredients`
- `hide_ingredients`
- `jump_to_video`
- `scale_recipe`
- `exit_cooking_mode`

## Voice Commands

Useful initial phrases:

- "next step"
- "previous step"
- "repeat this step"
- "read this step"
- "start timer"
- "pause timer"
- "show ingredients"
- "open video"

For German:

- "naechster Schritt"
- "vorheriger Schritt"
- "Schritt wiederholen"
- "lies diesen Schritt vor"
- "Timer starten"
- "Timer pausieren"
- "Zutaten anzeigen"
- "Video oeffnen"

Voice support should be optional. The app must still work fully through touch.

## Visual Or Gesture Commands

If we use visual input later, keep it limited and explicit:

- swipe left/right for next/previous step,
- large tap zones for next/repeat,
- camera-based gesture recognition only if the user enables it,
- no always-on camera by default.

Visual recognition needs a clear privacy model because it can imply camera
access. It should not be required for the core cooking workflow.

## Text-To-Speech

Repeat/readback needs text-to-speech:

- Web: browser SpeechSynthesis API where available.
- iOS: AVSpeechSynthesizer.

Readback should use the recipe content language or translated display language,
depending on user settings.

## State

Cooking mode state is session state, not recipe content:

- active recipe version
- current step id
- active timers
- video auto-seek preference
- readback enabled/disabled
- command input enabled/disabled

Do not create a new recipe version just because the user moves through steps or
uses readback.

## MVP UI

- Large previous/repeat/next controls.
- Timer controls on steps with detected timers.
- Video jump button when a step has a marker.
- Screen wake lock on web where supported.
- iOS keeps cooking mode awake using native screen-idle controls.

## Later

- Voice command recognition.
- Custom command phrases per language.
- Camera/gesture commands if privacy and reliability are acceptable.
- "What's next?" assistant response.
- Step checklist for substeps.

