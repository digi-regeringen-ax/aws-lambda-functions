const {Stack} = require('aws-cdk-lib');
const lambda = require('aws-cdk-lib/aws-lambda');
const apigw = require('aws-cdk-lib/aws-apigateway');
const { LambdaClient, GetFunctionCommand, UpdateFunctionCodeCommand } = require('@aws-sdk/client-lambda');

const fs = require('fs').promises;
const path = require('path');

async function getSubdirectories(directoryPath) {
    try {
        const entries = await fs.readdir(directoryPath, {withFileTypes: true});
        return entries
            .filter(entry => entry.isDirectory())
            .map(entry => path.join(directoryPath, entry.name));
    } catch (error) {
        console.error('Error reading directories:', error);
        return [];
    }
}

class LambdaFunctionsStack extends Stack {

    constructor(scope, id, props) {
        super(scope, id, props);
        this.lambdaClient = new LambdaClient({
            region: this.region
        });
        this.initialize();
    }

    async checkOrCreateLambdaFunction(directory, functionName, hasTrailingUnderscore) {
        try {
            // Try to get existing function
            const getFunctionParams = {
                FunctionName: functionName
            };

            try {
                await this.lambdaClient.send(new GetFunctionCommand(getFunctionParams));

                // Function exists, update its code
                const updateFunctionCodeParams = {
                    FunctionName: functionName,
                    ZipFile: await this.createZipFile(directory)
                };

                await this.lambdaClient.send(new UpdateFunctionCodeCommand(updateFunctionCodeParams));
                console.log(`Updated existing Lambda function: ${functionName}`);
            } catch (error) {
                // Function doesn't exist, create new function
                const lambdaFunction = new lambda.Function(this, functionName, {
                    code: lambda.Code.asset(directory),
                    runtime: lambda.Runtime.NODEJS_22_X,
                    handler: 'index.handler',
                    functionName,
                });

                if (hasTrailingUnderscore) {
                    this.createApiGateway(lambdaFunction, functionName);
                }

                console.log(`Created new Lambda function: ${functionName}`);
            }
        } catch (error) {
            console.error(`Error processing function ${functionName}:`, error);
        }
    }

    async createZipFile(directory) {
        // Create a ZIP file from the directory contents
        const archiver = require('archiver');
        const fs = require('fs');

        return new Promise((resolve, reject) => {
            const output = fs.createWriteStream('/tmp/lambda-function.zip');
            const archive = archiver('zip', {
                zlib: { level: 9 } // Sets the compression level
            });

            output.on('close', () => {
                const zipBuffer = fs.readFileSync('/tmp/lambda-function.zip');
                resolve(zipBuffer);
            });

            archive.on('error', (err) => {
                reject(err);
            });

            archive.pipe(output);
            archive.directory(directory, false);
            archive.finalize();
        });
    }

    createApiGateway(handler, functionName) {
        new apigw.LambdaRestApi(this, `${functionName}-endpoint`, {
            handler,
            restApiName: `${functionName}-api`,
            cloudWatchRole: false
        });
    }

    async initialize() {
        try {
            const directories = await getSubdirectories('./lib/');

            for (const directory of directories) {
                const fnName = path.basename(directory);
                const hasTrailingUnderscore = fnName.endsWith('_');
                const functionName = fnName.replace(/_+$/, '');

                await this.checkOrCreateLambdaFunction(directory, functionName, hasTrailingUnderscore);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }
}

module.exports = {LambdaFunctionsStack}