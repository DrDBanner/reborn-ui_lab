import {renderOutputs} from './outputs.js';
// Compatibility entry point: playbacks are a projection of the same output workspace.
export function renderSessions(s){return renderOutputs(s)}
