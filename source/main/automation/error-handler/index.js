// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const AWS = (() => {
  try {
    const AWSXRay = require('aws-xray-sdk');
    return AWSXRay.captureAWS(require('aws-sdk'));
  } catch (e) {
    return require('aws-sdk');
  }
})();
const {
  Environment,
  StateData,
  IotStatus,
  SNS,
  DB,
} = require('core-lib');

const REQUIRED_ENVS = [
  'ENV_SOLUTION_ID',
  'ENV_RESOURCE_PREFIX',
  'ENV_SOLUTION_UUID',
  'ENV_ANONYMIZED_USAGE',
  'ENV_IOT_HOST',
  'ENV_IOT_HOST',
  'ENV_SNS_TOPIC_ARN',
  'ENV_INGEST_BUCKET',
  'ENV_PROXY_BUCKET',
];
const FAILED_STATUSES = [
  'Failed',
  'Aborted',
  'TimeOut',
];

exports.handler = async (event, context) => {
  async function getExecutionError(arn) {
    const step = new AWS.StepFunctions({
      apiVersion: '2016-11-23',
      customUserAgent: Environment.Solution.Metrics.CustomUserAgent,
    });

    let response;
    let executions;
    do {
      response = await step.getExecutionHistory({
        executionArn: arn,
        maxResults: 20,
        reverseOrder: true,
        nextToken: (response || {}).nextToken,
      }).promise().catch(() => undefined);

      executions = response.events.filter(x =>
        FAILED_STATUSES.findIndex(x0 =>
          x.type.indexOf(x0) >= 0) >= 0);
    } while ((response || {}).nextToken && !executions);
    return executions;
  }

  function parseExecutionError(arn, executions = []) {
    let message;
    while (executions.length) {
      const task = executions.shift();
      if ((task.lambdaFunctionFailedEventDetails || {}).cause) {
        return task.lambdaFunctionFailedEventDetails.cause;
      }
      if ((task.lambdaFunctionTimedOutEventDetails || {}).cause) {
        return task.lambdaFunctionTimedOutEventDetails.cause;
      }
      if ((task.executionFailedEventDetails || {}).cause) {
        return task.executionFailedEventDetails.cause;
      }
      if ((task.taskTimedOutEventDetails || {}).cause) {
        return task.taskTimedOutEventDetails.cause;
      }
      if ((task.executionAbortedEventDetails || {}).cause) {
        return task.executionAbortedEventDetails.cause;
      }
      message = `${arn} ${task.type}`;
    }
    return message;
  }

  try {
    console.log(`event = ${JSON.stringify(event, null, 2)}; context = ${JSON.stringify(context, null, 2)};`);
    if (!event.detail) {
      throw new Error('event.detail is missing. Cannot handle this error. exiting...');
    }
    const missing = REQUIRED_ENVS.filter(x => process.env[x] === undefined);
    if (missing.length) {
      throw new Error(`missing enviroment variables, ${missing.join(', ')}`);
    }
    const executions = await getExecutionError(event.detail.executionArn);
    let message = parseExecutionError(event.detail.executionArn, executions)
      || `${event.detail.executionArn} ${event.detail.status}`;
    /* check to see if it is JSON string */
    try {
      const parsed = JSON.parse(message);
      message = parsed.errorMessage || parsed.Status || message;
    } catch (e) {
      // do nothing
    }
    const input = JSON.parse(event.detail.input);
    const stateMachine = event.detail.executionArn.split(':')[6];
    const uuid = input.uuid || (input.input || {}).uuid;
    const overallStatus = StateData.Statuses.Error;
    let status;
    switch (stateMachine) {
      case Environment.StateMachines.Ingest:
        status = StateData.Statuses.IngestError;
        break;
      case Environment.StateMachines.Analysis:
        status = StateData.Statuses.AnalysisError;
        break;
      default:
        status = StateData.Statuses.Error;
    }

    if (uuid) {
      /* update status */
      const db = new DB({
        Table: Environment.DynamoDB.Ingest.Table,
        PartitionKey: Environment.DynamoDB.Ingest.PartitionKey,
      });
      await db.update(uuid, undefined, {
        overallStatus,
        status,
        errorMessage: message,
      }, false);
    }

    const response = {
      uuid,
      stateMachine,
      overallStatus,
      status,
      errorMessage: message,
    };
    return Promise.all([
      SNS.send(`error: ${uuid || 'Unknown'}`, {
        ...response,
        input,
      }).catch(() => undefined),
      IotStatus.publish(response).catch(() => undefined),
    ]);
  } catch (e) {
    console.error(e);
    return undefined;
  }
};
