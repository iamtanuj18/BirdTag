// Authentication utility functions
export const buildLoginUrl = (config) => {
  return `${config.cognito.domain}/login?client_id=${config.cognito.clientId}&response_type=${config.cognito.responseType}&scope=email+openid+profile&redirect_uri=${encodeURIComponent(config.cognito.redirectUri)}`;
};
