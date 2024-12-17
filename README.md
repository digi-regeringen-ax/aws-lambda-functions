# Add Lambda Functions
## Useful commands

* `npx cdk deploy`       deploy this stack to your default AWS account/region
* `npx cdk diff`         compare deployed stack with current state
* `npx cdk synth`        emits the synthesized CloudFormation template

Create Lambda function by add them to the `lambda-functions` directory and then deploy the stack. Use a trailing underscore to 
add an endpoint. For example, `lambda-functions/hello-world_` will create an endpoint at `/hello-world`.
