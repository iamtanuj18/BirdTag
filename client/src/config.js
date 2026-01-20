const config = {
  cognito: {
    domain: import.meta.env.VITE_COGNITO_DOMAIN,
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
    redirectUri: import.meta.env.VITE_COGNITO_REDIRECT_URI,
    scope: import.meta.env.VITE_COGNITO_SCOPE || "openid profile email",
    responseType: import.meta.env.VITE_COGNITO_RESPONSE_TYPE || "token",
  },

  apiGateway: {
    url: import.meta.env.VITE_API_GATEWAY_URL,
  },

  lambdaFunctions: {
    queryWithFileUrl: import.meta.env.VITE_QUERY_WITH_FILE_LAMBDA_URL,
  },
};

export default config;
