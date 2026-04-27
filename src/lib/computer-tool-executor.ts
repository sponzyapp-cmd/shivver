import { analyzeScreen, planTask } from '@/lib/vision';
import { executeComputerAction, automateBlender, automateDaVinci, ActionResult } from '@/lib/computer-tool';

// Tool definitions for LLM function calling
export const COMPUTER_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'computer_screenshot',
      description: 'Take a screenshot of the current screen',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'computer_click',
      description: 'Click at specific coordinates (x, y as percentages 0-100)',
      parameters: {
        type: 'object',
        properties: {
          x: { type: 'number', description: 'X coordinate percentage (0-100)' },
          y: { type: 'number', description: 'Y coordinate percentage (0-100)' },
          button: { type: 'string', enum: ['left', 'right', 'middle'], default: 'left' },
          double: { type: 'boolean', default: false },
        },
        required: ['x', 'y'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'computer_type',
      description: 'Type text at current cursor position or after a click',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to type' },
        },
        required: ['text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'computer_keypress',
      description: 'Press a specific key (Enter, Escape, Tab, Ctrl+C, etc.)',
      parameters: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Key to press (e.g., "Enter", "Escape", "Tab", "Ctrl+C")' },
        },
        required: ['key'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'computer_scroll',
      description: 'Scroll the screen up or down',
      parameters: {
        type: 'object',
        properties: {
          direction: { type: 'string', enum: ['up', 'down'] },
          amount: { type: 'number', default: 3, description: 'Number of scroll clicks' },
        },
        required: ['direction'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'computer_run',
      description: 'Run a command or open an application',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Command to execute or app to open' },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'computer_focus',
      description: 'Focus/activate a specific application window',
      parameters: {
        type: 'object',
        properties: {
          app: { type: 'string', description: 'Application name (e.g., "Blender", "DaVinci Resolve", "Chrome")' },
        },
        required: ['app'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'computer_analyze',
      description: 'Analyze the current screen with AI vision to understand what to do next',
      parameters: {
        type: 'object',
        properties: {
          goal: { type: 'string', description: 'What you want to accomplish on this screen' },
        },
        required: ['goal'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'computer_plan',
      description: 'Create a step-by-step plan for a complex multi-step task',
      parameters: {
        type: 'object',
        properties: {
          task: { type: 'string', description: 'The task to plan' },
        },
        required: ['task'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'blender_automate',
      description: 'Execute a Blender-specific automation task (create 3D object, render, etc.)',
      parameters: {
        type: 'object',
        properties: {
          task: { type: 'string', description: 'Description of what to do in Blender' },
        },
        required: ['task'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'davinci_automate',
      description: 'Execute a DaVinci Resolve automation task (edit video, color grade, export, etc.)',
      parameters: {
        type: 'object',
        properties: {
          task: { type: 'string', description: 'Description of the video editing task' },
        },
        required: ['task'],
      },
    },
  },
];

async function takeScreenshot(): Promise<string | null> {
  const result = await executeComputerAction({ action: 'screenshot' });
  return result.success ? result.screenshot || null : null;
}

export async function executeComputerTool(
  toolName: string,
  params: Record<string, any>
): Promise<ActionResult & { toolName: string }> {
  let result: ActionResult;

  switch (toolName) {
    case 'computer_screenshot': {
      const screenshot = await takeScreenshot();
      result = {
        success: !!screenshot,
        output: screenshot ? 'Screenshot taken' : 'Failed to take screenshot',
        screenshot: screenshot || undefined,
      };
      break;
    }

    case 'computer_click':
      result = await executeComputerAction({
        action: 'click',
        coordinates: { x: params.x, y: params.y },
        button: params.button,
      });
      break;

    case 'computer_type':
      result = await executeComputerAction({
        action: 'type',
        text: params.text,
      });
      break;

    case 'computer_keypress':
      result = await executeComputerAction({
        action: 'keypress',
        text: params.key,
      });
      break;

    case 'computer_scroll':
      result = await executeComputerAction({
        action: 'scroll',
        direction: params.direction,
        amount: params.amount,
      });
      break;

    case 'computer_run':
      result = await executeComputerAction({
        action: 'run',
        text: params.command,
      });
      break;

    case 'computer_focus':
      result = await executeComputerAction({
        action: 'focus',
        application: params.app,
      });
      break;

    case 'computer_analyze': {
      const screenshotForAnalysis = await takeScreenshot();
      if (!screenshotForAnalysis) {
        result = { success: false, error: 'Could not take screenshot for analysis' };
      } else {
        const analysis = await analyzeScreen(screenshotForAnalysis, params.goal);
        result = {
          success: true,
          output: JSON.stringify(analysis, null, 2),
        };
      }
      break;
    }

    case 'computer_plan': {
      const screenshotForPlan = await takeScreenshot();
      const plan = await planTask(params.task, screenshotForPlan || undefined);
      result = {
        success: true,
        output: JSON.stringify(plan, null, 2),
      };
      break;
    }

    case 'blender_automate':
      result = await automateBlender(params.task);
      break;

    case 'davinci_automate':
      result = await automateDaVinci(params.task);
      break;

    default:
      result = { success: false, error: `Unknown tool: ${toolName}` };
  }

  return { ...result, toolName };
}
