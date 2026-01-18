import boto3
import os

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
        print(f"Subscribed {email} to SNS topic.")
    except Exception as e:
        print(f"Error subscribing {email}: {str(e)}")
    
    return event  # Required for Cognito triggers
