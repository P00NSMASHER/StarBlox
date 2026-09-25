export const BROOKHAVEN_MOUNT_NAME='BrookhavenWorldBaseline';

export function createBrookhavenMountedProject(baseProject,worldPath){
  if(!baseProject || typeof baseProject !== 'object' || Array.isArray(baseProject)){
    throw new TypeError('baseProject must be a Rojo project object');
  }
  if(typeof worldPath !== 'string' || !worldPath.trim()){
    throw new TypeError('worldPath is required');
  }
  const project=JSON.parse(JSON.stringify(baseProject));
  project.name='StarBloxBrookhavenMounted';
  project.tree ||= {$className:'DataModel'};
  project.tree.Workspace ||= {$className:'Workspace'};
  if(project.tree.Workspace[BROOKHAVEN_MOUNT_NAME] !== undefined){
    throw new Error('base project already defines BrookhavenWorldBaseline');
  }
  project.tree.Workspace[BROOKHAVEN_MOUNT_NAME]={$path:worldPath};
  return project;
}
