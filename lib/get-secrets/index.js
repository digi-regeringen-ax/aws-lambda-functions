const { SecretsManager } = require('aws-sdk');

// Initialize the Secrets Manager client
const secretsManager = new SecretsManager();

exports.handler = async ({ secretId, secretKey }, {  }) => {
    if (!secretId) {
        return {
            statusCode: 400,
            body: { error: 'Missing required parameter "secretId"' }
        };
    }

    try {
        // Retrieve the secret value
        const { SecretString } = await secretsManager.getSecretValue({ SecretId: secretId }).promise();

        if (!SecretString) {
            return {
                statusCode: 500,
                body: { error: `Secret ${secretId} exists but no string value found` }
            };
        }

        const secretData = JSON.parse(SecretString);

        if (!secretKey) {
            return {
                statusCode: 200,
                body: secretData
            };
        }

        if (!(secretKey in secretData)) {
            return {
                statusCode: 404,
                body: { error: `Key ${secretKey} not found in SecretString` }
            };
        }

        const secretValue = secretData[secretKey];

        return {
            statusCode: 200,
            body: { value: secretValue }
        };

    } catch (error) {
        // Handle errors from Secrets Manager
        const errorMessage = `Unable to retrieve secret: ${error.message}`;
        return {
            statusCode: 500,
            body: JSON.stringify({ error: errorMessage })
        };
    }
};