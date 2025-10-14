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
const mxBaseResponse = require('../shared/mxBaseResponse');

/**
 * @function GetKMSKeyArn
 * @param {object} event
 * @param {object} context
 */
exports.GetKMSKeyArn = async (event, context) => {
  try {
    class X0 extends mxBaseResponse(class {}) {}
    const x0 = new X0(event, context);

    const { KeyAlias } = event.ResourceProperties;

    if (x0.isRequestType('Delete')) {
      x0.storeResponseData('Status', 'SKIPPED');
      return x0.responseData;
    }

    if (!KeyAlias) {
      throw new Error('KeyAlias is required');
    }

    const kms = new AWS.KMS({
      apiVersion: '2014-11-01',
      customUserAgent: process.env.ENV_CUSTOM_USER_AGENT,
    });
    
    const response = await kms.describeKey({
      KeyId: KeyAlias
    }).promise();

    if (!response.KeyMetadata || !response.KeyMetadata.Arn) {
      throw new Error(`Unable to retrieve ARN for key alias ${KeyAlias}`);
    }

    x0.storeResponseData('KeyArn', response.KeyMetadata.Arn);
    x0.storeResponseData('KeyId', response.KeyMetadata.KeyId);
    x0.storeResponseData('Status', 'SUCCESS');

    return x0.responseData;
  } catch (e) {
    e.message = `GetKMSKeyArn: ${e.message}`;
    throw e;
  }
};