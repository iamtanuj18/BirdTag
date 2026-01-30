import os

import boto3

sns = boto3.client("sns")
SNS_TOPIC_ARN = os.environ.get("SNS_TOPIC_ARN")

def lambda_handler(event, context):
    email = event['request']['userAttributes']['email']
    
    try:
        response = sns.subscribe(
            TopicArn=SNS_TOPIC_ARN,
            Protocol='email',
            Endpoint=email,
            ReturnSubscriptionArn=True
        )
    except Exception as e:
        pass
    
    return event  # Required for Cognito triggers
