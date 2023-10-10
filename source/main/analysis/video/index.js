// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const {
  Environment,
  StateData,
  AnalysisError,
} = require('core-lib');
/* frame-based analysis */
const StatePrepareFrameDetectionIterators = require('./states/prepare-frame-detection-iterators');
const StateDetectFrameIterator = require('./states/detect-frame-iterator');
const StatePrepareFrameTrackIterators = require('./states/prepare-frame-track-iterators');
/* video-based analysis */
const StatePrepareVideoDetectionIterators = require('./states/prepare-video-detection-iterators');
/* custom analysis */
const StatePrepareCustomDetectionIterators = require('./states/prepare-custom-detection-iterators');
/* shared */
const StateStartDetectionIterator = require('./states/start-detection-iterator');
const StateCollectResultsIterator = require('./states/collect-results-iterator');
const StateCreateTrackIterator = require('./states/create-track-iterator');
const StateIndexAnalysisIterator = require('./states/index-analysis-iterator');
/* job completed */
const StateJobCompleted = require('./states/job-completed');

const REQUIRED_ENVS = [
  'ENV_SOLUTION_ID',
  'ENV_RESOURCE_PREFIX',
  'ENV_SOLUTION_UUID',
  'ENV_ANONYMIZED_USAGE',
  'ENV_IOT_HOST',
  'ENV_IOT_TOPIC',
  'ENV_PROXY_BUCKET',
  // Backlog service
  'ENV_BACKLOG_EB_BUS',
  'ENV_BACKLOG_TABLE',
  'ENV_BACKLOG_TOPIC_ARN',
  'ENV_BACKLOG_TOPIC_ROLE_ARN',
  'ENV_ES_DOMAIN_ENDPOINT',
];
const CATEGORY = 'rekognition';

function parseEvent(event, context) {
  const stateMachine = Environment.StateMachines.VideoAnalysis;
  let parsed = event;
  if (!parsed.parallelStateOutputs) {
    return new StateData(stateMachine, parsed, context);
  }
  if (!parsed.stateExecution) {
    throw new Error('fail to parse event.stateExecution');
  }
  /* parse execution input object */
  const uuid = parsed.stateExecution.Input.uuid;
  const input = parsed.stateExecution.Input.input;
  const startTime = parsed.stateExecution.StartTime;
  const executionArn = parsed.stateExecution.Id;
  delete parsed.stateExecution;
  if (!uuid || !input) {
    throw new Error('fail to find uuid or input from event.stateExecution');
  }
  /* parse parallel state outputs */
  const parallelStateOutputs = parsed.parallelStateOutputs;
  delete parsed.parallelStateOutputs;
  /* merge all subcategories */
  /* note: could have multiple items in a single subcategory */
  /* i.e., customlabel */
  const merged = {};
  const iterators = parallelStateOutputs.filter(x =>
    ((x.data || {}).iterators || []).length > 0)
    .reduce((a0, c0) =>
      a0.concat(c0.data.iterators.reduce((a1, c1) =>
        a1.concat({
          name: Object.keys(c1.data).shift(),
          ...c1.data,
        }), [])), []);
  const subcategories = iterators.map(x => x.name);
  while (subcategories.length) {
    const subcategory = subcategories.shift();
    const filtered = iterators.filter(x => x.name === subcategory);
    if (filtered.length === 1) {
      merged[subcategory] = filtered[0][subcategory];
    } else if (filtered.length > 1) {
      merged[subcategory] = filtered.map(x => x[subcategory]);
    }
  }
  parsed = {
    ...parsed,
    uuid,
    input,
    startTime,
    executionArn,
    status: StateData.Statuses.NotStarted,
    progress: 0,
    data: {
      [CATEGORY]: {
        ...merged,
      },
    },
  };
  return new StateData(stateMachine, parsed, context);
}

exports.handler = async (event, context) => {
  console.log(`event = ${JSON.stringify(event, null, 2)}; context = ${JSON.stringify(context, null, 2)};`);
  try {
    const missing = REQUIRED_ENVS.filter(x => process.env[x] === undefined);
    if (missing.length) {
      throw new AnalysisError(`missing enviroment variables, ${missing.join(', ')}`);
    }
    /* merge parallel state outputs */
    const stateData = parseEvent(event, context);
    /* state routing */
    let instance;
    switch (stateData.operation) {
      /* frame-based analysis */
      case StateData.States.PrepareFrameDetectionIterators:
        instance = new StatePrepareFrameDetectionIterators(stateData);
        break;
      case StateData.States.DetectFrameIterator:
        instance = new StateDetectFrameIterator(stateData);
        break;
      case StateData.States.PrepareFrameTrackIterators:
        instance = new StatePrepareFrameTrackIterators(stateData);
        break;
      /* video-based analysis */
      case StateData.States.PrepareVideoDetectionIterators:
        instance = new StatePrepareVideoDetectionIterators(stateData);
        break;
      /* custom analysis */
      case StateData.States.PrepareCustomDetectionIterators:
        instance = new StatePrepareCustomDetectionIterators(stateData);
        break;
      /* shared */
      case StateData.States.StartDetectionIterator:
        instance = new StateStartDetectionIterator(stateData);
        break;
      case StateData.States.CollectResultsIterator:
        instance = new StateCollectResultsIterator(stateData);
        break;
      case StateData.States.CreateTrackIterator:
        instance = new StateCreateTrackIterator(stateData);
        break;
      case StateData.States.IndexAnalysisResults:
        instance = new StateIndexAnalysisIterator(stateData);
        break;
      case StateData.States.JobCompleted:
        instance = new StateJobCompleted(stateData);
        break;
      default:
        break;
    }
    if (!instance) {
      throw new AnalysisError(`${event.operation} not supported`);
    }
    await instance.process();
    return stateData.toJSON();
  } catch (e) {
    console.error(e);
    throw e;
  }
};
