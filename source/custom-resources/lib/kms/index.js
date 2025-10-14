const AWS = require('aws-sdk');
const crypto = require('crypto');

/**
 * @function GetKMSKeyArn
 * @param {object} event
 * @param {object} context
 */
async function GetKMSKeyArn(event, context) {
  const requestType = event.RequestType;
  const { KeyAlias } = event.ResourceProperties;
  
  // Create a unique physical resource ID using hash of StackId and LogicalResourceId
  const hashInput = `${event.StackId}-${event.LogicalResourceId}`;
  const hash = crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 16);
  const physicalResourceId = `kms-key-${hash}`;

  if (requestType === 'Delete') {
    return {
      Status: 'SUCCESS',
      PhysicalResourceId: physicalResourceId,
    };
  }

  if (!KeyAlias) {
    throw new Error('KeyAlias is required');
  }

  try {
    const kms = new AWS.KMS();
    
    const response = await kms.describeKey({
      KeyId: KeyAlias
    }).promise();

    if (!response.KeyMetadata || !response.KeyMetadata.Arn) {
      throw new Error(`Unable to retrieve ARN for key alias ${KeyAlias}`);
    }

    return {
      Status: 'SUCCESS',
      PhysicalResourceId: physicalResourceId,
      Data: {
        KeyArn: response.KeyMetadata.Arn,
        KeyId: response.KeyMetadata.KeyId
      }
    };
  } catch (error) {
    console.error(`Failed to describe KMS key ${KeyAlias}:`, error);
    throw new Error(`Failed to describe KMS key ${KeyAlias}: ${error.message}`);
  }
}

module.exports = {
  GetKMSKeyArn,
};