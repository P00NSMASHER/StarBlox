
import { createStudioHttpAdapter } from './studioBridge.js';

export const STARBLOX_STUDIO_CONNECTOR_VERSION='starblox-studio-connector-v1';

export const STARBLOX_STUDIO_CONNECTOR_TOOLS=Object.freeze([
  'search_tree',
  'inspect_instance',
  'list_children',
  'script_grep',
  'read_script',
  'read_all_scripts',
  'get_selection',
  'set_selection',
  'write_script',
  'edit_script',
  'create_instance',
  'set_property',
  'delete_instance',
  'run_tests',
  'get_logs',
  'get_run_state',
  'simulate_input',
  'capture_viewport',
  'start_playtest',
  'stop_playtest',
  'playtest_sample_state'
]);

export function createStarBloxLocalStudioAdapter(options={}){
  return createStudioHttpAdapter({
    ...options,
    supportedTools:STARBLOX_STUDIO_CONNECTOR_TOOLS,
    expectedConnectorVersion:STARBLOX_STUDIO_CONNECTOR_VERSION,
    requireAttestation:true
  });
}
