/**
 * js/core/input-manager.js
 * Proxy routing to new input.js standard
 */

import { Input } from './input.js';

// Setup backward compatibility aliases
Input.setActiveCanvas = (canvas) => Input.setCanvas(canvas);
Input.isHeldAny = (arr) => arr.some(k => Input.isHeld(k));
Input.wasPressedAny = (arr) => arr.some(k => Input.wasPressed(k));
Input.isMouseHeld = () => Input.mouse.down;
Input.wasMouseClicked = () => Input.mouse.clicked;
Input.getMousePos = () => ({ x: Input.mouse.x, y: Input.mouse.y });

export const InputManager = Input;
export default InputManager;
