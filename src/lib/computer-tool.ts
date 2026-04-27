import { supabase } from '@/lib/supabase';

export type ActionResult = {
  success: boolean;
  output?: string;
  error?: string;
  screenshot?: string; // base64
  coordinates?: { x: number; y: number };
};

export type ComputerToolParams = {
  action: 'screenshot' | 'click' | 'double_click' | 'right_click' | 'drag' | 'scroll' | 'type' | 'keypress' | 'move_mouse' | 'run' | 'open' | 'focus' | 'analyze' | 'plan';
  coordinates?: { x: number; y: number };
  text?: string;
  button?: 'left' | 'right' | 'middle';
  direction?: 'up' | 'down';
  amount?: number;
  duration?: number;
  application?: string;
  goal?: string;
  task?: string;
};

let USE_BROWSER_AUTOMATION = true; // Start in browser mode, user can switch to desktop

export async function executeComputerAction(params: ComputerToolParams): Promise<ActionResult> {
  if (USE_BROWSER_AUTOMATION) {
    return await executeInBrowser(params);
  } else {
    return await executeOnDesktop(params);
  }
}

// ── Browser Automation (in-page) ──────────────────────────────────────────
async function executeInBrowser(params: ComputerToolParams): Promise<ActionResult> {
  const { action } = params;

  switch (action) {
    case 'screenshot':
      return await browserScreenshot();

    case 'click':
      return await browserClick(params.coordinates!);

    case 'double_click':
      return await browserDoubleClick(params.coordinates!);

    case 'right_click':
      return await browserRightClick(params.coordinates!);

    case 'type':
      return await browserType(params.text!);

    case 'keypress':
      return await browserKeypress(params.text!);

    case 'scroll':
      return await browserScroll(params.direction!, params.amount || 3);

    case 'move_mouse':
      return await browserMoveMouse(params.coordinates!);

    case 'run':
      // Browser can't run arbitrary commands, inform user
      return { success: false, error: 'Cannot run commands from browser. Install desktop agent for full control.' };

    case 'open':
      return { success: false, error: 'Cannot open apps from browser. Use desktop agent.' };

    case 'focus':
      return { success: false, error: 'Cannot focus windows from browser. Use desktop agent.' };

    case 'analyze':
      return { success: false, error: 'Screen analysis requires backend vision. Coming soon.' };

    case 'plan':
      return { success: false, error: 'Planning requires backend LLM. Use chat instead.' };

    default:
      return { success: false, error: `Unknown action: ${action}` };
  }
}

async function browserScreenshot(): Promise<ActionResult> {
  try {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(document.body, { useCORS: true });
    const dataUrl = canvas.toDataURL('image/png');
    return { success: true, screenshot: dataUrl, output: 'Screenshot captured' };
  } catch (err: any) {
    return { success: false, error: `Screenshot failed: ${err.message}` };
  }
}

