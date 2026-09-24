import {
  religion,
  sight,
  spelling,
  stories,
  vocab
} from './gameModel.js';

export const SOURCE_SNAPSHOT_SCHEMA_VERSION = 'starblox-source-snapshot-v1';

export function currentLearningSourceSnapshots(){
  return {
    'current-week-spelling-list':{
      schemaVersion:SOURCE_SNAPSHOT_SCHEMA_VERSION,
      sourceId:'current-week-spelling-list',
      payload:[...spelling]
    },
    'current-week-hfw-list':{
      schemaVersion:SOURCE_SNAPSHOT_SCHEMA_VERSION,
      sourceId:'current-week-hfw-list',
      payload:[...sight]
    },
    'current-week-vocabulary':{
      schemaVersion:SOURCE_SNAPSHOT_SCHEMA_VERSION,
      sourceId:'current-week-vocabulary',
      payload:vocab.map(row => [...row])
    },
    'approved-religion-unit-1':{
      schemaVersion:SOURCE_SNAPSHOT_SCHEMA_VERSION,
      sourceId:'approved-religion-unit-1',
      payload:religion.map(row => [...row])
    },
    'starblox-practice-passages':{
      schemaVersion:SOURCE_SNAPSHOT_SCHEMA_VERSION,
      sourceId:'starblox-practice-passages',
      payload:stories.map(story => ({...story}))
    }
  };
}