async function browserClick({ x, y }: { x: number; y: number }): Promise<ActionResult> {
  try {
    const element = document.elementFromPoint(
      (x / 100) * window.innerWidth,
      (y / 100) * window.innerHeight
    );
    (element as HTMLElement | null)?.click();
    return { success: true, output: `Clicked at ${x}%, ${y}%` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function browserDoubleClick(coords: { x: number; y: number }): Promise<ActionResult> {
  try {
    const element = document.elementFromPoint(
      (coords.x / 100) * window.innerWidth,
      (coords.y / 100) * window.innerHeight
    );
    const event = new MouseEvent('dblclick', { bubbles: true });
    element?.dispatchEvent(event);
    return { success: true, output: `Double-clicked at ${coords.x}%, ${coords.y}%` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function browserRightClick(coords: { x: number; y: number }): Promise<ActionResult> {
  try {
    const element = document.elementFromPoint(
      (coords.x / 100) * window.innerWidth,
      (coords.y / 100) * window.innerHeight
    );
    const event = new MouseEvent('contextmenu', { bubbles: true });
    element?.dispatchEvent(event);
    return { success: true, output: `Right-clicked at ${coords.x}%, ${coords.y}%` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function browserType(text: string): Promise<ActionResult> {
  try {
    const active = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
    if (active && ('value' in active) && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
      active.value += text;
      active.dispatchEvent(new Event('input', { bubbles: true }));
      return { success: true, output: `Typed: ${text}` };
    }
    document.execCommand('insertText', false, text);
    return { success: true, output: `Typed: ${text}` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function browserKeypress(key: string): Promise<ActionResult> {
  try {
    const keyMap: Record<string, string> = {
      enter: 'Enter',
      escape: 'Escape',
      tab: 'Tab',
      space: ' ',
      backspace: 'Backspace',
      delete: 'Delete',
    };
    const keyCode = keyMap[key.toLowerCase()] || key;
    const event = new KeyboardEvent('keydown', { key: keyCode, bubbles: true });
    document.dispatchEvent(event);
    return { success: true, output: `Pressed: ${key}` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function browserScroll(direction: 'up' | 'down', amount: number): Promise<ActionResult> {
  try {
    const delta = direction === 'down' ? amount * 100 : -amount * 100;
    window.scrollBy({ top: delta, behavior: 'smooth' });
    return { success: true, output: `Scrolled ${direction} ${amount}x` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function browserMoveMouse({ x, y }: { x: number; y: number }): Promise<ActionResult> {
  // Browser JS can't move real mouse, but can move virtual cursor for automation
  try {
    const element = document.elementFromPoint(
      (x / 100) * window.innerWidth,
      (y / 100) * window.innerHeight
    );
    (element as HTMLElement | null)?.focus();
    return { success: true, output: `Moved to ${x}%, ${y}%` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── Desktop Agent Mode (external worker) ───────────────────────────────────
async function executeOnDesktop(params: ComputerToolParams): Promise<ActionResult> {
  const agentUrl = process.env.DESKTOP_AGENT_URL || 'http://localhost:8090';

  const response = await fetch(`${agentUrl}/api/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    return { success: false, error: `Desktop agent error: ${response.statusText}` };
  }

  return await response.json();
}

// ── Application Automation Helpers ─────────────────────────────────────────
export async function automateBlender(task: string): Promise<ActionResult> {
  // Send automation script to Blender via Python or desktop agent
  const blenderScript = generateBlenderScript(task);
  return await executeOnDesktop({
    action: 'run',
    text: `blender --python - "${blenderScript}"`,
  });
}

export async function automateDaVinci(task: string): Promise<ActionResult> {
  // DaVinci Resolve uses Fusion scripting or AppleScript/JXA on Mac
  const script = generateDaVinciScript(task);
  return await executeOnDesktop({
    action: 'run',
    text: script,
  });
}

function generateBlenderScript(task: string): string {
  // Generate Python script for Blender
  return `
import bpy

# Clear scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# Parse task and execute
task = "${task}".lower()

if "cube" in task:
    bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0))
elif "sphere" in task:
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=(0, 0, 0))
elif "cylinder" in task:
    bpy.ops.mesh.primitive_cylinder_add(radius=1, depth=2, location=(0, 0, 0))
elif "plane" in task:
    bpy.ops.mesh.primitive_plane_add(size=2, location=(0, 0, 0))

# Save
bpy.ops.wm.save_as_mainfile(filepath="/tmp/blender_task.blend")

print("Blender automation complete")
`.trim();
}

function generateDaVinciScript(task: string): string {
  // DaVinci Resolve Fusion script (or AppleScript on Mac)
  // This is platform-specific; for demo, return basic script
  return `
# DaVinci Resolve automation script
# Requires DaVinci Resolve Studio with scripting enabled

import DaVinciResolveScript as dvr_script

resolve = dvr_script.scriptapp("Resolve")
project = resolve.GetProjectManager().GetCurrentProject()
timeline = project.GetCurrentTimeline()

if not timeline:
    print("No timeline open")
else:
    # ${task}
    print("DaVinci automation: ${task}")
`.trim();
}

// ── Desktop Agent Setup ────────────────────────────────────────────────────
export function enableDesktopAgent(url: string) {
  USE_BROWSER_AUTOMATION = false;
  process.env.DESKTOP_AGENT_URL = url;
}

export function disableDesktopAgent() {
  USE_BROWSER_AUTOMATION = true;
}
